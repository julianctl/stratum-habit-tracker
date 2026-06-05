import { ItemView, WorkspaceLeaf } from 'obsidian';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './components/App';
import type StratumPlugin from './main';

export const VIEW_TYPE_STRATUM = 'stratum-habit-tracker';

export class StratumView extends ItemView {
	private root: Root | null = null;

	constructor(leaf: WorkspaceLeaf, private plugin: StratumPlugin) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_STRATUM;
	}

	getDisplayText(): string {
		return 'Stratum';
	}

	getIcon(): string {
		return 'calendar-check';
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		this.root = createRoot(container);
		this.root.render(createElement(App, { plugin: this.plugin }));
	}

	async onClose(): Promise<void> {
		this.root?.unmount();
		this.root = null;
	}
}
