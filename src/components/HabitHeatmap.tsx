import { cloneElement, useEffect, useMemo, useRef, type ReactElement, type SVGProps } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import type { Habit, HabitLog } from '../types';
import { isHabitActiveOn } from '../utils';

interface HabitHeatmapProps {
	habits: Habit[];
	logs: HabitLog[];
	color: string;
	height: number;
}

function getYearAgo(): Date {
	const d = new Date();
	d.setFullYear(d.getFullYear() - 1);
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

export default function HabitHeatmap({ habits, logs, color, height }: HabitHeatmapProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

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
		const d = new Date(today);
		d.setFullYear(d.getFullYear() - 1);
		while (d <= today) {
			const iso = d.toISOString().slice(0, 10);
			map.set(iso, habits.filter((h) => isHabitActiveOn(h, iso)).length);
			d.setDate(d.getDate() + 1);
		}
		return map;
	}, [habits]);

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
				.stratum-heatmap .react-calendar-heatmap { height: ${height}px !important; }
			`}</style>
			<h3 className="stratum-section-title">Year Overview</h3>
			<div className="stratum-heatmap__scroll" ref={scrollRef}>
				<CalendarHeatmap
					startDate={getYearAgo()}
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
		</div>
	);
}
