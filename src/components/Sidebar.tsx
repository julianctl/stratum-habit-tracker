import { useState } from 'react';
import type { Category, Habit, Todo } from '../types';
import DailyNoteButton from './DailyNoteButton';
import HabitConfigMenu from './HabitConfigMenu';
import HabitManager from './HabitManager';
import TodoPanel from './TodoPanel';

interface SidebarProps {
	todos: Todo[];
	habits: Habit[];
	categories: Category[];
	onAddTodo: (title: string, dueDate?: string) => void;
	onToggleTodo: (id: string) => void;
	onDeleteTodo: (id: string) => void;
	onOpenDailyNote: (date: string) => void;
	onAddHabit: (name: string, color?: string) => void;
	onDeleteHabit: (id: string) => void;
	onRenameHabit: (id: string, name: string) => void;
	onReorderHabits: (fromIndex: number, toIndex: number) => void;
	onSetHabitColor: (id: string, color?: string) => void;
	onSetHabitCategory: (id: string, categoryId?: string) => void;
	onCreateCategory: (habitId: string, name: string, color: string) => void;
	onSetCategoryColor: (categoryId: string, color: string) => void;
	onArchiveHabit: (id: string, endDate: string) => void;
	onUnarchiveHabit: (id: string, startDate: string) => void;
	onSetHabitStartDate: (id: string, date: string) => void;
	skipDeleteConfirm: boolean;
	onSetSkipDeleteConfirm: (skip: boolean) => void;
	groupByCategory: boolean;
	onMoveHabitInGroup: (habitId: string, targetCategoryId: string | undefined, beforeHabitId: string | null) => void;
	onReorderCategories: (fromCatId: string, toIndex: number) => void;
	onRenameCategory: (categoryId: string, name: string) => void;
	onAddHabitToCategory: (name: string, categoryId: string) => void;
}

export default function Sidebar({
	todos, habits, categories,
	onAddTodo, onToggleTodo, onDeleteTodo,
	onOpenDailyNote,
	onAddHabit, onDeleteHabit, onRenameHabit, onReorderHabits,
	onSetHabitColor, onSetHabitCategory, onCreateCategory, onSetCategoryColor,
	onArchiveHabit, onUnarchiveHabit, onSetHabitStartDate,
	skipDeleteConfirm, onSetSkipDeleteConfirm,
	groupByCategory, onMoveHabitInGroup, onReorderCategories, onRenameCategory, onAddHabitToCategory,
}: SidebarProps) {
	const [configHabitId, setConfigHabitId] = useState<string | null>(null);

	// Config page: replace sidebar content with the habit's settings.
	if (configHabitId) {
		const habit = habits.find((h) => h.id === configHabitId);
		if (habit) {
			return (
				<div className="stratum-sidebar-content">
					<button className="stratum-sidebar-back" onClick={() => setConfigHabitId(null)} title="Back">
						←
					</button>
					<HabitConfigMenu
						extraClass="stratum-config-menu--sidebar-page"
						habit={habit}
						categories={categories}
						onRename={(name) => onRenameHabit(habit.id, name)}
						onSetColor={(c) => onSetHabitColor(habit.id, c)}
						onSetCategory={(catId) => onSetHabitCategory(habit.id, catId)}
						onCreateCategory={(name, c) => onCreateCategory(habit.id, name, c)}
						onSetCategoryColor={onSetCategoryColor}
						onArchive={(endDate) => { onArchiveHabit(habit.id, endDate); setConfigHabitId(null); }}
						onUnarchive={(startDate) => { onUnarchiveHabit(habit.id, startDate); setConfigHabitId(null); }}
						onSetStartDate={(date) => onSetHabitStartDate(habit.id, date)}
						skipDeleteConfirm={skipDeleteConfirm}
						onDelete={() => { onDeleteHabit(habit.id); setConfigHabitId(null); }}
						onSetSkipDeleteConfirm={onSetSkipDeleteConfirm}
						onClose={() => setConfigHabitId(null)}
					/>
				</div>
			);
		}
	}

	return (
		<div className="stratum-sidebar-content">
			<DailyNoteButton onOpen={onOpenDailyNote} />
			<TodoPanel
				todos={todos}
				onAddTodo={onAddTodo}
				onToggleTodo={onToggleTodo}
				onDeleteTodo={onDeleteTodo}
			/>
			<HabitManager
				habits={habits}
				categories={categories}
				groupByCategory={groupByCategory}
				onAddHabit={onAddHabit}
				onAddHabitToCategory={onAddHabitToCategory}
				onDeleteHabit={onDeleteHabit}
				onReorderHabits={onReorderHabits}
				onMoveHabitInGroup={onMoveHabitInGroup}
				onReorderCategories={onReorderCategories}
				onRenameCategory={onRenameCategory}
				onSetCategoryColor={onSetCategoryColor}
				onEditHabit={setConfigHabitId}
			/>
		</div>
	);
}
