import { Plugin } from 'obsidian';
import { StratumSettingTab } from './settings';
import { StratumStore } from './store';
import type { PersistedStore, StratumSettings } from './types';
import { StratumView, VIEW_TYPE_STRATUM } from './view';

const DEFAULT_SETTINGS: StratumSettings = {
	dailyNoteFolder: 'Stratum/Daily Notes',
	heatmapColor: '#a4968e',
	heatmapHeight: 200,
	matrixDays: 50,
	matrixColorScheme: 'stratum',
	skipDeleteConfirm: false,
	groupByCategory: true,
	uncategorizedPosition: 'bottom',
};

export default class StratumPlugin extends Plugin {
	settings!: StratumSettings;
	store!: StratumStore;
	onSettingsChange?: () => void;

	async onload(): Promise<void> {
		const persisted = (await this.loadData()) as Partial<PersistedStore> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, persisted?.settings);
		this.store = new StratumStore(this);

		this.registerView(VIEW_TYPE_STRATUM, (leaf) => new StratumView(leaf, this));

		this.addRibbonIcon('calendar-check', 'Stratum', () => this.activateView());

		this.addCommand({
			id: 'open-stratum',
			name: 'Open dashboard',
			callback: () => this.activateView(),
		});

		this.addSettingTab(new StratumSettingTab(this.app, this));
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_STRATUM)[0];
		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
			await leaf.setViewState({ type: VIEW_TYPE_STRATUM, active: true });
		}
		await workspace.revealLeaf(leaf);
	}

	async saveSettings(): Promise<void> {
		const raw = (await this.loadData()) as Partial<PersistedStore> | null;
		await this.saveData({ ...raw, settings: this.settings });
		this.onSettingsChange?.();
	}
}
