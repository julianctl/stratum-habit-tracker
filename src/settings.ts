import { App, PluginSettingTab, Setting } from 'obsidian';
import type StratumPlugin from './main';

export class StratumSettingTab extends PluginSettingTab {
	plugin: StratumPlugin;

	constructor(app: App, plugin: StratumPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Daily notes folder')
			.setDesc('Folder where daily notes are created and read.')
			.addText((text) =>
				text
					.setPlaceholder('Daily')
					.setValue(this.plugin.settings.dailyNoteFolder)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteFolder = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Heatmap color')
			.setDesc('Base color used for the year overview heatmap.')
			.addColorPicker((picker) =>
				picker
					.setValue(this.plugin.settings.heatmapColor)
					.onChange(async (value) => {
						this.plugin.settings.heatmapColor = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Matrix range (days)')
			.setDesc('Default number of days shown in the matrix month view (today at the right). You can still scroll and page beyond this.')
			.addText((text) =>
				text
					.setPlaceholder('50')
					.setValue(String(this.plugin.settings.matrixDays))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						this.plugin.settings.matrixDays = Number.isFinite(n) && n > 0 ? n : 50;
						await this.plugin.saveSettings();
					}),
			);
	}
}
