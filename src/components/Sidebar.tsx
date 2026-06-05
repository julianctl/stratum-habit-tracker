import type { Category, Habit, Todo } from '../types';
import DailyNoteButton from './DailyNoteButton';
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
}

export default function Sidebar({
	todos, habits, categories,
	onAddTodo, onToggleTodo, onDeleteTodo,
	onOpenDailyNote,
	onAddHabit, onDeleteHabit, onRenameHabit, onReorderHabits,
	onSetHabitColor, onSetHabitCategory, onCreateCategory, onSetCategoryColor,
}: SidebarProps) {
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
				onAddHabit={onAddHabit}
				onDeleteHabit={onDeleteHabit}
				onRenameHabit={onRenameHabit}
				onReorderHabits={onReorderHabits}
				onSetHabitColor={onSetHabitColor}
				onSetHabitCategory={onSetHabitCategory}
				onCreateCategory={onCreateCategory}
				onSetCategoryColor={onSetCategoryColor}
			/>
		</div>
	);
}
