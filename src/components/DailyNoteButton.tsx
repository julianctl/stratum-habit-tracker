interface DailyNoteButtonProps {
	onOpen: (date: string) => void;
}

function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

export default function DailyNoteButton({ onOpen }: DailyNoteButtonProps) {
	return (
		<div className="stratum-daily-note">
			<button className="stratum-btn stratum-btn--full" onClick={() => onOpen(todayStr())}>
				📓 Open today's note
			</button>
		</div>
	);
}
