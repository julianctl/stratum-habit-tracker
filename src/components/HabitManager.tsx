import { useMemo, useRef, useState, type DragEvent } from 'react';
import type { Category, Habit } from '../types';
import { isHabitCurrentlyActive } from '../utils';

interface HabitManagerProps {
	habits: Habit[];
	categories: Category[];
	onAddHabit: (name: string, color?: string) => void;
	onDeleteHabit: (id: string) => void;
	onReorderHabits: (fromIndex: number, toIndex: number) => void;
	onEditHabit: (habitId: string) => void;
}

export default function HabitManager({
	habits, categories,
	onAddHabit, onDeleteHabit, onReorderHabits, onEditHabit,
}: HabitManagerProps) {
	const [input, setInput] = useState('');
	const [dropPosition, setDropPosition] = useState<number | null>(null);
	const [archivedOpen, setArchivedOpen] = useState(false);
	const dragFromStoreIndex = useRef<number | null>(null);

	const indexedActive = useMemo(
		() => habits.map((h, i) => ({ habit: h, storeIndex: i })).filter(({ habit }) => isHabitCurrentlyActive(habit)),
		[habits],
	);
	const indexedArchived = useMemo(
		() => habits.map((h, i) => ({ habit: h, storeIndex: i })).filter(({ habit }) => !isHabitCurrentlyActive(habit)),
		[habits],
	);

	function storeIndexForDropPos(pos: number): number {
		if (pos < indexedActive.length) return indexedActive[pos]!.storeIndex;
		return habits.length;
	}

	function submitAdd() {
		const name = input.trim();
		if (!name) return;
		onAddHabit(name);
		setInput('');
	}

	function resolveVisualPos(e: DragEvent, displayIndex: number): number {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		return e.clientY < rect.top + rect.height / 2 ? displayIndex : displayIndex + 1;
	}

	function onDragStart(storeIndex: number) {
		dragFromStoreIndex.current = storeIndex;
	}

	function onDragOver(e: DragEvent, displayIndex: number) {
		e.preventDefault();
		setDropPosition(resolveVisualPos(e, displayIndex));
	}

	function onDrop(e: DragEvent, displayIndex: number) {
		const visualPos = resolveVisualPos(e, displayIndex);
		const storePos = storeIndexForDropPos(visualPos);
		const fromStoreIdx = dragFromStoreIndex.current;
		if (fromStoreIdx !== null) {
			onReorderHabits(fromStoreIdx, storePos);
		}
		dragFromStoreIndex.current = null;
		setDropPosition(null);
	}

	function onDragEnd() {
		dragFromStoreIndex.current = null;
		setDropPosition(null);
	}

	function effectiveColor(habit: Habit): string | undefined {
		if (habit.color) return habit.color;
		if (habit.categoryId) return categories.find((c) => c.id === habit.categoryId)?.color;
		return undefined;
	}

	function renderHabitRow(habit: Habit, storeIndex: number, draggable: boolean, displayIndex?: number) {
		const color = effectiveColor(habit);
		const isActive = isHabitCurrentlyActive(habit);
		const isDropBefore = draggable && dropPosition === displayIndex;
		const isDropAfter = draggable && dropPosition === indexedActive.length && displayIndex === indexedActive.length - 1;

		return (
			<li
				key={habit.id}
				className={`stratum-habit-item ${!isActive ? 'stratum-habit-item--archived' : ''} ${isDropBefore ? 'stratum-habit-item--drop-before' : ''} ${isDropAfter ? 'stratum-habit-item--drop-after' : ''}`}
				draggable={draggable}
				onDragStart={draggable && displayIndex !== undefined ? () => onDragStart(storeIndex) : undefined}
				onDragOver={draggable && displayIndex !== undefined ? (e) => onDragOver(e, displayIndex) : undefined}
				onDrop={draggable && displayIndex !== undefined ? (e) => onDrop(e, displayIndex) : undefined}
				onDragEnd={draggable ? onDragEnd : undefined}
			>
				<span className="stratum-habit-item__drag-handle" style={draggable ? {} : { visibility: 'hidden' }}>⠿</span>
				<span className="stratum-habit-item__name">
					<span
						className="stratum-habit-item__dot"
						style={{ background: color ?? 'var(--text-faint)' }}
					/>
					{habit.name}
				</span>
				<button
					className="stratum-habit-item__config"
					onClick={() => onEditHabit(habit.id)}
					title="Configure habit"
				>⚙</button>
				<button className="stratum-todo-item__delete" onClick={() => onDeleteHabit(habit.id)}>×</button>
			</li>
		);
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
				{indexedActive.map(({ habit, storeIndex }, displayIndex) =>
					renderHabitRow(habit, storeIndex, true, displayIndex),
				)}
			</ul>
			{indexedArchived.length > 0 && (
				<div className="stratum-archived-section">
					<button
						className="stratum-archived-section__toggle"
						onClick={() => setArchivedOpen((o) => !o)}
					>
						{archivedOpen ? '▾' : '▸'} Archived ({indexedArchived.length})
					</button>
					{archivedOpen && (
						<ul className="stratum-habits__list">
							{indexedArchived.map(({ habit, storeIndex }) =>
								renderHabitRow(habit, storeIndex, false),
							)}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}
