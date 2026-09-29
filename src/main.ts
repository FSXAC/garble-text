import { Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	GarbleStyle,
	GarbleTextSettings,
	GarbleTextSettingTab,
} from './settings';

const GARBLE_CLASS = 'garble-text-on';
const SCRIBBLE_CLASS = 'garble-text-scribble';
const BLUR_CLASS = 'garble-text-blur';
const BLUR_IMAGES_CLASS = 'garble-text-blur-images';
const REVEAL_ON_HOVER_CLASS = 'garble-text-reveal-on-hover';

const ALL_CLASSES = [
	GARBLE_CLASS,
	SCRIBBLE_CLASS,
	BLUR_CLASS,
	BLUR_IMAGES_CLASS,
	REVEAL_ON_HOVER_CLASS,
];

export default class GarbleTextPlugin extends Plugin {
	settings!: GarbleTextSettings;

	private garbled = false;

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

		// Pop-out windows have their own document, so they need the classes too.
		this.registerEvent(
			this.app.workspace.on('window-open', () => {
				this.refreshClasses();
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
		const { garbleStyle, blurImages, revealOnHover } = this.settings;

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
			body.toggleClass(REVEAL_ON_HOVER_CLASS, revealOnHover);
		}
	}

	private getBodies(): HTMLElement[] {
		const bodies = new Set<HTMLElement>([document.body, activeDocument.body]);

		this.app.workspace.iterateAllLeaves((leaf) => {
			bodies.add(leaf.view.containerEl.doc.body);
		});

		return [...bodies];
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<GarbleTextSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.refreshClasses();
	}
}
