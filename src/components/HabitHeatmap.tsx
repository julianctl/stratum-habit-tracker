import { cloneElement, useEffect, useMemo, useRef, useState, type ReactElement, type SVGProps } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import type { Habit, HabitLog } from '../types';
import { isHabitActiveOn, useHorizontalWheelScroll } from '../utils';

interface HabitHeatmapProps {
	habits: Habit[];
	logs: HabitLog[];
	color: string;
	days: number;
	onSetDays: (days: number) => void;
	showDaysInput: boolean;
}

function daysAgo(count: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - (count - 1));
	return d;
}

function levelClass(count: number, total: number): string {
	if (count === 0 || total === 0) return 'stratum-heatmap__cell--empty';
	const pct = count / total;
	if (pct <= 0.25) return 'stratum-heatmap__cell--1';
	if (pct <= 0.50) return 'stratum-heatmap__cell--2';
	if (pct <= 0.75) return 'stratum-heatmap__cell--3';
	return 'stratum-heatmap__cell--4';
}

export default function HabitHeatmap({ habits, logs, color, days, onSetDays, showDaysInput }: HabitHeatmapProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	useHorizontalWheelScroll(scrollRef);
	const [contentWidth, setContentWidth] = useState<number>();

	// Mirrors the matrix footer's alignment: track the rendered SVG's natural
	// width so the footer lines up with the displayed heatmap, not the module.
	useEffect(() => {
		const el = scrollRef.current?.querySelector<HTMLElement>('.react-calendar-heatmap');
		if (!el) return;
		const measure = () => setContentWidth(el.getBoundingClientRect().width);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	function commitDays(value: string) {
		const n = parseInt(value, 10);
		if (Number.isFinite(n) && n > 0 && n !== days) onSetDays(n);
	}

	const values = useMemo(() => {
		const counts = new Map<string, number>();
		for (const log of logs) {
			counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
		}
		return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
	}, [logs]);

	// For each day in the heatmap window, count how many habits were active.
	// This is the per-day denominator for completion percentage.
	const activeCountByDate = useMemo(() => {
		const map = new Map<string, number>();
		const today = new Date();
		const d = daysAgo(days);
		while (d <= today) {
			const iso = d.toISOString().slice(0, 10);
			map.set(iso, habits.filter((h) => isHabitActiveOn(h, iso)).length);
			d.setDate(d.getDate() + 1);
		}
		return map;
	}, [habits, days]);

	// Default to the rightmost (most recent) and re-pin on resize. When the
	// heatmap fully fits, scrollWidth === clientWidth so it stays centered (CSS).
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const pin = () => { el.scrollLeft = el.scrollWidth; };
		pin();
		const ro = new ResizeObserver(pin);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	if (habits.length === 0) return null;

	return (
		<div className="stratum-heatmap">
			<style>{`
				.stratum-heatmap rect.stratum-heatmap__cell--1 { fill: ${color} !important; opacity: 0.25; }
				.stratum-heatmap rect.stratum-heatmap__cell--2 { fill: ${color} !important; opacity: 0.50; }
				.stratum-heatmap rect.stratum-heatmap__cell--3 { fill: ${color} !important; opacity: 0.75; }
				.stratum-heatmap rect.stratum-heatmap__cell--4 { fill: ${color} !important; opacity: 1.0; }
				.stratum-heatmap .react-calendar-heatmap { height: 180px !important; }
			`}</style>
			<div className="stratum-heatmap__scroll" ref={scrollRef}>
				<CalendarHeatmap
					startDate={daysAgo(days)}
					endDate={new Date()}
					values={values}
					classForValue={(value) => {
						const count = Number(value?.count ?? 0);
						const total = value ? (activeCountByDate.get(value.date) ?? 0) : 0;
						return levelClass(count, total);
					}}
					showWeekdayLabels
					transformDayElement={(el) =>
						cloneElement(el as unknown as ReactElement<SVGProps<SVGRectElement>>, { rx: 2, ry: 2 })
					}
				/>
			</div>
			{showDaysInput && (
				<div className="stratum-matrix__footer" style={{ width: contentWidth, maxWidth: '100%' }}>
					<div className="stratum-matrix__footer-spacer" />
					<label className="stratum-matrix__days-input" title="Number of days shown in the heatmap">
						Show
						<input
							type="number"
							min={1}
							key={days}
							defaultValue={days}
							onBlur={(e) => commitDays(e.currentTarget.value)}
							onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
						/>
						days
					</label>
				</div>
			)}
		</div>
	);
}
