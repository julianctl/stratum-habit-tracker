import { useEffect, useMemo, useState } from 'react';
import type StratumPlugin from '../main';
import type { HabitLog, PersistedStore } from '../types';
import HabitHeatmap from './HabitHeatmap';
import HabitMatrix from './HabitMatrix';
import Sidebar from './Sidebar';

interface AppProps {
	plugin: StratumPlugin;
}

export default function App({ plugin }: AppProps) {
	const [store, setStore] = useState<PersistedStore | null>(null);

	useEffect(() => {
		void plugin.store.load().then(setStore);
		plugin.onSettingsChange = () => {
			setStore((prev) => prev ? { ...prev, settings: { ...prev.settings, ...plugin.settings } } : prev);
		};
		return () => { plugin.onSettingsChange = undefined; };
	}, []);

	// Build a fast lookup map: "habitId::date" -> HabitLog
	const logMap = useMemo(() => {
		const map = new Map<string, HabitLog>();
		for (const log of store?.data.logs ?? []) {
			map.set(`${log.habitId}::${log.date}`, log);
		}
		return map;
	}, [store?.data.logs]);

	if (!store) return <div className="stratum-loading">Loading...</div>;

	const { habits, todos, categories } = store.data;
	const { dailyNoteFolder } = store.settings;

	function mutate(fn: (s: PersistedStore) => Promise<PersistedStore>): void {
		void (async () => {
			const next = await fn(store!);
			setStore(next);
		})();
	}

	// Habit mutations
	const onAddHabit = (name: string, color?: string) =>
		mutate((s) => plugin.store.addHabit(s, name, color));
	const onDeleteHabit = (id: string) =>
		mutate((s) => plugin.store.deleteHabit(s, id));
	const onRenameHabit = (id: string, name: string) =>
		mutate((s) => plugin.store.renameHabit(s, id, name));
	const onReorderHabits = (fromIndex: number, toIndex: number) =>
		mutate((s) => plugin.store.reorderHabits(s, fromIndex, toIndex));
	const onSetHabitColor = (id: string, color?: string) =>
		mutate((s) => plugin.store.setHabitColor(s, id, color));
	const onSetHabitCategory = (id: string, categoryId?: string) =>
		mutate((s) => plugin.store.setHabitCategory(s, id, categoryId));
	const onCreateCategory = (habitId: string, name: string, color: string) =>
		mutate((s) => plugin.store.createAndAssignCategory(s, habitId, name, color));
	const onSetCategoryColor = (categoryId: string, color: string) =>
		mutate((s) => plugin.store.setCategoryColor(s, categoryId, color));

	// Log mutations
	const onToggleLog = (habitId: string, date: string) =>
		mutate((s) => plugin.store.toggleLog(s, habitId, date));
	const onSetLogNote = (habitId: string, date: string, note: string) =>
		mutate((s) => plugin.store.setLogNote(s, habitId, date, note));

	// Todo mutations
	const onAddTodo = (title: string, dueDate?: string) =>
		mutate((s) => plugin.store.addTodo(s, title, dueDate));
	const onToggleTodo = (id: string) =>
		mutate((s) => plugin.store.toggleTodo(s, id));
	const onDeleteTodo = (id: string) =>
		mutate((s) => plugin.store.deleteTodo(s, id));

	// Daily note
	const onOpenDailyNote = (date: string): void => {
		void plugin.store.openOrCreateDailyNote(date, dailyNoteFolder);
	};

	return (
		<div className="stratum-app">
			<main className="stratum-main">
				<HabitMatrix
					habits={habits}
					categories={categories}
					logMap={logMap}
					monthDays={store.settings.matrixDays}
					onToggleLog={onToggleLog}
					onSetLogNote={onSetLogNote}
				/>
				<HabitHeatmap habits={habits} logs={store.data.logs} color={store.settings.heatmapColor} />
			</main>
			<aside className="stratum-sidebar">
				<Sidebar
					todos={todos}
					habits={habits}
					categories={categories}
					onAddTodo={onAddTodo}
					onToggleTodo={onToggleTodo}
					onDeleteTodo={onDeleteTodo}
					onOpenDailyNote={onOpenDailyNote}
					onAddHabit={onAddHabit}
					onDeleteHabit={onDeleteHabit}
					onRenameHabit={onRenameHabit}
					onReorderHabits={onReorderHabits}
					onSetHabitColor={onSetHabitColor}
					onSetHabitCategory={onSetHabitCategory}
					onCreateCategory={onCreateCategory}
					onSetCategoryColor={onSetCategoryColor}
				/>
			</aside>
		</div>
	);
}
