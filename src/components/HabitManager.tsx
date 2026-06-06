import { useMemo, useRef, useState, type DragEvent } from 'react';
import type { Category, Habit } from '../types';
import { isHabitCurrentlyActive, UNCATEGORIZED_KEY as UNCAT } from '../utils';

interface HabitManagerProps {
	habits: Habit[];
	categories: Category[];
	groupByCategory: boolean;
	onAddHabit: (name: string, color?: string) => void;
	onAddHabitToCategory: (name: string, categoryId: string) => void;
	onDeleteHabit: (id: string) => void;
	onReorderHabits: (fromIndex: number, toIndex: number) => void;
	onMoveHabitInGroup: (habitId: string, targetCategoryId: string | undefined, beforeHabitId: string | null) => void;
	onReorderCategories: (fromCatId: string, toIndex: number) => void;
	onRenameCategory: (categoryId: string, name: string) => void;
	onSetCategoryColor: (categoryId: string, color: string) => void;
	onEditHabit: (habitId: string) => void;
	onQuickAddHabit: () => void;
}


export default function HabitManager({
	habits, categories,
	groupByCategory,
	onAddHabit, onAddHabitToCategory, onDeleteHabit, onReorderHabits, onMoveHabitInGroup, onReorderCategories, onRenameCategory, onSetCategoryColor, onEditHabit, onQuickAddHabit,
}: HabitManagerProps) {
	const [input, setInput] = useState('');
	const [archivedOpen, setArchivedOpen] = useState(false);
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

	const activeHabits = useMemo(() => habits.filter(isHabitCurrentlyActive), [habits]);
	const archivedHabits = useMemo(() => habits.filter((h) => !isHabitCurrentlyActive(h)), [habits]);

	const sortedCategories = useMemo(
		() => [...categories].sort((a, b) => a.order - b.order),
		[categories],
	);

	function submitAdd() {
		const name = input.trim();
		if (!name) return;
		onAddHabit(name);
		setInput('');
	}

	function toggleCollapse(key: string) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key);
			else next.add(key);
			return next;
		});
	}

	function effectiveColor(habit: Habit): string | undefined {
		if (habit.color) return habit.color;
		if (habit.categoryId) return categories.find((c) => c.id === habit.categoryId)?.color;
		return undefined;
	}

	return (
		<div className="stratum-habit-manager">
			<div className="stratum-section-title-row">
				<h3 className="stratum-section-title">Habits</h3>
				<button className="stratum-cat-header__add" onClick={onQuickAddHabit} title="Add habit">+</button>
			</div>
			{!groupByCategory && (
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
			)}

			{groupByCategory ? (
				<GroupedList
					activeHabits={activeHabits}
					sortedCategories={sortedCategories}
					collapsed={collapsed}
					effectiveColor={effectiveColor}
					onToggleCollapse={toggleCollapse}
					onAddHabit={onAddHabit}
					onSetCategoryColor={onSetCategoryColor}
					onMoveHabitInGroup={onMoveHabitInGroup}
					onReorderCategories={onReorderCategories}
					onRenameCategory={onRenameCategory}
					onEditHabit={onEditHabit}
				/>
			) : (
				<FlatList
					habits={habits}
					effectiveColor={effectiveColor}
					onReorderHabits={onReorderHabits}
					onEditHabit={onEditHabit}
				/>
			)}

			{archivedHabits.length > 0 && (
				<div className="stratum-archived-section">
					<button
						className="stratum-archived-section__toggle"
						onClick={() => setArchivedOpen((o) => !o)}
					>
						{archivedOpen ? '▾' : '▸'} Archived ({archivedHabits.length})
					</button>
					{archivedOpen && (
						<ul className="stratum-habits__list">
							{archivedHabits.map((habit) => (
								<HabitRow
									key={habit.id}
									habit={habit}
									color={effectiveColor(habit)}
									draggable={false}
									onEditHabit={onEditHabit}
								/>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}

// --- Shared habit row ---

interface HabitRowProps {
	habit: Habit;
	color: string | undefined;
	draggable: boolean;
	dropClass?: string;
	onEditHabit: (id: string) => void;
	onDragStart?: (e: DragEvent) => void;
	onDragOver?: (e: DragEvent) => void;
	onDrop?: (e: DragEvent) => void;
	onDragEnd?: (e: DragEvent) => void;
}

function HabitRow({ habit, color, draggable, dropClass, onEditHabit, onDragStart, onDragOver, onDrop, onDragEnd }: HabitRowProps) {
	const isActive = isHabitCurrentlyActive(habit);
	return (
		<li
			className={`stratum-habit-item ${!isActive ? 'stratum-habit-item--archived' : ''} ${dropClass ?? ''}`}
			draggable={draggable}
			onClick={() => onEditHabit(habit.id)}
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDrop={onDrop}
			onDragEnd={onDragEnd}
			style={{ cursor: 'pointer' }}
		>
			<span
				className="stratum-habit-item__drag-handle"
				style={draggable ? {} : { visibility: 'hidden' }}
				onClick={(e) => e.stopPropagation()}
			>⠿</span>
			<span className="stratum-habit-item__name">
				<span className="stratum-habit-item__dot" style={{ background: color ?? 'var(--text-faint)' }} />
				{habit.name}
			</span>
			<button
				className="stratum-habit-item__config"
				onClick={(e) => { e.stopPropagation(); onEditHabit(habit.id); }}
				title="Configure habit"
			>⚙</button>
		</li>
	);
}

// --- Flat (ungrouped) list — original behavior ---

interface FlatListProps {
	habits: Habit[];
	effectiveColor: (h: Habit) => string | undefined;
	onReorderHabits: (fromIndex: number, toIndex: number) => void;
	onEditHabit: (id: string) => void;
}

function FlatList({ habits, effectiveColor, onReorderHabits, onEditHabit }: FlatListProps) {
	const [dropPosition, setDropPosition] = useState<number | null>(null);
	const dragFromStoreIndex = useRef<number | null>(null);

	const indexedActive = useMemo(
		() => habits.map((h, i) => ({ habit: h, storeIndex: i })).filter(({ habit }) => isHabitCurrentlyActive(habit)),
		[habits],
	);

	function storeIndexForDropPos(pos: number): number {
		if (pos < indexedActive.length) return indexedActive[pos]!.storeIndex;
		return habits.length;
	}

	function resolveVisualPos(e: DragEvent, displayIndex: number): number {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		return e.clientY < rect.top + rect.height / 2 ? displayIndex : displayIndex + 1;
	}

	function onDrop(e: DragEvent, displayIndex: number) {
		const visualPos = resolveVisualPos(e, displayIndex);
		const storePos = storeIndexForDropPos(visualPos);
		const fromStoreIdx = dragFromStoreIndex.current;
		if (fromStoreIdx !== null) onReorderHabits(fromStoreIdx, storePos);
		dragFromStoreIndex.current = null;
		setDropPosition(null);
	}

	return (
		<ul className="stratum-habits__list">
			{indexedActive.map(({ habit, storeIndex }, displayIndex) => {
				const isDropBefore = dropPosition === displayIndex;
				const isDropAfter = dropPosition === indexedActive.length && displayIndex === indexedActive.length - 1;
				return (
					<HabitRow
						key={habit.id}
						habit={habit}
						color={effectiveColor(habit)}
						draggable
						dropClass={`${isDropBefore ? 'stratum-habit-item--drop-before' : ''} ${isDropAfter ? 'stratum-habit-item--drop-after' : ''}`}
						onEditHabit={onEditHabit}
						onDragStart={() => { dragFromStoreIndex.current = storeIndex; }}
						onDragOver={(e) => { e.preventDefault(); setDropPosition(resolveVisualPos(e, displayIndex)); }}
						onDrop={(e) => onDrop(e, displayIndex)}
						onDragEnd={() => { dragFromStoreIndex.current = null; setDropPosition(null); }}
					/>
				);
			})}
		</ul>
	);
}

// --- Grouped list ---

interface GroupedListProps {
	activeHabits: Habit[];
	sortedCategories: Category[];
	collapsed: Set<string>;
	effectiveColor: (h: Habit) => string | undefined;
	onToggleCollapse: (key: string) => void;
	onAddHabit: (name: string) => void;
	onSetCategoryColor: (categoryId: string, color: string) => void;
	onMoveHabitInGroup: (habitId: string, targetCategoryId: string | undefined, beforeHabitId: string | null) => void;
	onReorderCategories: (fromCatId: string, toIndex: number) => void;
	onRenameCategory: (categoryId: string, name: string) => void;
	onEditHabit: (id: string) => void;
}

type HabitDrag = { kind: 'habit'; habitId: string };
type CatDrag = { kind: 'category'; catId: string };
type DragState = HabitDrag | CatDrag | null;

// Where the drop indicator currently sits.
type DropTarget =
	| { type: 'habit'; categoryId: string | undefined; beforeHabitId: string | null }
	| { type: 'category'; index: number }
	| null;

function GroupedList({
	activeHabits, sortedCategories, collapsed,
	effectiveColor, onToggleCollapse, onAddHabit, onSetCategoryColor, onMoveHabitInGroup, onReorderCategories, onRenameCategory, onEditHabit,
}: GroupedListProps) {
	const drag = useRef<DragState>(null);
	const [dropTarget, setDropTarget] = useState<DropTarget>(null);
	// categoryId → draft name while editing; null = not editing
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameDraft, setRenameDraft] = useState('');
	// categoryId → pending new habit name (empty string = showing input)
	function startRename(cat: Category) {
		setRenamingId(cat.id);
		setRenameDraft(cat.name);
	}

	function commitRename(catId: string) {
		const trimmed = renameDraft.trim();
		if (trimmed && trimmed !== sortedCategories.find((c) => c.id === catId)?.name) {
			onRenameCategory(catId, trimmed);
		}
		setRenamingId(null);
	}

	const habitsByCat = useMemo(() => {
		const map = new Map<string, Habit[]>();
		map.set(UNCAT, []);
		for (const c of sortedCategories) map.set(c.id, []);
		for (const h of activeHabits) {
			const key = h.categoryId ?? UNCAT;
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(h);
		}
		return map;
	}, [activeHabits, sortedCategories]);

	const uncategorized = habitsByCat.get(UNCAT) ?? [];

	function clearDrag() {
		drag.current = null;
		setDropTarget(null);
	}

	// --- Habit drop computation ---
	function habitDropClass(habit: Habit, catId: string | undefined): string {
		if (!dropTarget || dropTarget.type !== 'habit') return '';
		const sameCat = (dropTarget.categoryId ?? UNCAT) === (catId ?? UNCAT);
		if (!sameCat) return '';
		if (dropTarget.beforeHabitId === habit.id) return 'stratum-habit-item--drop-before';
		return '';
	}

	function onHabitDragOver(e: DragEvent, catId: string | undefined, habit: Habit, list: Habit[], index: number) {
		if (!drag.current || drag.current.kind !== 'habit') return;
		e.preventDefault();
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const before = e.clientY < rect.top + rect.height / 2;
		const beforeHabitId = before ? habit.id : (list[index + 1]?.id ?? null);
		setDropTarget({ type: 'habit', categoryId: catId, beforeHabitId });
	}

	function onHabitDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (drag.current?.kind === 'habit' && dropTarget?.type === 'habit') {
			onMoveHabitInGroup(drag.current.habitId, dropTarget.categoryId, dropTarget.beforeHabitId);
		}
		clearDrag();
	}

	// Dropping onto an (empty) category body appends to that category.
	function onCategoryBodyDragOver(e: DragEvent, catId: string | undefined) {
		if (!drag.current || drag.current.kind !== 'habit') return;
		e.preventDefault();
		setDropTarget({ type: 'habit', categoryId: catId, beforeHabitId: null });
	}

	// --- Category header drop computation ---
	function onCatHeaderDragOver(e: DragEvent, index: number) {
		if (!drag.current || drag.current.kind !== 'category') return;
		e.preventDefault();
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const before = e.clientY < rect.top + rect.height / 2;
		setDropTarget({ type: 'category', index: before ? index : index + 1 });
	}

	function onCatHeaderDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (drag.current?.kind === 'category' && dropTarget?.type === 'category') {
			onReorderCategories(drag.current.catId, dropTarget.index);
		}
		clearDrag();
	}

	function renderCategoryNest(cat: Category, index: number) {
		const list = habitsByCat.get(cat.id) ?? [];
		const isCollapsed = collapsed.has(cat.id);
		const isRenaming = renamingId === cat.id;
		const headerDropBefore = dropTarget?.type === 'category' && dropTarget.index === index;
		const headerDropAfter = dropTarget?.type === 'category' && dropTarget.index === index + 1;
		return (
			<div className="stratum-cat-group" key={cat.id}>
				<div
					className={`stratum-cat-header ${headerDropBefore ? 'stratum-cat-header--drop-before' : ''} ${headerDropAfter ? 'stratum-cat-header--drop-after' : ''}`}
					draggable={!isRenaming}
					onDragStart={() => { if (!isRenaming) drag.current = { kind: 'category', catId: cat.id }; }}
					onDragOver={(e) => onCatHeaderDragOver(e, index)}
					onDrop={onCatHeaderDrop}
					onDragEnd={clearDrag}
				>
					<button
						className="stratum-cat-header__toggle"
						onClick={() => onToggleCollapse(cat.id)}
						title={isCollapsed ? 'Expand' : 'Collapse'}
					>
						{isCollapsed ? '▸' : '▾'}
					</button>
					{isRenaming ? (
						<input
							className="stratum-cat-header__rename-input"
							value={renameDraft}
							autoFocus
							onChange={(e) => setRenameDraft(e.target.value)}
							onBlur={() => commitRename(cat.id)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') { e.preventDefault(); commitRename(cat.id); }
								if (e.key === 'Escape') { e.preventDefault(); setRenamingId(null); }
							}}
						/>
					) : (
						<>
							<label
								className="stratum-cat-header__dot-label"
								title="Change category color"
								style={{ background: cat.color }}
							>
								<input
									type="color"
									className="stratum-cat-header__color-input"
									value={cat.color}
									onChange={(e) => onSetCategoryColor(cat.id, e.target.value)}
								/>
							</label>
							<span
								className="stratum-cat-header__name"
								onClick={() => startRename(cat)}
								title="Rename category"
							>
								{cat.name}
							</span>
						</>
					)}
					<span className="stratum-cat-header__count">{list.length}</span>
				</div>
				{!isCollapsed && (
					<ul
						className="stratum-habits__list stratum-cat-group__body"
						onDragOver={(e) => onCategoryBodyDragOver(e, cat.id)}
						onDrop={onHabitDrop}
					>
						{list.map((habit, i) => (
							<HabitRow
								key={habit.id}
								habit={habit}
								color={effectiveColor(habit)}
								draggable
								dropClass={habitDropClass(habit, cat.id)}
								onEditHabit={onEditHabit}
								onDragStart={() => { drag.current = { kind: 'habit', habitId: habit.id }; }}
								onDragOver={(e) => onHabitDragOver(e, cat.id, habit, list, i)}
								onDrop={onHabitDrop}
								onDragEnd={clearDrag}
							/>
						))}
					</ul>
				)}
			</div>
		);
	}

	function renderUncategorized() {
		const isCollapsed = collapsed.has(UNCAT);
		return (
			<div className="stratum-cat-group stratum-cat-group--uncat">
				<div className="stratum-cat-header stratum-cat-header--uncat">
					<button
						className="stratum-cat-header__toggle"
						onClick={() => onToggleCollapse(UNCAT)}
						title={isCollapsed ? 'Expand' : 'Collapse'}
					>
						{isCollapsed ? '▸' : '▾'}
					</button>
					<span className="stratum-cat-header__name stratum-cat-header__name--uncat">Uncategorized</span>
					<span className="stratum-cat-header__count">{uncategorized.length}</span>
				</div>
				{!isCollapsed && (
					<ul
						className="stratum-habits__list stratum-cat-group__body"
						onDragOver={(e) => onCategoryBodyDragOver(e, undefined)}
						onDrop={onHabitDrop}
					>
						{uncategorized.map((habit, i) => (
							<HabitRow
								key={habit.id}
								habit={habit}
								color={effectiveColor(habit)}
								draggable
								dropClass={habitDropClass(habit, undefined)}
								onEditHabit={onEditHabit}
								onDragStart={() => { drag.current = { kind: 'habit', habitId: habit.id }; }}
								onDragOver={(e) => onHabitDragOver(e, undefined, habit, uncategorized, i)}
								onDrop={onHabitDrop}
								onDragEnd={clearDrag}
							/>
						))}
					</ul>
				)}
			</div>
		);
	}

	return (
		<div className="stratum-grouped">
			{sortedCategories.map((cat, i) => renderCategoryNest(cat, i))}
			{renderUncategorized()}
		</div>
	);
}
