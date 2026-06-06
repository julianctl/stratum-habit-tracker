import { todayISO } from '../utils';

interface DailyNoteButtonProps {
	onOpen: (date: string) => void;
}

export default function DailyNoteButton({ onOpen }: DailyNoteButtonProps) {
	return (
		<div className="stratum-daily-note">
			<button className="stratum-btn stratum-btn--full" onClick={() => onOpen(todayISO())}>
				📓 Open today's note
			</button>
		</div>
	);
}
