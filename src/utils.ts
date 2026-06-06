import type { Habit } from './types';

export function todayISO(): string {
	return new Date().toISOString().slice(0, 10);
}

export function isHabitActiveOn(habit: Habit, date: string): boolean {
	return habit.periods.some((p) => p.startDate <= date && (!p.endDate || p.endDate >= date));
}

export function isHabitCurrentlyActive(habit: Habit): boolean {
	const last = habit.periods[habit.periods.length - 1];
	return !!last && !last.endDate;
}
