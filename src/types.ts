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

export type TextAlign = 'left' | 'center' | 'right';
export type FontSize = 'small' | 'medium' | 'large';

export interface StickyNote {
	id: string;       // matches the module id suffix: module id = `sticky_${id}`
	title: string;    // shown in the module header
	content: string;
	bgColor: string;
	textAlign: TextAlign;
	fontSize: FontSize;
}

// Serialisable form of a react-grid-layout LayoutItem, stored in data.json.
// Matches the LayoutItem interface so it can be passed to RGL directly.
export interface GridItem {
	i: string;   // module id ('matrix' | 'heatmap')
	x: number;
	y: number;
	w: number;
	h: number;
	minW?: number;
	minH?: number;
}

export interface StratumData {
	habits: Habit[];
	logs: HabitLog[];
	todos: Todo[];
	categories: Category[];
	stickyNotes: StickyNote[];
	layout: GridItem[];
}

export interface StratumSettings {
	dailyNoteFolder: string;
	heatmapColor: string;
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