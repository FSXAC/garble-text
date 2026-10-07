import { Extension, StateEffect, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

/*
	Word and sentence reveal-on-hover.

	CSS can only target elements, not part of a text node, so the hovered
	word/sentence gets wrapped in an element with REVEALED_CLASS, which the
	stylesheet shows un-garbled. In the editor that is a CodeMirror mark
	decoration (editing its DOM directly would be picked up as an edit); in reading
	view, which is static HTML, the text is wrapped in a span directly.
*/

export const REVEALED_CLASS = 'garble-text-revealed';

export type Granularity = 'word' | 'sentence';

const segmenters = new Map<Granularity, Intl.Segmenter>();

/** The [from, to) range in `text` of the word or sentence at `offset`, if any. */
function segmentAt(
	text: string,
	offset: number,
	granularity: Granularity,
): [number, number] | null {
	let segmenter = segmenters.get(granularity);
	if (!segmenter) {
		segmenter = new Intl.Segmenter(undefined, { granularity });
		segmenters.set(granularity, segmenter);
	}

	const segment = segmenter.segment(text).containing(offset);
	if (!segment) {
		return null;
	}

	if (granularity === 'word') {
		return segment.isWordLike
			? [segment.index, segment.index + segment.segment.length]
			: null;
	}

	// Sentence segments include the whitespace after them.
	const end = segment.index + segment.segment.trimEnd().length;
	return offset < end ? [segment.index, end] : null;
}

function rectContains(rect: DOMRect, x: number, y: number): boolean {
	return (
		x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
	);
}

/*
	Editor (source mode and live preview).
*/

interface Span {
	from: number;
	to: number;
}

const setRevealed = StateEffect.define<Span | null>();

const revealedMark = Decoration.mark({ class: REVEALED_CLASS });

const revealedField = StateField.define<DecorationSet>({
	create: () => Decoration.none,
	update(decorations, tr) {
		decorations = decorations.map(tr.changes);
		for (const effect of tr.effects) {
			if (effect.is(setRevealed)) {
				decorations = effect.value
					? Decoration.set(
							revealedMark.range(effect.value.from, effect.value.to),
						)
					: Decoration.none;
			}
		}
		return decorations;
	},
	provide: (field) => EditorView.decorations.from(field),
});

function spanAtPointer(
	view: EditorView,
	x: number,
	y: number,
	granularity: Granularity,
): Span | null {
	const pos = view.posAtCoords({ x, y });
	if (pos === null) {
		return null;
	}

	// posAtCoords rounds to the nearest character boundary, and also returns
	// positions for blank space next to text, so find the character actually
	// under the pointer, if any.
	const { doc } = view.state;
	for (const at of [pos - 1, pos]) {
		if (at < 0 || at >= doc.length) {
			continue;
		}
		const line = doc.lineAt(at);
		if (at >= line.to) {
			continue;
		}
		const start = view.coordsAtPos(at, 1);
		const end = view.coordsAtPos(at + 1, -1);
		if (
			!start ||
			!end ||
			y < start.top ||
			y > start.bottom ||
			x < Math.min(start.left, end.left) ||
			x > Math.max(start.left, end.left)
		) {
			continue;
		}

		const segment = segmentAt(line.text, at - line.from, granularity);
		return segment
			? { from: line.from + segment[0], to: line.from + segment[1] }
			: null;
	}

	return null;
}

function reveal(view: EditorView, span: Span | null) {
	const current = view.state.field(revealedField).iter();
	const unchanged = current.value
		? span?.from === current.from && span.to === current.to
		: !span;
	if (!unchanged) {
		view.dispatch({ effects: setRevealed.of(span) });
	}
}

/** Editor extension; `granularity` returns null while nothing should be revealed. */
export function editorReveal(granularity: () => Granularity | null): Extension {
	return [
		revealedField,
		EditorView.domEventHandlers({
			mousemove(event, view) {
				const active = granularity();
				reveal(
					view,
					active
						? spanAtPointer(view, event.clientX, event.clientY, active)
						: null,
				);
			},
			mouseleave(_event, view) {
				reveal(view, null);
			},
		}),
	];
}

/*
	Reading view.
*/

const READING_BLOCK =
	'.markdown-preview-sizer > div:not(.mod-header, .mod-footer)';

const TEXT_BLOCK =
	'p, li, h1, h2, h3, h4, h5, h6, td, th, dt, dd, blockquote, pre, figcaption';

function caretAt(
	doc: Document,
	x: number,
	y: number,
): { node: Node; offset: number } | null {
	// caretPositionFromPoint only exists since Chromium 128.
	if ('caretPositionFromPoint' in doc) {
		const position = doc.caretPositionFromPoint(x, y);
		return position
			? { node: position.offsetNode, offset: position.offset }
			: null;
	}
	const range = (doc as Document).caretRangeFromPoint(x, y);
	return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

export class ReadingViewReveal {
	private spans: HTMLElement[] = [];

	constructor(private granularity: () => Granularity | null) {}

	onMouseMove(event: MouseEvent) {
		const granularity = this.granularity();
		if (!granularity) {
			this.clear();
			return;
		}

		const { clientX: x, clientY: y } = event;
		if (this.isOver(x, y)) {
			return;
		}
		this.clear();

		const target = event.target as Node | null;
		const element =
			target?.nodeType === Node.ELEMENT_NODE
				? (target as Element)
				: target?.parentElement;
		const block = element?.closest(READING_BLOCK);
		// Reading-view DOM embedded in the editor belongs to CodeMirror; leave it be.
		if (!block || block.closest('.cm-editor')) {
			return;
		}
		const container = element?.closest(TEXT_BLOCK) ?? block;
		if (!container || !block.contains(container)) {
			return;
		}

		const caret = caretAt(block.ownerDocument, x, y);
		if (!caret || !container.contains(caret.node)) {
			return;
		}

		// Map the caret into the container's full text, so that sentences can
		// span formatting such as bold or links.
		const texts: { node: Text; start: number }[] = [];
		let text = '';
		let hit: number | null = null;
		const walker = block.ownerDocument.createTreeWalker(
			container,
			NodeFilter.SHOW_TEXT,
		);
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const textNode = node as Text;
			const length = textNode.data.length;
			if (node === caret.node) {
				// Like posAtCoords, the caret offset is the nearest boundary, so
				// check which neighbouring character is actually under the pointer.
				for (const at of [caret.offset - 1, caret.offset]) {
					if (at < 0 || at >= length) {
						continue;
					}
					const range = block.ownerDocument.createRange();
					range.setStart(textNode, at);
					range.setEnd(textNode, at + 1);
					if (
						Array.from(range.getClientRects()).some((rect) =>
							rectContains(rect, x, y),
						)
					) {
						hit = text.length + at;
						break;
					}
				}
			}
			texts.push({ node: textNode, start: text.length });
			text += textNode.data;
		}
		if (hit === null) {
			return;
		}

		const segment = segmentAt(text, hit, granularity);
		if (!segment) {
			return;
		}
		const [from, to] = segment;

		for (const { node, start } of texts) {
			const end = start + node.data.length;
			if (end <= from || start >= to) {
				continue;
			}
			if (to < end) {
				node.splitText(to - start);
			}
			const revealed = from > start ? node.splitText(from - start) : node;
			const parent = revealed.parentNode;
			if (!parent) {
				continue;
			}
			const span = parent.createSpan({ cls: REVEALED_CLASS });
			revealed.replaceWith(span);
			span.appendChild(revealed);
			this.spans.push(span);
		}
	}

	clear() {
		const parents = new Set<Node>();
		for (const span of this.spans) {
			if (span.isConnected && span.parentNode) {
				parents.add(span.parentNode);
				span.replaceWith(...Array.from(span.childNodes));
			}
		}
		for (const parent of parents) {
			parent.normalize();
		}
		this.spans = [];
	}

	private isOver(x: number, y: number): boolean {
		return this.spans.some(
			(span) =>
				span.isConnected &&
				Array.from(span.getClientRects()).some((rect) => rectContains(rect, x, y)),
		);
	}
}
