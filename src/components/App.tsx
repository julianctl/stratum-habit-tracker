import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type StratumPlugin from '../main';
import type { GridItem, HabitLog, PersistedStore, StickyNote } from '../types';
import { normalizeGroupedHabits } from '../utils';
import Dashboard from './Dashboard';
import HabitConfigMenu from './HabitConfigMenu';
import MatrixConfig from './MatrixConfig';
import StickyNoteConfig from './StickyNoteConfig';
import TodoConfig from './TodoConfig';

interface AppProps {
	plugin: StratumPlugin;
}

// Below this width the config panel fills the entire canvas instead of docking alongside.
const COMPACT_WIDTH = 600;

export default function App({ plugin }: AppProps) {
	const [store, setStore] = useState<PersistedStore | null>(null);
	const [compact, setCompact] = useState(false);
	const [configModuleId, setConfigModuleId] = useState<string | null>(null);
	const [todoShowCompleted, setTodoShowCompleted] = useState(true);
	const [floatingMenu, setFloatingMenu] = useState<{ habitId: string; x: number; y: number; isNew?: boolean } | null>(null);
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

	// Track whether the canvas is narrow so the config panel can go fullscreen.
	const hasStore = store !== null;
	useEffect(() => {
		const el = rootRef.current;
		if (!el) return;
		const update = () => setCompact(el.clientWidth < COMPACT_WIDTH);
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

	const { habits, categories } = store.data;

	function mutate(fn: (s: PersistedStore) => Promise<PersistedStore>): void {
		void (async () => {
			const next = await fn(store!);
			setStore(next);
		})();
	}

	// Habit mutations
	const onAddHabit = (name: string, color?: string) =>
		mutate((s) => plugin.store.addHabit(s, name, color));
	const onQuickAddHabit = async (): Promise<string> => {
		const next = await plugin.store.addHabit(store, 'New habit');
		setStore(next);
		return next.data.habits[next.data.habits.length - 1]!.id;
	};
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
	const onSaveLayout = (layout: GridItem[]) =>
		mutate((s) => plugin.store.saveLayout(s, layout));
	const onSetSkipDeleteConfirm = (skip: boolean) => {
		plugin.settings.skipDeleteConfirm = skip;
		void plugin.saveSettings();
	};
	const onSetMatrixDays = (days: number) => {
		plugin.settings.matrixDays = days;
		void plugin.saveSettings();
	};
	const onSetHeatmapDays = (days: number) => {
		plugin.settings.heatmapDays = days;
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
	const onDeleteCompletedTodos = () =>
		mutate((s) => plugin.store.deleteCompletedTodos(s));

	// Sticky note mutations
	// Returns the new module id so Dashboard can add it to localLayout.
	const onAddStickyNote = async (): Promise<string> => {
		const { store: next, note } = await plugin.store.addStickyNote(store!);
		setStore(next);
		const moduleId = `sticky_${note.id}`;
		setConfigModuleId(moduleId);
		return moduleId;
	};
	const onDeleteStickyNote = (id: string) =>
		mutate((s) => plugin.store.deleteStickyNote(s, id));
	const onUpdateStickyNote = (id: string, patch: Partial<Pick<StickyNote, 'title' | 'content' | 'bgColor' | 'textAlign' | 'fontSize'>>) =>
		mutate((s) => plugin.store.updateStickyNote(s, id, patch));

	// Floating config menu (right-click on habit label in matrix)
	const FLOAT_W = 244;
	const onHabitContextMenu = (habitId: string, clientX: number, clientY: number): void => {
		const x = Math.min(clientX, window.innerWidth - FLOAT_W - 8);
		setFloatingMenu({ habitId, x, y: clientY });
	};
	const onQuickAddHabitAt = (clientX: number, clientY: number): void => {
		void (async () => {
			const habitId = await onQuickAddHabit();
			const x = Math.min(clientX, window.innerWidth - FLOAT_W - 8);
			setFloatingMenu({ habitId, x, y: clientY, isNew: true });
		})();
	};

	const onOpenConfig = (moduleId: string | null) => setConfigModuleId(moduleId);

	return (
		<>
		<div className={`stratum-app${compact && configModuleId ? ' stratum-app--config-fullscreen' : ''}`} ref={rootRef}>
			<main className="stratum-main">
				<Dashboard
					layout={store.data.layout}
					habits={habits}
					categories={categories}
					logMap={logMap}
					logs={store.data.logs}
					todos={store.data.todos}
					stickyNotes={store.data.stickyNotes}
					matrixDays={store.settings.matrixDays}
					defaultColor={store.settings.matrixColorScheme === 'stratum' ? '#a4968e' : undefined}
					heatmapColor={store.settings.heatmapColor}
					heatmapDays={store.settings.heatmapDays}
					showMatrixDaysInput={store.settings.showMatrixDaysInput}
					showHeatmapDaysInput={store.settings.showHeatmapDaysInput}
					onToggleLog={onToggleLog}
					onSetLogNote={onSetLogNote}
					onHabitContextMenu={onHabitContextMenu}
					onQuickAddHabitAt={onQuickAddHabitAt}
					onSetMatrixDays={onSetMatrixDays}
					onSetHeatmapDays={onSetHeatmapDays}
					onSaveLayout={onSaveLayout}
					onAddTodo={onAddTodo}
					onToggleTodo={onToggleTodo}
					onDeleteTodo={onDeleteTodo}
					todoShowCompleted={todoShowCompleted}
					onAddStickyNote={onAddStickyNote}
					onDeleteStickyNote={onDeleteStickyNote}
					canAddStickyNote={plugin.store.canAddStickyNote(store)}
					configModuleId={configModuleId}
					onOpenConfig={onOpenConfig}
				/>
			</main>
			{configModuleId && (
				<aside className="stratum-config-panel">
					{configModuleId === 'todo' && (
						<TodoConfig
							completedCount={store.data.todos.filter((t) => t.completed).length}
							showCompleted={todoShowCompleted}
							onSetShowCompleted={(v) => setTodoShowCompleted(v)}
							onDeleteCompleted={onDeleteCompletedTodos}
						/>
					)}
					{configModuleId.startsWith('sticky_') && (() => {
						const note = store.data.stickyNotes.find((n) => n.id === configModuleId.slice('sticky_'.length));
						return note ? (
							<StickyNoteConfig
								note={note}
								onChange={(patch) => onUpdateStickyNote(note.id, patch)}
							/>
						) : null;
					})()}
					{configModuleId === 'matrix' && (
						<MatrixConfig
							habits={habits}
							categories={categories}
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
							onQuickAddHabit={onQuickAddHabit}
						/>
					)}
				</aside>
			)}
		</div>
		{floatingMenu && (() => {
			const habit = habits.find((h) => h.id === floatingMenu.habitId);
			if (!habit) return null;
			return createPortal(
				<>
					<div className="stratum-float-backdrop" onClick={() => setFloatingMenu(null)} />
					<HabitConfigMenu
						extraClass="stratum-config-menu--float"
						style={{ left: floatingMenu.x, top: floatingMenu.y }}
						habit={habit}
						categories={categories}
						initialClearName={floatingMenu.isNew ?? false}
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
				activeDocument.body,
			);
		})()}
		</>
	);
}
