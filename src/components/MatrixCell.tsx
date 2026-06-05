import { useRef, useState, type MouseEvent } from 'react';

interface MatrixCellProps {
	habitId: string;
	date: string;
	isCompleted: boolean;
	hasNote: boolean;
	note: string;
	color?: string;
	isToday?: boolean;
	onToggle: () => void;
	onSetNote: (note: string) => void;
}

export default function MatrixCell({ isCompleted, hasNote, note, color, isToday, onToggle, onSetNote }: MatrixCellProps) {
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(note);
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	function openNote(e: MouseEvent) {
		e.preventDefault();
		setDraft(note);
		setEditing(true);
		window.setTimeout(() => textareaRef.current?.focus(), 0);
	}

	function commitNote() {
		onSetNote(draft);
		setEditing(false);
	}

	return (
		<div
			className={`stratum-cell ${isCompleted ? 'stratum-cell--done' : ''} ${isToday ? 'stratum-cell--today-col' : ''}`}
			onClick={onToggle}
			onContextMenu={openNote}
			title="Click to toggle · Right-click to add note"
			style={isCompleted && color ? { background: color, borderColor: color } : undefined}
		>
			{hasNote && <span className="stratum-cell__note-dot" />}
			{editing && (
				<div className="stratum-cell__note-popover" onClick={(e) => e.stopPropagation()}>
					<textarea
						ref={textareaRef}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onBlur={commitNote}
						onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitNote(); } if (e.key === 'Escape') setEditing(false); }}
						placeholder="Add a note..."
						rows={3}
					/>
				</div>
			)}
		</div>
	);
}
