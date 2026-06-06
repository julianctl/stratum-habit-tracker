import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type StratumPlugin from '../main';
import type { HabitLog, PersistedStore } from '../types';
import { normalizeGroupedHabits } from '../utils';
import HabitConfigMenu from './HabitConfigMenu';
import HabitHeatmap from './HabitHeatmap';
import HabitMatrix from './HabitMatrix';
import Sidebar from './Sidebar';

interface AppProps {
	plugin: StratumPlugin;
}

// Below this panel width the sidebar collapses into a floating overlay.
const COMPACT_WIDTH = 600;

export default function App({ plugin }: AppProps) {
	const [store, setStore] = useState<PersistedStore | null>(null);
	const [compact, setCompact] = useState(false);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [floatingMenu, setFloatingMenu] = useState<{ habitId: string; x: number; y: number } | null>(null);
	const rootRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		void plugin.store.load().then(setStore);
		plugin.onSettingsChange = () => {
			setStore((prev) => {
				if (!prev) return prev;
				const settings = { ...prev.settings, ...plugin.settings };
				// Re-normalize so the matrix reflects grouping changes immediately.
				const habits = settings.groupByCategory
					? normalizeGroupedHabits(prev.data.habits, prev.data.categories)
					: prev.data.habits;
				const next = { ...prev, settings, data: { ...prev.data, habits } };
				void plugin.saveData(next);
				return next;
			});
		};
		return () => { plugin.onSettingsChange = undefined; };
	}, []);

	// Collapse the sidebar to an overlay when the panel itself is narrow
	// (works when docked in the right panel or on mobile, not just the window).
	const hasStore = store !== null;
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const update = () => {
			const isCompact = el.clientWidth < COMPACT_WIDTH;
			setCompact(isCompact);
			if (!isCompact) setSidebarOpen(false);
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [hasStore]);

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
	const onMoveHabitInGroup = (habitId: string, targetCategoryId: string | undefined, beforeHabitId: string | null) =>
		mutate((s) => plugin.store.moveHabitInGroup(s, habitId, targetCategoryId, beforeHabitId));
	const onReorderCategories = (fromCatId: string, toIndex: number) =>
		mutate((s) => plugin.store.reorderCategories(s, fromCatId, toIndex));
	const onRenameCategory = (categoryId: string, name: string) =>
		mutate((s) => plugin.store.renameCategory(s, categoryId, name));
	const onAddHabitToCategory = (name: string, categoryId: string) =>
		mutate((s) => plugin.store.addHabitToCategory(s, name, categoryId));
	const onSetHabitColor = (id: string, color?: string) =>
		mutate((s) => plugin.store.setHabitColor(s, id, color));
	const onSetHabitCategory = (id: string, categoryId?: string) =>
		mutate((s) => plugin.store.setHabitCategory(s, id, categoryId));
	const onCreateCategory = (habitId: string, name: string, color: string) =>
		mutate((s) => plugin.store.createAndAssignCategory(s, habitId, name, color));
	const onSetCategoryColor = (categoryId: string, color: string) =>
		mutate((s) => plugin.store.setCategoryColor(s, categoryId, color));
	const onArchiveHabit = (id: string, endDate: string) =>
		mutate((s) => plugin.store.archiveHabit(s, id, endDate));
	const onUnarchiveHabit = (id: string, startDate: string) =>
		mutate((s) => plugin.store.unarchiveHabit(s, id, startDate));
	const onSetHabitStartDate = (id: string, date: string) =>
		mutate((s) => plugin.store.setHabitStartDate(s, id, date));
	const onSetSkipDeleteConfirm = (skip: boolean) => {
		plugin.settings.skipDeleteConfirm = skip;
		void plugin.saveSettings();
	};

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

	// Floating config menu (right-click on habit label in matrix)
	const FLOAT_W = 244;
	const onHabitContextMenu = (habitId: string, clientX: number, clientY: number): void => {
		// Only clamp horizontally so the panel doesn't overflow the right edge.
		// Vertical overflow is handled by max-height + overflow-y on the menu itself.
		const x = Math.min(clientX, window.innerWidth - FLOAT_W - 8);
		setFloatingMenu({ habitId, x, y: clientY });
	};

	// Daily note
	const onOpenDailyNote = (date: string): void => {
		void plugin.store.openOrCreateDailyNote(date, dailyNoteFolder);
	};

	return (
		<>
		<div className={`stratum-app ${compact ? 'stratum-app--compact' : ''}`} ref={rootRef}>
			<main className="stratum-main">
				<HabitMatrix
					habits={habits}
					categories={categories}
					logMap={logMap}
					monthDays={store.settings.matrixDays}
					defaultColor={store.settings.matrixColorScheme === 'stratum' ? '#a4968e' : undefined}
					onToggleLog={onToggleLog}
					onSetLogNote={onSetLogNote}
					onHabitContextMenu={onHabitContextMenu}
				/>
				<HabitHeatmap habits={habits} logs={store.data.logs} color={store.settings.heatmapColor} height={store.settings.heatmapHeight} />
			</main>
			{compact && (
				<button
					className="stratum-sidebar-toggle"
					onClick={() => setSidebarOpen((o) => !o)}
					aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
				>
					{sidebarOpen ? '✕' : '☰'}
				</button>
			)}
			{compact && sidebarOpen && (
				<div className="stratum-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
			)}
			<aside className={`stratum-sidebar ${sidebarOpen ? 'stratum-sidebar--open' : ''}`}>
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
					onArchiveHabit={onArchiveHabit}
					onUnarchiveHabit={onUnarchiveHabit}
					onSetHabitStartDate={onSetHabitStartDate}
					skipDeleteConfirm={store.settings.skipDeleteConfirm}
					onSetSkipDeleteConfirm={onSetSkipDeleteConfirm}
					groupByCategory={store.settings.groupByCategory}
					onMoveHabitInGroup={onMoveHabitInGroup}
					onReorderCategories={onReorderCategories}
					onRenameCategory={onRenameCategory}
					onAddHabitToCategory={onAddHabitToCategory}
				/>
			</aside>
		</div>
		{floatingMenu && (() => {
			const habit = habits.find((h) => h.id === floatingMenu.habitId);
			if (!habit) return null;
			// Portal into document.body so position:fixed is relative to the true
			// viewport, not Obsidian's transformed pane container.
			return createPortal(
				<>
					<div className="stratum-float-backdrop" onClick={() => setFloatingMenu(null)} />
					<HabitConfigMenu
						extraClass="stratum-config-menu--float"
						style={{ left: floatingMenu.x, top: floatingMenu.y }}
						habit={habit}
						categories={categories}
						onRename={(name) => onRenameHabit(habit.id, name)}
						onSetColor={(c) => onSetHabitColor(habit.id, c)}
						onSetCategory={(catId) => onSetHabitCategory(habit.id, catId)}
						onCreateCategory={(name, c) => onCreateCategory(habit.id, name, c)}
						onSetCategoryColor={onSetCategoryColor}
						onArchive={(endDate) => { onArchiveHabit(habit.id, endDate); setFloatingMenu(null); }}
						onUnarchive={(startDate) => { onUnarchiveHabit(habit.id, startDate); setFloatingMenu(null); }}
						onSetStartDate={(date) => onSetHabitStartDate(habit.id, date)}
						skipDeleteConfirm={store.settings.skipDeleteConfirm}
						onDelete={() => { onDeleteHabit(habit.id); setFloatingMenu(null); }}
						onSetSkipDeleteConfirm={onSetSkipDeleteConfirm}
						onClose={() => setFloatingMenu(null)}
					/>
				</>,
				document.body,
			);
		})()}
		</>
	);
}
