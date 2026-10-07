import { Plugin } from 'obsidian';
import { editorReveal, Granularity, ReadingViewReveal } from './reveal';
import {
	DEFAULT_SETTINGS,
	GarbleStyle,
	GarbleTextSettings,
	GarbleTextSettingTab,
	RevealOnHover,
} from './settings';

const GARBLE_CLASS = 'garble-text-on';
const SCRIBBLE_CLASS = 'garble-text-scribble';
const BLUR_CLASS = 'garble-text-blur';
const BLUR_IMAGES_CLASS = 'garble-text-blur-images';
const CONTENT_ONLY_CLASS = 'garble-text-content-only';
const REVEAL_HOVER_CLASS = 'garble-text-reveal-hover';
const REVEAL_PARAGRAPH_CLASS = 'garble-text-reveal-paragraph';

const ALL_CLASSES = [
	GARBLE_CLASS,
	SCRIBBLE_CLASS,
	BLUR_CLASS,
	BLUR_IMAGES_CLASS,
	CONTENT_ONLY_CLASS,
	REVEAL_HOVER_CLASS,
	REVEAL_PARAGRAPH_CLASS,
];

export default class GarbleTextPlugin extends Plugin {
	settings!: GarbleTextSettings;

	private garbled = false;

	private readingViewReveal = new ReadingViewReveal(() =>
		this.revealGranularity(),
	);

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: 'toggle',
			name: 'Toggle',
			callback: () => {
				this.setGarbled(!this.garbled);
			},
		});

		this.addRibbonIcon('eye-off', 'Toggle garble text', () => {
			this.setGarbled(!this.garbled);
		});

		this.addSettingTab(new GarbleTextSettingTab(this.app, this));

		this.registerEditorExtension(editorReveal(() => this.revealGranularity()));

		this.registerRevealEvents(document);

		// Pop-out windows have their own document, so they need the classes too.
		this.registerEvent(
			this.app.workspace.on('window-open', (_win, window) => {
				this.refreshClasses();
				this.registerRevealEvents(window.document);
			}),
		);
	}

	onunload() {
		this.setGarbled(false);
	}

	setGarbled(garbled: boolean) {
		this.garbled = garbled;
		this.refreshClasses();
	}

	refreshClasses() {
		const { garbleStyle, contentOnly, blurImages, revealOnHover } =
			this.settings;

		this.readingViewReveal.clear();

		for (const body of this.getBodies()) {
			body.removeClasses(ALL_CLASSES);

			if (!this.garbled) {
				continue;
			}

			body.addClass(GARBLE_CLASS);
			body.toggleClass(
				SCRIBBLE_CLASS,
				garbleStyle === GarbleStyle.Scribble ||
					garbleStyle === GarbleStyle.ScribbleAndBlur,
			);
			body.toggleClass(
				BLUR_CLASS,
				garbleStyle === GarbleStyle.Blur ||
					garbleStyle === GarbleStyle.ScribbleAndBlur,
			);
			body.toggleClass(BLUR_IMAGES_CLASS, blurImages);
			body.toggleClass(CONTENT_ONLY_CLASS, contentOnly);
			body.toggleClass(REVEAL_HOVER_CLASS, revealOnHover !== RevealOnHover.Off);
			body.toggleClass(
				REVEAL_PARAGRAPH_CLASS,
				revealOnHover === RevealOnHover.Paragraph,
			);
		}
	}

	private revealGranularity(): Granularity | null {
		if (!this.garbled) {
			return null;
		}
		switch (this.settings.revealOnHover) {
			case RevealOnHover.Word:
				return 'word';
			case RevealOnHover.Sentence:
				return 'sentence';
			default:
				return null;
		}
	}

	private registerRevealEvents(doc: Document) {
		this.registerDomEvent(doc, 'mousemove', (event) => {
			this.readingViewReveal.onMouseMove(event);
		});
		this.registerDomEvent(doc.documentElement, 'mouseleave', () => {
			this.readingViewReveal.clear();
		});
	}

	private getBodies(): HTMLElement[] {
		const bodies = new Set<HTMLElement>([document.body, activeDocument.body]);

		this.app.workspace.iterateAllLeaves((leaf) => {
			bodies.add(leaf.view.containerEl.doc.body);
		});

		return [...bodies];
	}

	async loadSettings() {
		const data = (await this.loadData()) as Partial<GarbleTextSettings> | null;

		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);

		// Reveal on hover used to be an on/off toggle.
		const legacyReveal: unknown = data?.revealOnHover;
		if (typeof legacyReveal === 'boolean') {
			this.settings.revealOnHover = legacyReveal
				? RevealOnHover.Word
				: RevealOnHover.Off;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshClasses();
	}
}
