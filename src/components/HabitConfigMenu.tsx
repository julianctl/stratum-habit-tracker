import { useState } from 'react';
import type { Category, Habit } from '../types';

const NEW_CATEGORY_PALETTE = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];

interface HabitConfigMenuProps {
	habit: Habit;
	categories: Category[];
	onRename: (name: string) => void;
	onSetColor: (color?: string) => void;
	onSetCategory: (categoryId?: string) => void;
	onCreateCategory: (name: string, color: string) => void;
	onSetCategoryColor: (categoryId: string, color: string) => void;
	onClose: () => void;
}

export default function HabitConfigMenu({
	habit, categories,
	onRename, onSetColor, onSetCategory, onCreateCategory, onSetCategoryColor,
	onClose,
}: HabitConfigMenuProps) {
	const [name, setName] = useState(habit.name);
	const [creatingCategory, setCreatingCategory] = useState(false);
	const [newCatName, setNewCatName] = useState('');
	const [newCatColor, setNewCatColor] = useState(
		NEW_CATEGORY_PALETTE[categories.length % NEW_CATEGORY_PALETTE.length]!,
	);

	const category = categories.find((c) => c.id === habit.categoryId);

	function commitName() {
		const trimmed = name.trim();
		if (trimmed && trimmed !== habit.name) onRename(trimmed);
	}

	function onCategorySelect(value: string) {
		if (value === '__new__') {
			setCreatingCategory(true);
		} else if (value === '') {
			onSetCategory(undefined);
		} else {
			onSetCategory(value);
		}
	}

	function commitNewCategory() {
		const trimmed = newCatName.trim();
		if (trimmed) onCreateCategory(trimmed, newCatColor);
		setCreatingCategory(false);
		setNewCatName('');
	}

	return (
		<div className="stratum-config-menu" onClick={(e) => e.stopPropagation()}>
			<label className="stratum-config-menu__label">Name</label>
			<input
				className="stratum-input"
				value={name}
				onChange={(e) => setName(e.target.value)}
				onBlur={commitName}
				onKeyDown={(e) => { if (e.key === 'Enter') { commitName(); onClose(); } if (e.key === 'Escape') onClose(); }}
			/>

			<label className="stratum-config-menu__label">Habit color</label>
			<div className="stratum-config-menu__color-row">
				<input
					type="color"
					value={habit.color ?? category?.color ?? '#4caf50'}
					onChange={(e) => onSetColor(e.target.value)}
				/>
				{habit.color && (
					<button className="stratum-btn stratum-btn--tiny" onClick={() => onSetColor(undefined)}>
						Use category color
					</button>
				)}
			</div>

			<label className="stratum-config-menu__label">Category</label>
			{creatingCategory ? (
				<div className="stratum-config-menu__new-cat">
					<input
						autoFocus
						className="stratum-input"
						placeholder="Category name"
						value={newCatName}
						onChange={(e) => setNewCatName(e.target.value)}
						onKeyDown={(e) => { if (e.key === 'Enter') commitNewCategory(); if (e.key === 'Escape') setCreatingCategory(false); }}
					/>
					<input
						type="color"
						value={newCatColor}
						onChange={(e) => setNewCatColor(e.target.value)}
					/>
					<button className="stratum-btn stratum-btn--tiny" onClick={commitNewCategory}>Add</button>
				</div>
			) : (
				<div className="stratum-config-menu__color-row">
					<select
						className="stratum-input"
						value={habit.categoryId ?? ''}
						onChange={(e) => onCategorySelect(e.target.value)}
					>
						<option value="">None</option>
						{categories.map((c) => (
							<option key={c.id} value={c.id}>{c.name}</option>
						))}
						<option value="__new__">+ New category…</option>
					</select>
					{category && (
						<input
							type="color"
							title="Category color"
							value={category.color}
							onChange={(e) => onSetCategoryColor(category.id, e.target.value)}
						/>
					)}
				</div>
			)}

			<button className="stratum-btn stratum-btn--full stratum-config-menu__done" onClick={onClose}>Done</button>
		</div>
	);
}
