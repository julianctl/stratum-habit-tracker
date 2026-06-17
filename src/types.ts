export interface Category {
	id: string;
	name: string;
	color: string;
	order: number; // display order in grouped mode; lower = higher in list
}

export interface HabitPeriod {
	startDate: string; // YYYY-MM-DD, inclusive
	endDate?: string;  // YYYY-MM-DD, inclusive; absent = currently active
}

export interface Habit {
	id: string;
	name: string;
	color?: string; // per-habit override; falls back to category color
	categoryId?: string;
	periods: HabitPeriod[]; // chronological, non-overlapping
}

export interface HabitLog {
	habitId: string;
	date: string; // YYYY-MM-DD
	note?: string;
}

export interface Todo {
	id: string;
	title: string;
	completed: boolean;
	dueDate?: string; // YYYY-MM-DD
}

export interface StratumData {
	habits: Habit[];
	logs: HabitLog[];
	todos: Todo[];
	categories: Category[];
}

export interface StratumSettings {
	dailyNoteFolder: string;
	heatmapColor: string;
	heatmapHeight: number;
	heatmapDays: number;
	showHeatmapDaysInput: boolean;
	matrixDays: number;
	showMatrixDaysInput: boolean;
	matrixColorScheme: 'stratum' | 'theme';
	skipDeleteConfirm: boolean;
	groupByCategory: boolean;
}

export interface PersistedStore {
	settings: StratumSettings;
	data: StratumData;
}