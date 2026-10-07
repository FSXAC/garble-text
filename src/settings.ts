import { App, PluginSettingTab, Setting } from 'obsidian';
import GarbleTextPlugin from './main';

export enum GarbleStyle {
	Scribble = 'scribble',
	Blur = 'blur',
	ScribbleAndBlur = 'scribble-and-blur',
}

export enum RevealOnHover {
	Off = 'off',
	Word = 'word',
	Sentence = 'sentence',
	Paragraph = 'paragraph',
}

export interface GarbleTextSettings {
	garbleStyle: GarbleStyle;
	contentOnly: boolean;
	blurImages: boolean;
	revealOnHover: RevealOnHover;
}

export const DEFAULT_SETTINGS: GarbleTextSettings = {
	garbleStyle: GarbleStyle.Scribble,
	contentOnly: true,
	blurImages: true,
	revealOnHover: RevealOnHover.Word,
};

export class GarbleTextSettingTab extends PluginSettingTab {
	plugin: GarbleTextPlugin;

	constructor(app: App, plugin: GarbleTextPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Garble style')
			.setDesc(
				'How garbled text is displayed. Blurring also hides text that the bundled scribble font has no glyphs for, such as non-latin scripts.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						[GarbleStyle.Scribble]: 'Scribble',
						[GarbleStyle.Blur]: 'Blur',
						[GarbleStyle.ScribbleAndBlur]: 'Scribble and blur',
					})
					.setValue(this.plugin.settings.garbleStyle)
					.onChange(async (value) => {
						this.plugin.settings.garbleStyle = value as GarbleStyle;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Only garble note content')
			.setDesc(
				'Only garble the body of notes, not the rest of the interface such as file names, tabs, note titles and properties.',
			)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.contentOnly)
					.onChange(async (value) => {
						this.plugin.settings.contentOnly = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Blur images')
			.setDesc('Blur images and videos while text is garbled.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.blurImages)
					.onChange(async (value) => {
						this.plugin.settings.blurImages = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Reveal on hover')
			.setDesc(
				'Temporarily un-garble the text under the pointer. Outside of notes, the whole hovered element is revealed.',
			)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({
						[RevealOnHover.Off]: 'Off',
						[RevealOnHover.Word]: 'Word',
						[RevealOnHover.Sentence]: 'Sentence',
						[RevealOnHover.Paragraph]: 'Paragraph',
					})
					.setValue(this.plugin.settings.revealOnHover)
					.onChange(async (value) => {
						this.plugin.settings.revealOnHover = value as RevealOnHover;
						await this.plugin.saveSettings();
					}),
			);
	}
}
