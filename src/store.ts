import { TFile } from 'obsidian';
import type StratumPlugin from './main';
import type { Category, Habit, HabitLog, PersistedStore, StratumData, Todo } from './types';

const DEFAULT_DATA: StratumData = {
	habits: [],
	logs: [],
	todos: [],
	categories: [],
};

export class StratumStore {
	constructor(private plugin: StratumPlugin) {}

	async load(): Promise<PersistedStore> {
		const raw = (await this.plugin.loadData()) as Partial<PersistedStore> | null;
		return {
			settings: {
				dailyNoteFolder: raw?.settings?.dailyNoteFolder ?? 'Stratum/Daily Notes',
				heatmapColor: raw?.settings?.heatmapColor ?? '#4caf50',
				matrixDays: raw?.settings?.matrixDays ?? 50,
			},
			data: {
				habits: raw?.data?.habits ?? DEFAULT_DATA.habits,
				logs: raw?.data?.logs ?? DEFAULT_DATA.logs,
				todos: raw?.data?.todos ?? DEFAULT_DATA.todos,
				categories: raw?.data?.categories ?? DEFAULT_DATA.categories,
			},
		};
	}

	private async save(store: PersistedStore): Promise<void> {
		await this.plugin.saveData(store);
	}

	// --- Habits ---

	async addHabit(store: PersistedStore, name: string, color?: string): Promise<PersistedStore> {
		const habit: Habit = { id: Date.now().toString(), name, ...(color ? { color } : {}) };
		const next = { ...store, data: { ...store.data, habits: [...store.data.habits, habit] } };
		await this.save(next);
		return next;
	}

	async deleteHabit(store: PersistedStore, id: string): Promise<PersistedStore> {
		const next = {
			...store,
			data: {
				...store.data,
				habits: store.data.habits.filter((h) => h.id !== id),
				logs: store.data.logs.filter((l) => l.habitId !== id),
			},
		};
		await this.save(next);
		return next;
	}

	async renameHabit(store: PersistedStore, id: string, name: string): Promise<PersistedStore> {
		const next = {
			...store,
			data: {
				...store.data,
				habits: store.data.habits.map((h) => (h.id === id ? { ...h, name } : h)),
			},
		};
		await this.save(next);
		return next;
	}

	async setHabitColor(store: PersistedStore, id: string, color?: string): Promise<PersistedStore> {
		const next = {
			...store,
			data: {
				...store.data,
				habits: store.data.habits.map((h) =>
					h.id === id ? { ...h, color: color || undefined } : h,
				),
			},
		};
		await this.save(next);
		return next;
	}

	async setHabitCategory(store: PersistedStore, id: string, categoryId?: string): Promise<PersistedStore> {
		const next = {
			...store,
			data: {
				...store.data,
				habits: store.data.habits.map((h) =>
					h.id === id ? { ...h, categoryId: categoryId || undefined } : h,
				),
			},
		};
		await this.save(next);
		return next;
	}

	// --- Categories ---

	async createAndAssignCategory(
		store: PersistedStore,
		habitId: string,
		name: string,
		color: string,
	): Promise<PersistedStore> {
		const category: Category = { id: Date.now().toString(), name, color };
		const next = {
			...store,
			data: {
				...store.data,
				categories: [...store.data.categories, category],
				habits: store.data.habits.map((h) =>
					h.id === habitId ? { ...h, categoryId: category.id } : h,
				),
			},
		};
		await this.save(next);
		return next;
	}

	async setCategoryColor(store: PersistedStore, categoryId: string, color: string): Promise<PersistedStore> {
		const next = {
			...store,
			data: {
				...store.data,
				categories: store.data.categories.map((c) =>
					c.id === categoryId ? { ...c, color } : c,
				),
			},
		};
		await this.save(next);
		return next;
	}

	// --- Logs ---

	async toggleLog(store: PersistedStore, habitId: string, date: string): Promise<PersistedStore> {
		const exists = store.data.logs.some((l) => l.habitId === habitId && l.date === date);
		const logs: HabitLog[] = exists
			? store.data.logs.filter((l) => !(l.habitId === habitId && l.date === date))
			: [...store.data.logs, { habitId, date }];
		const next = { ...store, data: { ...store.data, logs } };
		await this.save(next);
		return next;
	}

	async setLogNote(store: PersistedStore, habitId: string, date: string, note: string): Promise<PersistedStore> {
		const logs: HabitLog[] = store.data.logs.map((l) =>
			l.habitId === habitId && l.date === date ? { ...l, note } : l,
		);
		const next = { ...store, data: { ...store.data, logs } };
		await this.save(next);
		return next;
	}

	async reorderHabits(store: PersistedStore, fromIndex: number, toIndex: number): Promise<PersistedStore> {
		const habits = [...store.data.habits];
		const moved = habits.splice(fromIndex, 1)[0];
		if (!moved) return store;
		habits.splice(toIndex, 0, moved);
		const next = { ...store, data: { ...store.data, habits } };
		await this.save(next);
		return next;
	}

	// --- Todos ---

	async addTodo(store: PersistedStore, title: string, dueDate?: string): Promise<PersistedStore> {
		const todo: Todo = { id: Date.now().toString(), title, completed: false, ...(dueDate ? { dueDate } : {}) };
		const next = { ...store, data: { ...store.data, todos: [...store.data.todos, todo] } };
		await this.save(next);
		return next;
	}

	async toggleTodo(store: PersistedStore, id: string): Promise<PersistedStore> {
		const next = {
			...store,
			data: {
				...store.data,
				todos: store.data.todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
			},
		};
		await this.save(next);
		return next;
	}

	async deleteTodo(store: PersistedStore, id: string): Promise<PersistedStore> {
		const next = { ...store, data: { ...store.data, todos: store.data.todos.filter((t) => t.id !== id) } };
		await this.save(next);
		return next;
	}

	// --- Daily Note ---

	async openOrCreateDailyNote(date: string, folder: string): Promise<void> {
		const { vault, workspace } = this.plugin.app;
		const path = `${folder}/${date}.md`;
		let file = vault.getAbstractFileByPath(path);
		if (!file) {
			// Ensure the folder exists
			const folderExists = vault.getAbstractFileByPath(folder);
			if (!folderExists) {
				await vault.createFolder(folder);
			}
			file = await vault.create(path, `# ${date}\n`);
		}
		if (file instanceof TFile) {
			await workspace.getLeaf(false).openFile(file);
		}
	}
}