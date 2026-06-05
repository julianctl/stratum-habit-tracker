export interface Category {
	id: string;
	name: string;
	color: string;
}

export interface Habit {
	id: string;
	name: string;
	color?: string; // per-habit override; falls back to category color
	categoryId?: string;
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
	matrixDays: number;
}

export interface PersistedStore {
	settings: StratumSettings;
	data: StratumData;
}