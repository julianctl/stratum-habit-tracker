import { Fragment, useEffect, useMemo, useRef, useState, type SVGProps } from 'react';
import { createPortal } from 'react-dom';
import type { Category, Habit, HabitLog } from '../types';
import { isHabitActiveOn, isHabitCurrentlyActive, useHorizontalWheelScroll } from '../utils';
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
	onQuickAddHabitAt: (clientX: number, clientY: number) => void;
	onSetMatrixDays: (days: number) => void;
	showDaysInput: boolean;
}

function IconChevronLeft(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="m15 18-6-6 6-6"/>
		</svg>
	);
}

function IconChevronRight(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="m9 18 6-6-6-6"/>
		</svg>
	);
}

function IconPlus(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<path d="M5 12h14"/>
			<path d="M12 5v14"/>
		</svg>
	);
}

const LABEL_WIDTH = 110;
const COL_WIDTH = 26;
const GRID_GAP = 3;

// ISO date string (YYYY-MM-DD) for `offset` days before today.
function isoDay(offset: number): string {
	const d = new Date();
	d.setUTCHours(0, 0, 0, 0);
	d.setUTCDate(d.getUTCDate() - offset);
	return d.toISOString().slice(0, 10);
}

// Window of `count` dates (oldest first) ending `pageOffset` days before today.
function getDates(count: number, pageOffset: number): string[] {
	const dates: string[] = [];
	for (let i = count - 1; i >= 0; i--) {
		dates.push(isoDay(pageOffset + i));
	}
	return dates;
}

function formatHeader(date: string, index: number): string {
	const d = new Date(date + 'T00:00:00');
	if (d.getDate() === 1 || index === 0) {
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
	return d.getDate().toString();
}

// Approximate popover dimensions for pre-render clamping.
const POPOVER_W = 188;
const POPOVER_H = 114;

interface NotePopover {
	habitId: string;
	date: string;
	x: number;
	y: number;
}

export default function HabitMatrix({ habits, categories, logMap, monthDays, defaultColor, onToggleLog, onSetLogNote, onHabitContextMenu, onQuickAddHabitAt, onSetMatrixDays, showDaysInput }: HabitMatrixProps) {
	const [pageOffset, setPageOffset] = useState(0);
	const [showArchived, setShowArchived] = useState(false);
	const [notePopover, setNotePopover] = useState<NotePopover | null>(null);
	const [noteDraft, setNoteDraft] = useState('');
	const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	useHorizontalWheelScroll(scrollRef);

	const dates = useMemo(() => getDates(monthDays, pageOffset), [monthDays, pageOffset]);
	const todayStr = isoDay(0);

	const hasArchived = habits.some((h) => !isHabitCurrentlyActive(h));
	const visibleHabits = showArchived ? habits : habits.filter(isHabitCurrentlyActive);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollLeft = el.scrollWidth;
	}, [monthDays, pageOffset, visibleHabits.length]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const ro = new ResizeObserver(() => { el.scrollLeft = el.scrollWidth; });
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

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

	function commitDays(value: string) {
		const n = parseInt(value, 10);
		if (Number.isFinite(n) && n > 0 && n !== monthDays) onSetMatrixDays(n);
	}

	function openNote(habitId: string, date: string, clientX: number, clientY: number) {
		const log = logMap.get(`${habitId}::${date}`);
		// Clamp so popover doesn't overflow the viewport bottom.
		const x = Math.min(clientX, window.innerWidth - POPOVER_W - 8);
		const y = Math.min(clientY, window.innerHeight - POPOVER_H - 8);
		setNoteDraft(log?.note ?? '');
		setNotePopover({ habitId, date, x, y });
		window.setTimeout(() => noteTextareaRef.current?.focus(), 0);
	}

	function commitNote() {
		if (notePopover) onSetLogNote(notePopover.habitId, notePopover.date, noteDraft);
		setNotePopover(null);
	}

	if (habits.length === 0) {
		return (
			<div className="stratum-matrix stratum-matrix--empty">
				<p>No habits yet. Add one in the sidebar.</p>
			</div>
		);
	}

	const gridTemplate = `${LABEL_WIDTH}px repeat(${dates.length}, ${COL_WIDTH}px)`;
	// Matches the grid's natural content width so the footer aligns with the
	// displayed columns (label column through the last date column) rather
	// than stretching to the full module width.
	const contentWidth = LABEL_WIDTH + dates.length * (COL_WIDTH + GRID_GAP);

	return (
		<>
		<div className="stratum-matrix">
			<div className="stratum-matrix__scroll" ref={scrollRef}>
				<div
					className="stratum-matrix__grid"
					style={{ gridTemplateColumns: gridTemplate }}
				>
					{/* Header row */}
					<div className="stratum-matrix__corner">
						<button className="stratum-matrix__nav-btn" title="Older" onClick={() => setPageOffset((o) => o + monthDays)}>
							<IconChevronLeft />
						</button>
						{pageOffset !== 0 && (
							<button className="stratum-matrix__nav-btn" title="Newer" onClick={() => setPageOffset((o) => Math.max(0, o - monthDays))}>
								<IconChevronRight />
							</button>
						)}
						{pageOffset !== 0 && (
							<button className="stratum-matrix__nav-btn stratum-matrix__nav-btn--today" title="Jump to today" onClick={() => setPageOffset(0)}>
								Today
							</button>
						)}
					</div>
					{dates.map((d, i) => (
						<div
							key={d}
							className={`stratum-matrix__date-header ${d === todayStr ? 'stratum-matrix__date-header--today' : ''}`}
						>
							{d === todayStr && <span className="stratum-matrix__today-dot" />}
							{formatHeader(d, i)}
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
											color={fill}
											isToday={date === todayStr}
											onToggle={() => onToggleLog(habit.id, date)}
											onOpenNote={(cx, cy) => openNote(habit.id, date, cx, cy)}
										/>
									);
								})}
							</Fragment>
						);
					})}
				</div>
			</div>
			<div className="stratum-matrix__footer" style={{ width: contentWidth, maxWidth: '100%' }}>
				<button
					className="stratum-matrix__footer-btn"
					onClick={(e) => onQuickAddHabitAt(e.clientX, e.clientY)}
					title="Add habit"
				>
					<IconPlus /> New habit
				</button>
				<div className="stratum-matrix__footer-spacer" />
				{hasArchived && (
					<button
						className={`stratum-matrix__footer-btn ${showArchived ? 'stratum-matrix__footer-btn--active' : ''}`}
						onClick={() => setShowArchived((v) => !v)}
						title="Toggle archived habits"
					>
						{showArchived ? 'Hide archived' : 'Show archived'}
					</button>
				)}
				{showDaysInput && (
					<label className="stratum-matrix__days-input" title="Number of days shown in the matrix">
						Show
						<input
							type="number"
							min={1}
							key={monthDays}
							defaultValue={monthDays}
							onBlur={(e) => commitDays(e.currentTarget.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
						/>
						days
					</label>
				)}
			</div>
		</div>
		{notePopover && createPortal(
			<>
				<div className="stratum-float-backdrop" onClick={commitNote} />
				<div
					className="stratum-cell__note-popover"
					style={{ left: notePopover.x, top: notePopover.y }}
					onClick={(e) => e.stopPropagation()}
				>
					<textarea
						ref={noteTextareaRef}
						value={noteDraft}
						onChange={(e) => setNoteDraft(e.target.value)}
						onBlur={commitNote}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitNote(); }
							if (e.key === 'Escape') { e.preventDefault(); setNotePopover(null); }
						}}
						placeholder="Add a note..."
						rows={3}
					/>
					<span className="stratum-cell__note-hint">ESC to cancel · Enter to save</span>
				</div>
			</>,
			activeDocument.body,
		)}
		</>
	);
}
