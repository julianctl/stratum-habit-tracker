import { TFile } from 'obsidian';
import type StratumPlugin from './main';
import type { Category, Habit, HabitLog, PersistedStore, StratumData, Todo } from './types';
import { groupKey, normalizeGroupedHabits, todayISO, UNCATEGORIZED_KEY } from './utils';

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
		// Migration: categories created before grouping support have no order field.
		// Assign incremental orders preserving their existing array sequence.
		const rawCategories = raw?.data?.categories ?? DEFAULT_DATA.categories;
		const categories: Category[] = rawCategories.map((c, i) => ({
			...c,
			order: typeof c.order === 'number' ? c.order : i,
		}));
		const settings = {
			dailyNoteFolder: raw?.settings?.dailyNoteFolder ?? 'Stratum/Daily Notes',
			heatmapColor: raw?.settings?.heatmapColor ?? '#a4968e',
			heatmapHeight: raw?.settings?.heatmapHeight ?? 200,
			matrixDays: raw?.settings?.matrixDays ?? 50,
			matrixColorScheme: raw?.settings?.matrixColorScheme ?? 'stratum',
			skipDeleteConfirm: raw?.settings?.skipDeleteConfirm ?? false,
			groupByCategory: raw?.settings?.groupByCategory ?? true,
		} as const;
		// When grouping is on, ensure the stored array already satisfies the
		// grouped invariant (handles first-enable and external edits).
		const orderedHabits = settings.groupByCategory
			? normalizeGroupedHabits(habits, categories)
			: habits;
		return {
			settings,
			data: {
				habits: orderedHabits,
				logs: raw?.data?.logs ?? DEFAULT_DATA.logs,
				todos: raw?.data?.todos ?? DEFAULT_DATA.todos,
				categories,
			},
		};
	}

	private async save(store: PersistedStore): Promise<void> {
		await this.plugin.saveData(store);
	}

	// --- Habits ---

	async addHabit(store: PersistedStore, name: string, color?: string): Promise<PersistedStore> {
		const habit: Habit = { id: Date.now().toString(), name, periods: [{ startDate: todayISO() }], ...(color ? { color } : {}) };
		const habits = this.maybeRegroup(store, [...store.data.habits, habit]);
		const next = { ...store, data: { ...store.data, habits } };
		await this.save(next);
		return next;
	}

	async deleteHabit(store: PersistedStore, id: string): Promise<PersistedStore> {
		const withDeletion = {
			...store,
			data: {
				...store.data,
				habits: store.data.habits.filter((h) => h.id !== id),
				logs: store.data.logs.filter((l) => l.habitId !== id),
			},
		};
		const next = this.pruneEmptyCategories(withDeletion);
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
		const habits = store.data.habits.map((h) =>
			h.id === id ? { ...h, categoryId: categoryId || undefined } : h,
		);
		const next = {
			...store,
			data: { ...store.data, habits: this.maybeRegroup(store, habits) },
		};
		await this.save(next);
		return next;
	}

	// When grouping is on, keep the flat array satisfying the grouped invariant so
	// the matrix (which reads habits[] directly) stays correctly grouped.
	private maybeRegroup(store: PersistedStore, habits: Habit[], categories?: Category[]): Habit[] {
		if (!store.settings.groupByCategory) return habits;
		return normalizeGroupedHabits(habits, categories ?? store.data.categories);
	}

	// --- Categories ---

	async createAndAssignCategory(
		store: PersistedStore,
		habitId: string,
		name: string,
		color: string,
	): Promise<PersistedStore> {
		const maxOrder = store.data.categories.reduce((m, c) => Math.max(m, c.order), -1);
		const category: Category = { id: Date.now().toString(), name, color, order: maxOrder + 1 };
		const categories = [...store.data.categories, category];
		const reassigned = store.data.habits.map((h) =>
			h.id === habitId ? { ...h, categoryId: category.id } : h,
		);
		const habits = store.settings.groupByCategory
			? normalizeGroupedHabits(reassigned, categories)
			: reassigned;
		const next = {
			...store,
			data: { ...store.data, categories, habits },
		};
		await this.save(next);
		return next;
	}

	async renameCategory(store: PersistedStore, categoryId: string, name: string): Promise<PersistedStore> {
		const next = {
			...store,
			data: {
				...store.data,
				categories: store.data.categories.map((c) =>
					c.id === categoryId ? { ...c, name } : c,
				),
			},
		};
		await this.save(next);
		return next;
	}

	// Create a habit directly assigned to a category (grouped mode + button).
	async addHabitToCategory(store: PersistedStore, name: string, categoryId: string): Promise<PersistedStore> {
		const habit: Habit = { id: Date.now().toString(), name, categoryId, periods: [{ startDate: todayISO() }] };
		const habits = this.maybeRegroup(store, [...store.data.habits, habit]);
		const next = { ...store, data: { ...store.data, habits } };
		await this.save(next);
		return next;
	}

	// Remove categories that no longer have any habits assigned (active or archived).
	private pruneEmptyCategories(store: PersistedStore): PersistedStore {
		const usedIds = new Set(store.data.habits.map((h) => h.categoryId).filter(Boolean));
		const categories = store.data.categories.filter((c) => usedIds.has(c.id));
		if (categories.length === store.data.categories.length) return store;
		// Re-assign compact order values after removal.
		const pruned = categories.map((c, i) => ({ ...c, order: i }));
		return { ...store, data: { ...store.data, categories: pruned } };
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

	// --- Grouped ordering (category grouping mode) ---

	// Reorder category blocks. `toIndex` is the insert position among categories
	// (sorted by order), 0 = first .. N = last. Reassigns sequential order values
	// and re-normalizes the flat habits array so blocks follow.
	async reorderCategories(
		store: PersistedStore,
		fromCatId: string,
		toIndex: number,
	): Promise<PersistedStore> {
		const sorted = [...store.data.categories].sort((a, b) => a.order - b.order);
		const fromIndex = sorted.findIndex((c) => c.id === fromCatId);
		if (fromIndex === -1) return store;
		if (toIndex === fromIndex || toIndex === fromIndex + 1) return store;
		const [moved] = sorted.splice(fromIndex, 1);
		if (!moved) return store;
		const insertAt = toIndex > fromIndex ? toIndex - 1 : toIndex;
		sorted.splice(insertAt, 0, moved);
		const categories: Category[] = sorted.map((c, i) => ({ ...c, order: i }));
		const habits = normalizeGroupedHabits(store.data.habits, categories);
		const next = { ...store, data: { ...store.data, categories, habits } };
		await this.save(next);
		return next;
	}

	// Move a habit into a target group (categoryId, or undefined for uncategorized)
	// and position it before `beforeHabitId` within that group (null = append).
	// Handles within-group reorder and cross-group reassignment in one primitive.
	async moveHabitInGroup(
		store: PersistedStore,
		habitId: string,
		targetCategoryId: string | undefined,
		beforeHabitId: string | null,
	): Promise<PersistedStore> {
		const original = store.data.habits;
		const moving = original.find((h) => h.id === habitId);
		if (!moving) return store;

		const updated: Habit = { ...moving, categoryId: targetCategoryId };
		const targetKey = targetCategoryId ?? UNCATEGORIZED_KEY;

		// New within-group sequence for the target group (excluding the mover),
		// then insert the mover before `beforeHabitId` (or append).
		const groupSeq = original
			.filter((h) => h.id !== habitId && groupKey(h) === targetKey)
			.map((h) => h.id);
		const insertIdx = beforeHabitId ? groupSeq.indexOf(beforeHabitId) : -1;
		if (insertIdx === -1) groupSeq.push(habitId);
		else groupSeq.splice(insertIdx, 0, habitId);

		// Rebuild the flat array by walking the original order. The target group
		// occupies the slot of its first member (the mover's slot if the group is
		// otherwise empty). At that slot we emit the whole new sequence; the
		// mover is skipped everywhere else.
		const byId = new Map(original.map((h) => [h.id, h] as const));
		byId.set(habitId, updated);
		const result: Habit[] = [];
		let emittedGroup = false;
		const emitGroup = () => {
			emittedGroup = true;
			for (const id of groupSeq) result.push(byId.get(id)!);
		};
		// Find which original index triggers the group emission: the first habit
		// belonging to the target group, or the mover if the group is new/empty.
		const triggerIdx = original.findIndex((h) =>
			h.id === habitId || (h.id !== habitId && groupKey(h) === targetKey),
		);
		original.forEach((h, i) => {
			if (i === triggerIdx) emitGroup();
			if (h.id === habitId) return; // mover handled in group emission
			if (groupKey(h) === targetKey) return; // target-group members handled too
			result.push(h);
		});
		if (!emittedGroup) emitGroup(); // safety: group had no trigger slot

		const normalized = normalizeGroupedHabits(result, store.data.categories);
		const withMove = { ...store, data: { ...store.data, habits: normalized } };
		const next = this.pruneEmptyCategories(withMove);
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