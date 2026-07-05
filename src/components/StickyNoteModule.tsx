import type { StickyNote } from '../types';

const FONT_SIZE_MAP: Record<StickyNote['fontSize'], string> = {
	small:  'var(--font-ui-smaller)',
	medium: 'var(--font-ui-small)',
	large:  'var(--font-text-size)',
};

// Returns perceived luminance [0,1] of a hex color using WCAG relative luminance.
function luminance(hex: string): number {
	const raw = hex.replace('#', '');
	const r = parseInt(raw.slice(0, 2), 16) / 255;
	const g = parseInt(raw.slice(2, 4), 16) / 255;
	const b = parseInt(raw.slice(4, 6), 16) / 255;
	const lin = (c: number) => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

interface StickyNoteModuleProps {
	note: StickyNote;
}

export default function StickyNoteModule({ note }: StickyNoteModuleProps) {
	const textColor = luminance(note.bgColor) < 0.35 ? '#ffffff' : '#000000';
	return (
		<div
			className="stratum-sticky"
			style={{ background: note.bgColor }}
		>
			<p
				className="stratum-sticky__content"
				style={{
					textAlign: note.textAlign,
					fontSize: FONT_SIZE_MAP[note.fontSize],
					color: textColor,
				}}
			>
				{note.content || <span className="stratum-sticky__placeholder" style={{ color: textColor, opacity: 0.4 }}>No content — configure in the gear menu.</span>}
			</p>
		</div>
	);
}
