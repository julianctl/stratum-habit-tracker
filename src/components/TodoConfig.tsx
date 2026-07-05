interface TodoConfigProps {
	completedCount: number;
	showCompleted: boolean;
	onSetShowCompleted: (v: boolean) => void;
	onDeleteCompleted: () => void;
}

export default function TodoConfig({ completedCount, showCompleted, onSetShowCompleted, onDeleteCompleted }: TodoConfigProps) {
	return (
		<div className="stratum-config-panel__content">
			<label className="stratum-config-row">
				<span className="stratum-config-row__label">Show completed</span>
				<input
					type="checkbox"
					checked={showCompleted}
					onChange={(e) => onSetShowCompleted(e.target.checked)}
				/>
			</label>
			<button
				className="stratum-config-row__danger-btn"
				disabled={completedCount === 0}
				onClick={onDeleteCompleted}
			>
				Delete completed ({completedCount})
			</button>
		</div>
	);
}
