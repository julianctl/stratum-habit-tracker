import { type CSSProperties, useEffect, useState, type SVGProps } from 'react';

function IconArchive(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<rect width="20" height="5" x="2" y="3" rx="1"/>
			<path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>
			<path d="M10 12h4"/>
		</svg>
	);
}

function IconTrash(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M3 6h18"/>
			<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
			<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
			<line x1="10" x2="10" y1="11" y2="17"/>
			<line x1="14" x2="14" y1="11" y2="17"/>
		</svg>
	);
}
import type { Category, Habit } from '../types';
import { isHabitCurrentlyActive, todayISO } from '../utils';

const NEW_CATEGORY_PALETTE = ['#F5F3EF', '#584738', '#D8CFC4', '#5F6A6A', '#DCB482', '#8A9A9D'];

interface HabitConfigMenuProps {
	habit: Habit;
	categories: Category[];
	extraClass?: string;
	style?: CSSProperties;
	skipDeleteConfirm: boolean;
	initialClearName?: boolean;
	onRename: (name: string) => void;
	onSetColor: (color?: string) => void;
	onSetCategory: (categoryId?: string) => void;
	onCreateCategory: (name: string, color: string) => void;
	onSetCategoryColor: (categoryId: string, color: string) => void;
	onArchive: (endDate: string) => void;
	onUnarchive: (startDate: string) => void;
	onSetStartDate: (date: string) => void;
	onDelete: () => void;
	onSetSkipDeleteConfirm: (skip: boolean) => void;
	onClose: () => void;
}

export default function HabitConfigMenu({
	habit, categories,
	extraClass, style,
	skipDeleteConfirm,
	initialClearName,
	onRename, onSetColor, onSetCategory, onCreateCategory, onSetCategoryColor,
	onArchive, onUnarchive, onSetStartDate,
	onDelete, onSetSkipDeleteConfirm,
	onClose,
}: HabitConfigMenuProps) {
	const [name, setName] = useState(initialClearName ? '' : habit.name);
	const [nameError, setNameError] = useState(false);
	const [creatingCategory, setCreatingCategory] = useState(false);
	const [newCatName, setNewCatName] = useState('');
	const [newCatColor, setNewCatColor] = useState(
		NEW_CATEGORY_PALETTE[categories.length % NEW_CATEGORY_PALETTE.length]!,
	);
	const [showArchiveForm, setShowArchiveForm] = useState(false);
	const [archiveDate, setArchiveDate] = useState(todayISO());
	const [restartDate, setRestartDate] = useState(todayISO());
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [dontShowAgain, setDontShowAgain] = useState(false);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [onClose]);

	const isActive = isHabitCurrentlyActive(habit);
	const lastPeriod = habit.periods[habit.periods.length - 1];
	const category = categories.find((c) => c.id === habit.categoryId);

	function commitName() {
		const trimmed = name.trim();
		if (!trimmed) { setNameError(true); return; }
		setNameError(false);
		if (trimmed !== habit.name) onRename(trimmed);
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
		<div className={`stratum-config-menu${extraClass ? ` ${extraClass}` : ''}`} style={style} onClick={(e) => e.stopPropagation()}>
			<label className="stratum-config-menu__label">Name</label>
			{nameError && <span className="stratum-config-menu__name-error">Habit name cannot be empty</span>}
			<div className="stratum-config-menu__name-row">
				<input
					className="stratum-input"
					value={name}
					autoFocus={initialClearName}
					onChange={(e) => { setName(e.target.value); if (nameError) setNameError(false); }}
					onBlur={commitName}
					onKeyDown={(e) => { if (e.key === 'Enter') { commitName(); if (name.trim()) onClose(); } if (e.key === 'Escape') onClose(); }}
				/>
				{isActive && (
					<button
						className="stratum-btn stratum-btn--icon-sm"
						title="Archive habit"
						onClick={() => setShowArchiveForm((v) => !v)}
					>
						<IconArchive />
					</button>
				)}
				<button
					className="stratum-btn stratum-btn--icon-sm stratum-btn--danger"
					title="Delete habit"
					onClick={() => {
						if (skipDeleteConfirm) { onDelete(); onClose(); }
						else { setShowDeleteConfirm(true); }
					}}
				>
					<IconTrash />
				</button>
			</div>

			<label className="stratum-config-menu__label">Habit color</label>
			<div className="stratum-config-menu__color-row">
				<input
					type="color"
					value={habit.color ?? category?.color ?? '#a4968e'}
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

			{/* Active since / archive controls */}
			{isActive && lastPeriod && (
				<>
					<label className="stratum-config-menu__label">Active since</label>
					<input
						type="date"
						className="stratum-input"
						value={lastPeriod.startDate}
						onChange={(e) => onSetStartDate(e.target.value)}
					/>
					{showArchiveForm && (
						<div className="stratum-config-menu__archive-form">
							<label className="stratum-config-menu__label">Last active date</label>
							<input
								type="date"
								className="stratum-input"
								value={archiveDate}
								onChange={(e) => setArchiveDate(e.target.value)}
							/>
							<div className="stratum-config-menu__color-row" style={{ marginTop: 4 }}>
								<button
									className="stratum-btn stratum-btn--tiny stratum-btn--danger"
									onClick={() => { onArchive(archiveDate); onClose(); }}
								>
									Confirm
								</button>
								<button className="stratum-btn stratum-btn--tiny" onClick={() => setShowArchiveForm(false)}>
									Cancel
								</button>
							</div>
						</div>
					)}
				</>
			)}

			{/* Restart controls for archived habits */}
			{!isActive && (
				<div className="stratum-config-menu__archive-form">
					<label className="stratum-config-menu__label">
						Archived · {habit.periods.length} period{habit.periods.length !== 1 ? 's' : ''}
					</label>
					<label className="stratum-config-menu__label">Restart from</label>
					<input
						type="date"
						className="stratum-input"
						value={restartDate}
						onChange={(e) => setRestartDate(e.target.value)}
					/>
					<button
						className="stratum-btn stratum-btn--full"
						style={{ marginTop: 4 }}
						onClick={() => { onUnarchive(restartDate); onClose(); }}
					>
						Restart habit
					</button>
				</div>
			)}

		{showDeleteConfirm && (
				<div className="stratum-delete-confirm" onClick={(e) => e.stopPropagation()}>
					<p className="stratum-delete-confirm__message">
						Delete <strong>{habit.name}</strong>?<br />
						<span>This will remove all logs for this habit.</span>
					</p>
					<label className="stratum-delete-confirm__skip">
						<input
							type="checkbox"
							checked={dontShowAgain}
							onChange={(e) => setDontShowAgain(e.target.checked)}
						/>
						Don't show this again
					</label>
					<div className="stratum-delete-confirm__actions">
						<button
							className="stratum-btn stratum-btn--tiny stratum-btn--danger"
							onClick={() => {
								if (dontShowAgain) onSetSkipDeleteConfirm(true);
								onDelete();
								onClose();
							}}
						>
							Delete
						</button>
						<button
							className="stratum-btn stratum-btn--tiny"
							onClick={() => { setShowDeleteConfirm(false); setDontShowAgain(false); }}
						>
							Cancel
						</button>
					</div>
					<span className="stratum-cell__note-hint">Restore via Settings → Delete confirmation</span>
				</div>
			)}
		</div>
	);
}
