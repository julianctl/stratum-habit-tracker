import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { Category, Habit, HabitLog } from '../types';
import { isHabitActiveOn, isHabitCurrentlyActive } from '../utils';
import MatrixCell from './MatrixCell';

interface HabitMatrixProps {
	habits: Habit[];
	categories: Category[];
	logMap: Map<string, HabitLog>;
	monthDays: number;
	defaultColor?: string;
	onToggleLog: (habitId: string, date: string) => void;
	onSetLogNote: (habitId: string, date: string, note: string) => void;
	onHabitContextMenu?: (habitId: string, x: number, y: number) => void;
}

type ViewMode = 'week' | 'month';

const LABEL_WIDTH = 110;
const COL_WIDTH = 26;

// ISO date string (YYYY-MM-DD) for `offset` days before today.
function isoDay(offset: number): string {
	const d = new Date();
	d.setUTCHours(0, 0, 0, 0);
	d.setUTCDate(d.getUTCDate() - offset);
	return d.toISOString().slice(0, 10);
}

// Window of dates (oldest first, end-most last) ending `pageOffset` days before today.
function getDates(mode: ViewMode, monthDays: number, pageOffset: number): string[] {
	const dates: string[] = [];
	const count = mode === 'week' ? 7 : monthDays;
	const end = mode === 'week' ? 0 : pageOffset;
	for (let i = count - 1; i >= 0; i--) {
		dates.push(isoDay(end + i));
	}
	return dates;
}

function formatHeader(date: string, mode: ViewMode, index: number): string {
	const d = new Date(date + 'T00:00:00');
	if (mode === 'week') {
		return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
	}
	if (d.getDate() === 1 || index === 0) {
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
	return d.getDate().toString();
}

export default function HabitMatrix({ habits, categories, logMap, monthDays, defaultColor, onToggleLog, onSetLogNote, onHabitContextMenu }: HabitMatrixProps) {
	const [mode, setMode] = useState<ViewMode>('week');
	const [pageOffset, setPageOffset] = useState(0);
	const [showArchived, setShowArchived] = useState(false);
	const scrollRef = useRef<HTMLDivElement>(null);

	const dates = useMemo(() => getDates(mode, monthDays, pageOffset), [mode, monthDays, pageOffset]);
	const todayStr = isoDay(0);

	const hasArchived = habits.some((h) => !isHabitCurrentlyActive(h));
	const visibleHabits = showArchived ? habits : habits.filter(isHabitCurrentlyActive);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollLeft = el.scrollWidth;
	}, [mode, monthDays, pageOffset, visibleHabits.length]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el || mode !== 'month') return;
		const ro = new ResizeObserver(() => { el.scrollLeft = el.scrollWidth; });
		ro.observe(el);
		return () => ro.disconnect();
	}, [mode]);

	const catColor = useMemo(() => {
		const map = new Map<string, string>();
		for (const c of categories) map.set(c.id, c.color);
		return map;
	}, [categories]);

	function cellColor(habit: Habit): string | undefined {
		return habit.color ?? (habit.categoryId ? catColor.get(habit.categoryId) : undefined) ?? defaultColor;
	}

	function ribbonColor(habit: Habit): string | undefined {
		return habit.color ?? (habit.categoryId ? catColor.get(habit.categoryId) : undefined);
	}

	function switchMode(next: ViewMode) {
		setMode(next);
		setPageOffset(0);
	}

	if (habits.length === 0) {
		return (
			<div className="stratum-matrix stratum-matrix--empty">
				<p>No habits yet. Add one in the sidebar.</p>
			</div>
		);
	}

	const isWeek = mode === 'week';
	const gridTemplate = isWeek
		? `minmax(80px, 1fr) repeat(${dates.length}, ${COL_WIDTH}px)`
		: `${LABEL_WIDTH}px repeat(${dates.length}, ${COL_WIDTH}px)`;

	return (
		<div className="stratum-matrix">
			<div className="stratum-matrix__toolbar">
				<span className="stratum-matrix__title">Habit Matrix</span>
				<div className="stratum-matrix__controls">
					{mode === 'month' && (
						<div className="stratum-matrix__pager">
							<button title="Older" onClick={() => setPageOffset((o) => o + monthDays)}>‹</button>
							<button title="Newer" disabled={pageOffset === 0} onClick={() => setPageOffset((o) => Math.max(0, o - monthDays))}>›</button>
							<button title="Jump to today" disabled={pageOffset === 0} onClick={() => setPageOffset(0)}>Today</button>
						</div>
					)}
					{hasArchived && (
						<button
							className={`stratum-btn stratum-btn--tiny ${showArchived ? 'stratum-btn--active' : ''}`}
							onClick={() => setShowArchived((v) => !v)}
							title="Toggle archived habits"
						>
							Archived
						</button>
					)}
					<div className="stratum-matrix__toggle">
						<button
							className={mode === 'week' ? 'stratum-btn--active' : ''}
							onClick={() => switchMode('week')}
						>Week</button>
						<button
							className={mode === 'month' ? 'stratum-btn--active' : ''}
							onClick={() => switchMode('month')}
						>Month</button>
					</div>
				</div>
			</div>
			<div className="stratum-matrix__scroll" ref={scrollRef}>
				<div
					className={`stratum-matrix__grid ${isWeek ? 'stratum-matrix__grid--fill' : ''}`}
					style={{ gridTemplateColumns: gridTemplate }}
				>
					{/* Header row */}
					<div className="stratum-matrix__corner" />
					{dates.map((d, i) => (
						<div
							key={d}
							className={`stratum-matrix__date-header ${d === todayStr ? 'stratum-matrix__date-header--today' : ''}`}
						>
							{d === todayStr && <span className="stratum-matrix__today-dot" />}
							{formatHeader(d, mode, i)}
						</div>
					))}
					{/* Habit rows */}
					{visibleHabits.map((habit) => {
						const fill = cellColor(habit);
						const ribbon = ribbonColor(habit);
						const isArchived = !isHabitCurrentlyActive(habit);
						return (
							<Fragment key={habit.id}>
								<div
									className={`stratum-matrix__habit-label ${isArchived ? 'stratum-matrix__habit-label--archived' : ''}`}
									style={ribbon ? { borderLeftColor: ribbon } : {}}
									onContextMenu={onHabitContextMenu ? (e) => {
										e.preventDefault();
										e.stopPropagation();
										onHabitContextMenu(habit.id, e.clientX, e.clientY);
									} : undefined}
									title={onHabitContextMenu ? 'Right-click to configure' : undefined}
								>
									<span className="stratum-matrix__habit-label-text">{habit.name}</span>
								</div>
								{dates.map((date) => {
									const key = `${habit.id}::${date}`;
									const inactive = !isHabitActiveOn(habit, date);
									if (inactive) {
										return <div key={key} className="stratum-cell stratum-cell--inactive" />;
									}
									const log = logMap.get(key);
									return (
										<MatrixCell
											key={key}
											date={date}
											isCompleted={!!log}
											hasNote={!!log?.note}
											note={log?.note ?? ''}
											color={fill}
											isToday={date === todayStr}
											onToggle={() => onToggleLog(habit.id, date)}
											onSetNote={(note) => onSetLogNote(habit.id, date, note)}
										/>
									);
								})}
							</Fragment>
						);
					})}
				</div>
			</div>
		</div>
	);
}
