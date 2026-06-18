import { useEffect, useRef, useState, type ReactNode, type SVGProps } from 'react';
import GridLayout, { useContainerWidth, type EventCallback, type Layout } from 'react-grid-layout';
import { DEFAULT_LAYOUT } from '../store';
import type { Category, GridItem, Habit, HabitLog } from '../types';
import HabitHeatmap from './HabitHeatmap';
import HabitMatrix from './HabitMatrix';

const ROW_HEIGHT = 25;
const ROW_MARGIN = 10;

// Natural (unscaled) matrix content dimensions.
const MATRIX_HEADER_ROW_PX = 60;  // date header row (max-height from CSS)
const MATRIX_ROW_PX        = 25;  // cell (22px) + gap (3px)
const MATRIX_FOOTER_PX     = 34;  // footer button + margin-top

// Natural (unscaled) heatmap content dimensions.
const HEATMAP_SVG_PX     = 180;  // fixed SVG height
const HEATMAP_TOP_PX     = 8;    // padding-top on .stratum-heatmap
const HEATMAP_BOTTOM_PX  = 6;    // padding-bottom on .stratum-heatmap
const HEATMAP_FOOTER_PX  = 34;   // same footer height as matrix
const HEATMAP_NATURAL_PX = HEATMAP_TOP_PX + HEATMAP_SVG_PX + HEATMAP_FOOTER_PX + HEATMAP_BOTTOM_PX; // 228px

// Module chrome: top-pad + header element + gap-below-header + bottom-pad (from CSS)
const MODULE_CHROME_PX = 8 + 22 + 6 + 8; // 44px

function rowsToPx(rows: number): number {
	return rows * (ROW_HEIGHT + ROW_MARGIN) - ROW_MARGIN;
}
function pxToRows(px: number): number {
	return Math.ceil((px + ROW_MARGIN) / (ROW_HEIGHT + ROW_MARGIN));
}

// Natural height of the matrix content area (unscaled).
function matrixNaturalPx(habitCount: number): number {
	return MATRIX_HEADER_ROW_PX + habitCount * MATRIX_ROW_PX + MATRIX_FOOTER_PX;
}

function IconGrip(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<circle cx="9"  cy="5"  r="1"/><circle cx="9"  cy="12" r="1"/><circle cx="9"  cy="19" r="1"/>
			<circle cx="15" cy="5"  r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
		</svg>
	);
}

function IconX(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
		</svg>
	);
}

function IconPlus(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
		</svg>
	);
}

const MODULE_TITLES: Record<string, string> = {
	matrix:      'Habit Matrix',
	heatmap:     'Habit Heatmap',
	// TODO: remove test modules before release
	test_yellow: 'Test Yellow',
	test_blue:   'Test Blue',
	test_red:    'Test Red',
};

const TEST_MODULE_COLORS: Record<string, string> = {
	test_yellow: '#C9A84C',
	test_blue:   '#4A7FA5',
	test_red:    '#B85450',
};

// Registry of every known module, used to populate the "+ New Widget" list
// with whichever ones aren't currently in the layout.
interface ModuleCatalogEntry {
	id: string;
	title: string;
	w: number;
	h: number;
	minW?: number;
	minH?: number;
}

const MODULE_CATALOG: ModuleCatalogEntry[] = DEFAULT_LAYOUT.map(({ i, w, h, minW, minH }) => ({
	id: i,
	title: MODULE_TITLES[i] ?? i,
	w, h, minW, minH,
}));

function toGridItems(layout: Layout): GridItem[] {
	return layout.map(({ i, x, y, w, h, minW, minH }) => ({ i, x, y, w, h, minW, minH }));
}

interface DashboardProps {
	layout: GridItem[];
	habits: Habit[];
	categories: Category[];
	logMap: Map<string, HabitLog>;
	logs: HabitLog[];
	matrixDays: number;
	defaultColor?: string;
	heatmapColor: string;
	heatmapDays: number;
	showMatrixDaysInput: boolean;
	showHeatmapDaysInput: boolean;
	onToggleLog: (habitId: string, date: string) => void;
	onSetLogNote: (habitId: string, date: string, note: string) => void;
	onHabitContextMenu?: (habitId: string, x: number, y: number) => void;
	onQuickAddHabitAt: (clientX: number, clientY: number) => void;
	onSetMatrixDays: (days: number) => void;
	onSetHeatmapDays: (days: number) => void;
	onSaveLayout: (layout: GridItem[]) => void;
}

// Scaled wrapper: renders children at natural size then scales to fit availableHeight.
function ScaledContent({ naturalHeight, availableHeight, children }: {
	naturalHeight: number;
	availableHeight: number;
	children: ReactNode;
}) {
	const scale = availableHeight > 0 ? availableHeight / naturalHeight : 1;
	return (
		<div style={{ height: availableHeight, overflow: 'hidden' }}>
			<div style={{
				transformOrigin: 'top left',
				transform: `scale(${scale})`,
				width: `${100 / scale}%`,
				height: naturalHeight,
			}}>
				{children}
			</div>
		</div>
	);
}

export default function Dashboard({
	layout, habits, categories, logMap, logs, matrixDays, defaultColor,
	heatmapColor, heatmapDays, showMatrixDaysInput, showHeatmapDaysInput,
	onToggleLog, onSetLogNote, onHabitContextMenu, onQuickAddHabitAt,
	onSetMatrixDays, onSetHeatmapDays, onSaveLayout,
}: DashboardProps) {
	const { containerRef, width } = useContainerWidth();
	const [localLayout, setLocalLayout] = useState<GridItem[]>(layout);
	const [addMenuOpen, setAddMenuOpen] = useState(false);
	const addMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!addMenuOpen) return;
		const onMouseDown = (e: MouseEvent) => {
			if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false);
		};
		const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setAddMenuOpen(false); };
		activeDocument.addEventListener('mousedown', onMouseDown);
		activeDocument.addEventListener('keydown', onKeyDown);
		return () => {
			activeDocument.removeEventListener('mousedown', onMouseDown);
			activeDocument.removeEventListener('keydown', onKeyDown);
		};
	}, [addMenuOpen]);

	// Track previous habit count to detect additions and grow the matrix item.
	const prevHabitCount = useRef(habits.length);
	useEffect(() => {
		const prev = prevHabitCount.current;
		const curr = habits.length;
		if (curr <= prev) {
			prevHabitCount.current = curr;
			return;
		}
		const added = curr - prev;
		prevHabitCount.current = curr;

		setLocalLayout((prevLayout) => {
			const item = prevLayout.find((it) => it.i === 'matrix');
			if (!item) return prevLayout;
			// Current scale = availableContentPx / naturalPx(prev count)
			const itemPx = rowsToPx(item.h);
			const availablePx = itemPx - MODULE_CHROME_PX;
			const naturalPx = matrixNaturalPx(prev);
			const scale = naturalPx > 0 ? availablePx / naturalPx : 1;
			// Grow by added rows × natural row height × current scale
			const growPx = added * MATRIX_ROW_PX * scale;
			const newItemPx = itemPx + growPx;
			const newH = pxToRows(newItemPx);
			if (newH === item.h) return prevLayout;
			return prevLayout.map((it) => it.i === 'matrix' ? { ...it, h: newH } : it);
		});
	}, [habits.length]);

	function renderModule(id: string, item: GridItem) {
		const itemPx = rowsToPx(item.h);
		const availablePx = Math.max(itemPx - MODULE_CHROME_PX, 0);

		switch (id) {
			case 'matrix': {
				const activeHabits = habits.filter((h) => h.periods.some((p) => !p.endDate));
				const naturalPx = matrixNaturalPx(activeHabits.length);
				return (
					<ScaledContent naturalHeight={naturalPx} availableHeight={availablePx}>
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
					</ScaledContent>
				);
			}
			case 'heatmap':
				return (
					<ScaledContent naturalHeight={HEATMAP_NATURAL_PX} availableHeight={availablePx}>
						<HabitHeatmap
							habits={habits}
							logs={logs}
							color={heatmapColor}
							days={heatmapDays}
							onSetDays={onSetHeatmapDays}
							showDaysInput={showHeatmapDaysInput}
						/>
					</ScaledContent>
				);
			default:
				if (id in TEST_MODULE_COLORS) {
					return (
						<div style={{
							width: '100%', height: '100%',
							background: TEST_MODULE_COLORS[id],
							borderRadius: 'var(--radius-m)',
							opacity: 0.4,
						}} />
					);
				}
				return null;
		}
	}

	const handleStop: EventCallback = (nextLayout) => {
		const items = toGridItems(nextLayout);
		setLocalLayout(items);
		onSaveLayout(items);
	};

	// Update local layout on every resize tick so ScaledContent rescales live.
	const handleResize: EventCallback = (_layout, _old, item) => {
		if (!item) return;
		setLocalLayout((prev) => prev.map((it) => it.i === item.i ? { ...it, h: item.h, w: item.w } : it));
	};

	// Removing a module only hides it (drops it from the layout) — its
	// underlying data (habits, logs, etc.) is untouched and it reappears via
	// "+ New Widget".
	function handleDeleteModule(id: string) {
		const next = localLayout.filter((it) => it.i !== id);
		setLocalLayout(next);
		onSaveLayout(next);
	}

	// Appends the module as a new row below everything else, at its catalog
	// default size, so it can never collide with existing modules.
	function handleAddModule(id: string) {
		const def = MODULE_CATALOG.find((m) => m.id === id);
		if (!def) return;
		const y = localLayout.reduce((max, it) => Math.max(max, it.y + it.h), 0);
		const newItem: GridItem = { i: def.id, x: 0, y, w: def.w, h: def.h, minW: def.minW, minH: def.minH };
		const next = [...localLayout, newItem];
		setLocalLayout(next);
		onSaveLayout(next);
		setAddMenuOpen(false);
	}

	const hiddenModules = MODULE_CATALOG.filter((m) => !localLayout.some((it) => it.i === m.id));

	return (
		<div ref={containerRef}>
			<GridLayout
				layout={localLayout}
				width={width}
				gridConfig={{ cols: 12, rowHeight: ROW_HEIGHT, margin: [0, ROW_MARGIN], containerPadding: [0, 0] }}
				dragConfig={{ handle: '.stratum-dash-handle' }}
				resizeConfig={{ enabled: true, handles: ['se'] }}
				onResize={handleResize}
				onDragStop={handleStop}
				onResizeStop={handleStop}
			>
				{/* Each module must use stratum-dash-module > __header (__handle + __title) + __content. CSS handles all spacing. */}
				{localLayout.map((item) => (
					<div key={item.i} className="stratum-dash-module">
						<div className="stratum-dash-module__header">
							<div className="stratum-dash-module__handle-col">
								<span className="stratum-dash-handle stratum-dash-module__handle" title="Drag to rearrange">
									<IconGrip />
								</span>
								<button
									className="stratum-dash-module__delete"
									title="Remove module"
									onClick={() => handleDeleteModule(item.i)}
								>
									<IconX />
								</button>
							</div>
							<span className="stratum-section-title stratum-dash-module__title">
								{MODULE_TITLES[item.i] ?? item.i}
							</span>
						</div>
						<div className="stratum-dash-module__content">
							{renderModule(item.i, item)}
						</div>
					</div>
				))}
			</GridLayout>
			<div className="stratum-dash-add-row" ref={addMenuRef}>
				<button
					className="stratum-dash-add-btn"
					onClick={() => setAddMenuOpen((o) => !o)}
					disabled={hiddenModules.length === 0}
				>
					<IconPlus />
					<span>New Widget</span>
				</button>
				{addMenuOpen && hiddenModules.length > 0 && (
					<div className="stratum-dash-add-menu">
						{hiddenModules.map((m) => (
							<button
								key={m.id}
								className="stratum-dash-add-menu__item"
								onClick={() => handleAddModule(m.id)}
							>
								{m.title}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
