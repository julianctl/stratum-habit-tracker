import { Fragment, useRef, useState, type DragEvent } from 'react';
import type { Category, DashboardRow, Habit, HabitLog, ModuleType } from '../types';
import HabitHeatmap from './HabitHeatmap';
import HabitMatrix from './HabitMatrix';

export type ModuleDestination =
	| { rowId: string; beforeModuleId: string | null }
	| { newRowBeforeId: string | null };

interface DashboardProps {
	layout: DashboardRow[];
	habits: Habit[];
	categories: Category[];
	logMap: Map<string, HabitLog>;
	logs: HabitLog[];
	matrixDays: number;
	defaultColor?: string;
	heatmapColor: string;
	heatmapHeight: number;
	heatmapDays: number;
	showMatrixDaysInput: boolean;
	showHeatmapDaysInput: boolean;
	onToggleLog: (habitId: string, date: string) => void;
	onSetLogNote: (habitId: string, date: string, note: string) => void;
	onHabitContextMenu?: (habitId: string, x: number, y: number) => void;
	onQuickAddHabitAt: (clientX: number, clientY: number) => void;
	onSetMatrixDays: (days: number) => void;
	onSetHeatmapDays: (days: number) => void;
	onMoveModule: (moduleId: string, destination: ModuleDestination) => void;
}

const MODULE_TITLES: Record<ModuleType, string> = {
	matrix: 'Habit Matrix',
	heatmap: 'Habit Heatmap',
};

// Where the dragged module currently hovers.
type DropTarget =
	| { kind: 'module'; rowId: string; beforeModuleId: string | null }
	| { kind: 'new-row'; beforeRowId: string | null }
	| null;

export default function Dashboard({
	layout, habits, categories, logMap, logs, matrixDays, defaultColor, heatmapColor, heatmapHeight, heatmapDays,
	showMatrixDaysInput, showHeatmapDaysInput,
	onToggleLog, onSetLogNote, onHabitContextMenu, onQuickAddHabitAt, onSetMatrixDays, onSetHeatmapDays, onMoveModule,
}: DashboardProps) {
	const dragModuleId = useRef<string | null>(null);
	const [dropTarget, setDropTarget] = useState<DropTarget>(null);

	function clearDrag() {
		dragModuleId.current = null;
		setDropTarget(null);
	}

	function onModuleDragOver(e: DragEvent, rowId: string, moduleId: string, nextModuleId: string | null) {
		if (!dragModuleId.current) return;
		// Hovering over the dragged module's own area shouldn't move the drop
		// target — crossing its midpoint would otherwise swap it with its neighbor
		// even though the cursor never left the module being dragged.
		if (moduleId === dragModuleId.current) return;
		e.preventDefault();
		e.stopPropagation();
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const before = e.clientX < rect.left + rect.width / 2;
		setDropTarget({ kind: 'module', rowId, beforeModuleId: before ? moduleId : nextModuleId });
	}

	function onModuleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (dragModuleId.current && dropTarget?.kind === 'module') {
			onMoveModule(dragModuleId.current, { rowId: dropTarget.rowId, beforeModuleId: dropTarget.beforeModuleId });
		}
		clearDrag();
	}

	function onStripDragOver(e: DragEvent, beforeRowId: string | null) {
		if (!dragModuleId.current) return;
		e.preventDefault();
		e.stopPropagation();
		setDropTarget({ kind: 'new-row', beforeRowId });
	}

	// Clears the indicator once the pointer drifts off any module/strip onto
	// dead space inside the dashboard — otherwise a stale target lingers and a
	// drop silently no-ops.
	function onDashboardDragOver() {
		if (dragModuleId.current && dropTarget !== null) setDropTarget(null);
	}

	// `dragover`/`dragleave` bubble like `mouseover`/`mouseout` — they fire on
	// every child boundary crossing, not just on truly leaving the container.
	// Once the pointer exits the dashboard's bounds entirely (e.g. past the
	// last strip, into the surrounding scroll padding), no element inside fires
	// dragover anymore, so the previous target's indicator would otherwise be
	// stuck forever. Compare against the bounding rect to detect a real exit.
	function onDashboardDragLeave(e: DragEvent) {
		if (!dragModuleId.current || dropTarget === null) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
			setDropTarget(null);
		}
	}

	function onStripDrop(e: DragEvent) {
		e.preventDefault();
		if (dragModuleId.current && dropTarget?.kind === 'new-row') {
			onMoveModule(dragModuleId.current, { newRowBeforeId: dropTarget.beforeRowId });
		}
		clearDrag();
	}

	function strip(beforeRowId: string | null) {
		const isHover = dropTarget?.kind === 'new-row' && dropTarget.beforeRowId === beforeRowId;
		return (
			<div
				className={`stratum-dash-strip ${isHover ? 'stratum-dash-strip--hover' : ''}`}
				onDragOver={(e) => onStripDragOver(e, beforeRowId)}
				onDrop={onStripDrop}
			/>
		);
	}

	function renderModule(type: ModuleType) {
		switch (type) {
			case 'matrix':
				return (
					<HabitMatrix
						habits={habits}
						categories={categories}
						logMap={logMap}
						monthDays={matrixDays}
						defaultColor={defaultColor}
						onToggleLog={onToggleLog}
						onSetLogNote={onSetLogNote}
						onHabitContextMenu={onHabitContextMenu}
						onQuickAddHabitAt={onQuickAddHabitAt}
						onSetMatrixDays={onSetMatrixDays}
						showDaysInput={showMatrixDaysInput}
					/>
				);
			case 'heatmap':
				return (
					<HabitHeatmap
						habits={habits}
						logs={logs}
						color={heatmapColor}
						height={heatmapHeight}
						days={heatmapDays}
						onSetDays={onSetHeatmapDays}
						showDaysInput={showHeatmapDaysInput}
					/>
				);
		}
	}

	return (
		<div className="stratum-dashboard" onDragOver={onDashboardDragOver} onDragLeave={onDashboardDragLeave}>
			{strip(layout[0]?.id ?? null)}
			{layout.map((row, rowIndex) => (
				<Fragment key={row.id}>
					<div className={`stratum-dash-row ${row.modules.length > 1 ? 'stratum-dash-row--split' : ''}`}>
						{row.modules.map((mod, i) => {
							const nextId = row.modules[i + 1]?.id ?? null;
							const isDropBefore = dropTarget?.kind === 'module' && dropTarget.rowId === row.id && dropTarget.beforeModuleId === mod.id;
							const isDropAfter = nextId === null && dropTarget?.kind === 'module' && dropTarget.rowId === row.id && dropTarget.beforeModuleId === null;
							return (
								<div
									key={mod.id}
									className={`stratum-dash-module ${isDropBefore ? 'stratum-dash-module--drop-before' : ''} ${isDropAfter ? 'stratum-dash-module--drop-after' : ''}`}
									onDragOver={(e) => onModuleDragOver(e, row.id, mod.id, nextId)}
									onDrop={onModuleDrop}
								>
									<div className="stratum-dash-module__header">
										<span
											className="stratum-dash-module__handle"
											draggable
											onDragStart={(e) => { dragModuleId.current = mod.id; e.dataTransfer.effectAllowed = 'move'; }}
											onDragEnd={clearDrag}
											title="Drag to rearrange"
										>⠿</span>
										<span className="stratum-section-title stratum-dash-module__title">{MODULE_TITLES[mod.type]}</span>
									</div>
									{renderModule(mod.type)}
								</div>
							);
						})}
					</div>
					{strip(layout[rowIndex + 1]?.id ?? null)}
				</Fragment>
			))}
		</div>
	);
}
