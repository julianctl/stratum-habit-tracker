import { useRef, useState, type DragEvent } from 'react';
import type { Category, Habit } from '../types';
import HabitConfigMenu from './HabitConfigMenu';

interface HabitManagerProps {
	habits: Habit[];
	categories: Category[];
	onAddHabit: (name: string, color?: string) => void;
	onDeleteHabit: (id: string) => void;
	onRenameHabit: (id: string, name: string) => void;
	onReorderHabits: (fromIndex: number, toIndex: number) => void;
	onSetHabitColor: (id: string, color?: string) => void;
	onSetHabitCategory: (id: string, categoryId?: string) => void;
	onCreateCategory: (habitId: string, name: string, color: string) => void;
	onSetCategoryColor: (categoryId: string, color: string) => void;
}

export default function HabitManager({
	habits, categories,
	onAddHabit, onDeleteHabit, onRenameHabit, onReorderHabits,
	onSetHabitColor, onSetHabitCategory, onCreateCategory, onSetCategoryColor,
}: HabitManagerProps) {
	const [input, setInput] = useState('');
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
	const dragFromIndex = useRef<number | null>(null);

	function submitAdd() {
		const name = input.trim();
		if (!name) return;
		onAddHabit(name);
		setInput('');
	}

	function onDragStart(index: number) {
		dragFromIndex.current = index;
	}

	function onDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		setDragOverIndex(index);
	}

	function onDrop(toIndex: number) {
		const fromIndex = dragFromIndex.current;
		if (fromIndex !== null && fromIndex !== toIndex) {
			onReorderHabits(fromIndex, toIndex);
		}
		dragFromIndex.current = null;
		setDragOverIndex(null);
	}

	function onDragEnd() {
		dragFromIndex.current = null;
		setDragOverIndex(null);
	}

	function effectiveColor(habit: Habit): string | undefined {
		if (habit.color) return habit.color;
		if (habit.categoryId) return categories.find((c) => c.id === habit.categoryId)?.color;
		return undefined;
	}

	return (
		<div className="stratum-habit-manager">
			<h3 className="stratum-section-title">Habits</h3>
			<div className="stratum-todos__input-row">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); }}
					placeholder="New habit..."
					className="stratum-input"
				/>
				<button className="stratum-btn" onClick={submitAdd}>+</button>
			</div>
			<ul className="stratum-habits__list">
				{habits.map((habit, index) => {
					const color = effectiveColor(habit);
					return (
						<li
							key={habit.id}
							className={`stratum-habit-item ${dragOverIndex === index ? 'stratum-habit-item--drag-over' : ''}`}
							draggable
							onDragStart={() => onDragStart(index)}
							onDragOver={(e) => onDragOver(e, index)}
							onDrop={() => onDrop(index)}
							onDragEnd={onDragEnd}
						>
							<span className="stratum-habit-item__drag-handle">⠿</span>
							<span className="stratum-habit-item__name">
								<span
									className="stratum-habit-item__dot"
									style={{ background: color ?? 'var(--text-faint)' }}
								/>
								{habit.name}
							</span>
							<button
								className="stratum-habit-item__config"
								onClick={() => setOpenMenuId(openMenuId === habit.id ? null : habit.id)}
								title="Configure habit"
							>⚙</button>
							<button className="stratum-todo-item__delete" onClick={() => onDeleteHabit(habit.id)}>×</button>
							{openMenuId === habit.id && (
								<HabitConfigMenu
									habit={habit}
									categories={categories}
									onRename={(name) => onRenameHabit(habit.id, name)}
									onSetColor={(c) => onSetHabitColor(habit.id, c)}
									onSetCategory={(catId) => onSetHabitCategory(habit.id, catId)}
									onCreateCategory={(name, c) => onCreateCategory(habit.id, name, c)}
									onSetCategoryColor={onSetCategoryColor}
									onClose={() => setOpenMenuId(null)}
								/>
							)}
						</li>
					);
				})}
			</ul>
		</div>
	);
}
