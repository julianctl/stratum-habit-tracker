import { cloneElement, useEffect, useMemo, useRef, type ReactElement, type SVGProps } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import type { Habit, HabitLog } from '../types';

interface HabitHeatmapProps {
	habits: Habit[];
	logs: HabitLog[];
	color: string;
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

export default function HabitHeatmap({ habits, logs, color }: HabitHeatmapProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const values = useMemo(() => {
		const counts = new Map<string, number>();
		for (const log of logs) {
			counts.set(log.date, (counts.get(log.date) ?? 0) + 1);
		}
		return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
	}, [logs]);

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

	const total = habits.length;

	return (
		<div className="stratum-heatmap">
			<style>{`
				.stratum-heatmap rect.stratum-heatmap__cell--1 { fill: ${color} !important; opacity: 0.25; }
				.stratum-heatmap rect.stratum-heatmap__cell--2 { fill: ${color} !important; opacity: 0.50; }
				.stratum-heatmap rect.stratum-heatmap__cell--3 { fill: ${color} !important; opacity: 0.75; }
				.stratum-heatmap rect.stratum-heatmap__cell--4 { fill: ${color} !important; opacity: 1.0; }
			`}</style>
			<h3 className="stratum-section-title">Year Overview</h3>
			<div className="stratum-heatmap__scroll" ref={scrollRef}>
				<CalendarHeatmap
					startDate={getYearAgo()}
					endDate={new Date()}
					values={values}
					classForValue={(value) => levelClass(Number(value?.count ?? 0), total)}
					showWeekdayLabels
					transformDayElement={(el) =>
						cloneElement(el as unknown as ReactElement<SVGProps<SVGRectElement>>, { rx: 2, ry: 2 })
					}
				/>
			</div>
		</div>
	);
}
