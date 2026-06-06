import { type MouseEvent } from 'react';

interface MatrixCellProps {
	date: string;
	isCompleted: boolean;
	hasNote: boolean;
	color?: string;
	isToday?: boolean;
	onToggle: () => void;
	onOpenNote: (clientX: number, clientY: number) => void;
}

export default function MatrixCell({ isCompleted, hasNote, color, isToday, onToggle, onOpenNote }: MatrixCellProps) {
	function handleContextMenu(e: MouseEvent) {
		if (!isCompleted) return;
		e.preventDefault();
		onOpenNote(e.clientX, e.clientY);
	}

	return (
		<div
			className={`stratum-cell ${isCompleted ? 'stratum-cell--done' : ''} ${isToday ? 'stratum-cell--today-col' : ''}`}
			onClick={onToggle}
			onContextMenu={handleContextMenu}
			title={isCompleted ? 'Click to toggle · Right-click to add note' : 'Click to mark done'}
			style={isCompleted && color ? { background: color, borderColor: color } : undefined}
		>
			{hasNote && <span className="stratum-cell__note-dot" />}
		</div>
	);
}
