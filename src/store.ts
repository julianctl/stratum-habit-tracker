import { TFile } from 'obsidian';
import type StratumPlugin from './main';
import type { Category, Habit, HabitLog, PersistedStore, StratumData, Todo } from './types';
import { todayISO } from './utils';

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
		const today = todayISO();
		const habits: Habit[] = (raw?.data?.habits ?? DEFAULT_DATA.habits).map((h) => {
			// Migration: habits created before multi-period support have no periods array.
			if (!h.periods || h.periods.length === 0) {
				const logs = (raw?.data?.logs ?? []);
				const earliest = logs
					.filter((l) => l.habitId === h.id)
					.map((l) => l.date)
					.sort()[0] ?? today;
				return { ...h, periods: [{ startDate: earliest }] };
			}
			return h;
		});
		return {
			settings: {
				dailyNoteFolder: raw?.settings?.dailyNoteFolder ?? 'Stratum/Daily Notes',
				heatmapColor: raw?.settings?.heatmapColor ?? '#a4968e',
				heatmapHeight: raw?.settings?.heatmapHeight ?? 200,
				matrixDays: raw?.settings?.matrixDays ?? 50,
				matrixColorScheme: raw?.settings?.matrixColorScheme ?? 'stratum',
				skipDeleteConfirm: raw?.settings?.skipDeleteConfirm ?? false,
			},
			data: {
				habits,
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
		const habit: Habit = { id: Date.now().toString(), name, periods: [{ startDate: todayISO() }], ...(color ? { color } : {}) };
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

	// --- Habit periods (archive / unarchive) ---

	async archiveHabit(store: PersistedStore, habitId: string, endDate: string): Promise<PersistedStore> {
		const habits = store.data.habits.map((h) => {
			if (h.id !== habitId) return h;
			const periods = [...h.periods];
			const last = periods[periods.length - 1];
			if (!last || last.endDate) return h; // already archived
			periods[periods.length - 1] = { ...last, endDate };
			return { ...h, periods };
		});
		const next = { ...store, data: { ...store.data, habits } };
		await this.save(next);
		return next;
	}

	async unarchiveHabit(store: PersistedStore, habitId: string, startDate: string): Promise<PersistedStore> {
		const habits = store.data.habits.map((h) => {
			if (h.id !== habitId) return h;
			const last = h.periods[h.periods.length - 1];
			if (!last || !last.endDate) return h; // already active
			return { ...h, periods: [...h.periods, { startDate }] };
		});
		const next = { ...store, data: { ...store.data, habits } };
		await this.save(next);
		return next;
	}

	// Sets the startDate of the most recent period (editable before archiving).
	async setHabitStartDate(store: PersistedStore, habitId: string, startDate: string): Promise<PersistedStore> {
		const habits = store.data.habits.map((h) => {
			if (h.id !== habitId) return h;
			const periods = [...h.periods];
			const last = periods[periods.length - 1];
			if (!last) return h;
			periods[periods.length - 1] = { ...last, startDate };
			return { ...h, periods };
		});
		const next = { ...store, data: { ...store.data, habits } };
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

	// toIndex is the desired insert position in the *original* array (0 = before first, N = after last).
	async reorderHabits(store: PersistedStore, fromIndex: number, toIndex: number): Promise<PersistedStore> {
		if (toIndex === fromIndex || toIndex === fromIndex + 1) return store;
		const habits = [...store.data.habits];
		const [moved] = habits.splice(fromIndex, 1);
		if (!moved) return store;
		// After removing fromIndex every element above it shifted left by 1,
		// so the original toIndex is now at toIndex - 1 when toIndex > fromIndex.
		const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
		habits.splice(insertAt, 0, moved);
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