import type { FontSize, StickyNote, TextAlign } from '../types';

interface StickyNoteConfigProps {
	note: StickyNote;
	onChange: (patch: Partial<Pick<StickyNote, 'title' | 'content' | 'bgColor' | 'textAlign' | 'fontSize'>>) => void;
}

const TEXT_ALIGNS: { value: TextAlign; label: string }[] = [
	{ value: 'left',   label: 'Left'   },
	{ value: 'center', label: 'Center' },
	{ value: 'right',  label: 'Right'  },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
	{ value: 'small',  label: 'Small'  },
	{ value: 'medium', label: 'Medium' },
	{ value: 'large',  label: 'Large'  },
];

export default function StickyNoteConfig({ note, onChange }: StickyNoteConfigProps) {
	return (
		<div className="stratum-config-panel__content">
			<label className="stratum-config-row stratum-config-row--col">
				<span className="stratum-config-row__label">Title</span>
				<input
					className="stratum-input stratum-config-row__input"
					type="text"
					value={note.title}
					onChange={(e) => onChange({ title: e.target.value })}
					placeholder="Sticky Note"
				/>
			</label>

			<label className="stratum-config-row stratum-config-row--col">
				<span className="stratum-config-row__label">Content</span>
				<textarea
					className="stratum-input stratum-config-row__textarea"
					value={note.content}
					onChange={(e) => onChange({ content: e.target.value })}
					placeholder="Write something…"
					rows={5}
				/>
			</label>

			<label className="stratum-config-row">
				<span className="stratum-config-row__label">Background</span>
				<input
					type="color"
					value={note.bgColor}
					onChange={(e) => onChange({ bgColor: e.target.value })}
					className="stratum-config-row__color"
				/>
			</label>

			<label className="stratum-config-row">
				<span className="stratum-config-row__label">Alignment</span>
				<select
					className="stratum-input stratum-config-row__select"
					value={note.textAlign}
					onChange={(e) => onChange({ textAlign: e.target.value as TextAlign })}
				>
					{TEXT_ALIGNS.map(({ value, label }) => (
						<option key={value} value={value}>{label}</option>
					))}
				</select>
			</label>

			<label className="stratum-config-row">
				<span className="stratum-config-row__label">Font size</span>
				<select
					className="stratum-input stratum-config-row__select"
					value={note.fontSize}
					onChange={(e) => onChange({ fontSize: e.target.value as FontSize })}
				>
					{FONT_SIZES.map(({ value, label }) => (
						<option key={value} value={value}>{label}</option>
					))}
				</select>
			</label>

			<p className="stratum-config-row__hint">Deleting the widget also removes this note's content.</p>
		</div>
	);
}
