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
			)
			.addButton((button) =>
				button
					.setButtonText('Revert to default')
					.onClick(async () => {
						this.plugin.settings.heatmapColor = '#a4968e';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Year overview height (px)')
			.setDesc('Height of the year overview heatmap in pixels.')
			.addText((text) =>
				text
					.setPlaceholder('200')
					.setValue(String(this.plugin.settings.heatmapHeight))
					.onChange(async (value) => {
						const n = parseInt(value, 10);
						this.plugin.settings.heatmapHeight = Number.isFinite(n) && n > 0 ? n : 200;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Habit matrix color')
			.setDesc('Color used for completed cells that have no per-habit or category color set.')
			.addDropdown((drop) =>
				drop
					.addOption('stratum', 'Stratum default (#a4968e)')
					.addOption('theme', "Obsidian theme (accent color)")
					.setValue(this.plugin.settings.matrixColorScheme)
					.onChange(async (value: string) => {
						this.plugin.settings.matrixColorScheme = value as 'stratum' | 'theme';
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Group habits by category')
			.setDesc('Nest habits under their category in the sidebar. Habits of the same category stay grouped in the matrix too. When off, habits are a single freely-ordered list.')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.groupByCategory)
					.onChange(async (value) => {
						this.plugin.settings.groupByCategory = value;
						await this.plugin.saveSettings();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName('Delete confirmation')
			.setDesc('Show a confirmation dialog before deleting a habit. Re-enable if you previously checked "Don\'t show this again".')
			.addToggle((toggle) =>
				toggle
					.setValue(!this.plugin.settings.skipDeleteConfirm)
					.onChange(async (value) => {
						this.plugin.settings.skipDeleteConfirm = !value;
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
