import type { Category, Habit } from './types';

export function todayISO(): string {
	return new Date().toISOString().slice(0, 10);
}

// --- Grouped (by-category) layout helpers ---
//
// In grouped mode the flat habits[] array is kept sorted so that:
//   - habits sharing a categoryId are contiguous,
//   - category blocks appear in category.order sequence,
//   - the uncategorized block sits entirely at the top or bottom.
// Within each group, habits keep their existing relative order in habits[].
// Sorting this way leaves the matrix/heatmap (which read habits[] directly)
// correctly grouped with no extra logic.

const UNCAT = '__uncat__';

function groupKey(habit: Habit): string {
	return habit.categoryId ?? UNCAT;
}

// Returns the list of group keys (category ids + UNCAT) in their display order.
// Uncategorized is always anchored at the bottom.
export function groupOrder(categories: Category[]): string[] {
	return [...categories].sort((a, b) => a.order - b.order).map((c) => c.id).concat(UNCAT);
}

// Re-sort habits[] to satisfy the grouped invariant, preserving each habit's
// current relative order within its own group. Stable.
export function normalizeGroupedHabits(habits: Habit[], categories: Category[]): Habit[] {
	const order = groupOrder(categories);
	const rank = new Map(order.map((key, i) => [key, i]));
	// Decorate with original index for a stable sort within groups.
	return habits
		.map((habit, idx) => ({ habit, idx }))
		.sort((a, b) => {
			const ra = rank.get(groupKey(a.habit)) ?? order.length;
			const rb = rank.get(groupKey(b.habit)) ?? order.length;
			if (ra !== rb) return ra - rb;
			return a.idx - b.idx;
		})
		.map((x) => x.habit);
}

export const UNCATEGORIZED_KEY = UNCAT;
export { groupKey };

export function isHabitActiveOn(habit: Habit, date: string): boolean {
	return habit.periods.some((p) => p.startDate <= date && (!p.endDate || p.endDate >= date));
}

export function isHabitCurrentlyActive(habit: Habit): boolean {
	const last = habit.periods[habit.periods.length - 1];
	return !!last && !last.endDate;
}
