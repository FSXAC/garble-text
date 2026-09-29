import { App, PluginSettingTab, Setting } from 'obsidian';
import GarbleTextPlugin from './main';

export enum GarbleStyle {
	Scribble = 'scribble',
	Blur = 'blur',
	ScribbleAndBlur = 'scribble-and-blur',
}

export interface GarbleTextSettings {
	garbleStyle: GarbleStyle;
	blurImages: boolean;
	revealOnHover: boolean;
}

export const DEFAULT_SETTINGS: GarbleTextSettings = {
	garbleStyle: GarbleStyle.Scribble,
	blurImages: true,
	revealOnHover: true,
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
			.setDesc('Temporarily un-garble whatever the pointer is over.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.revealOnHover)
					.onChange(async (value) => {
						this.plugin.settings.revealOnHover = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
