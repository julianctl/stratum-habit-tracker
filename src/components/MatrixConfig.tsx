import { useState } from 'react';
import type { Category, Habit } from '../types';
import HabitConfigMenu from './HabitConfigMenu';
import HabitManager from './HabitManager';

interface MatrixConfigProps {
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
	onQuickAddHabit: () => Promise<string>;
}

export default function MatrixConfig({
	habits, categories,
	onAddHabit, onDeleteHabit, onRenameHabit, onReorderHabits,
	onSetHabitColor, onSetHabitCategory, onCreateCategory, onSetCategoryColor,
	onArchiveHabit, onUnarchiveHabit, onSetHabitStartDate,
	skipDeleteConfirm, onSetSkipDeleteConfirm,
	groupByCategory, onMoveHabitInGroup, onReorderCategories, onRenameCategory, onAddHabitToCategory,
	onQuickAddHabit,
}: MatrixConfigProps) {
	const [configHabitId, setConfigHabitId] = useState<string | null>(null);
	const [newHabitId, setNewHabitId] = useState<string | null>(null);

	async function handleQuickAdd() {
		const id = await onQuickAddHabit();
		setNewHabitId(id);
		setConfigHabitId(id);
	}

	if (configHabitId) {
		const habit = habits.find((h) => h.id === configHabitId);
		if (habit) {
			const isNew = newHabitId === configHabitId;
			return (
				<div className="stratum-config-panel__content">
					<button className="stratum-config-panel__back" onClick={() => { setConfigHabitId(null); setNewHabitId(null); }} title="Back">
						←
					</button>
					<HabitConfigMenu
						extraClass="stratum-config-menu--panel-page"
						habit={habit}
						categories={categories}
						initialClearName={isNew}
						onRename={(name) => onRenameHabit(habit.id, name)}
						onSetColor={(c) => onSetHabitColor(habit.id, c)}
						onSetCategory={(catId) => onSetHabitCategory(habit.id, catId)}
						onCreateCategory={(name, c) => onCreateCategory(habit.id, name, c)}
						onSetCategoryColor={onSetCategoryColor}
						onArchive={(endDate) => { onArchiveHabit(habit.id, endDate); setConfigHabitId(null); setNewHabitId(null); }}
						onUnarchive={(startDate) => { onUnarchiveHabit(habit.id, startDate); setConfigHabitId(null); setNewHabitId(null); }}
						onSetStartDate={(date) => onSetHabitStartDate(habit.id, date)}
						skipDeleteConfirm={skipDeleteConfirm}
						onDelete={() => { onDeleteHabit(habit.id); setConfigHabitId(null); setNewHabitId(null); }}
						onSetSkipDeleteConfirm={onSetSkipDeleteConfirm}
						onClose={() => { setConfigHabitId(null); setNewHabitId(null); }}
					/>
				</div>
			);
		}
	}

	return (
		<div className="stratum-config-panel__content">
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
				onQuickAddHabit={() => { void handleQuickAdd(); }}
			/>
		</div>
	);
}
