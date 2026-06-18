import { useEffect, useRef, useState, type ReactNode, type SVGProps } from 'react';
import GridLayout, { useContainerWidth, type EventCallback, type Layout } from 'react-grid-layout';
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
							<span className="stratum-dash-handle stratum-dash-module__handle" title="Drag to rearrange">
								<IconGrip />
							</span>
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
		</div>
	);
}
