import { useEffect, useRef, useState, type SVGProps } from 'react';
import type { Todo } from '../types';

interface TodoModuleProps {
	todos: Todo[];
	showCompleted: boolean;
	onAdd: (title: string, dueDate?: string) => void;
	onToggle: (id: string) => void;
	onDelete: (id: string) => void;
}

function IconX(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
		</svg>
	);
}

function IconPlus(props: SVGProps<SVGSVGElement>) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
			<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
		</svg>
	);
}

export default function TodoModule({ todos, showCompleted, onAdd, onToggle, onDelete }: TodoModuleProps) {
	const [drafting, setDrafting] = useState(false);
	const [draft, setDraft] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (drafting) inputRef.current?.focus();
	}, [drafting]);

	function startDraft() {
		setDraft('');
		setDrafting(true);
	}

	function commit() {
		const title = draft.trim();
		if (title) onAdd(title);
		setDrafting(false);
		setDraft('');
	}

	function cancel() {
		setDrafting(false);
		setDraft('');
	}

	const pending = todos.filter((t) => !t.completed);
	const done = showCompleted ? todos.filter((t) => t.completed) : [];

	return (
		<div className="stratum-todos">
			<div className="stratum-todos__list-wrap">
				{todos.length === 0 && !drafting && (
					<p className="stratum-todos__empty">No tasks yet.</p>
				)}
				{pending.length > 0 && (
					<ul className="stratum-todos__list">
						{pending.map((todo) => (
							<TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
						))}
					</ul>
				)}
				{done.length > 0 && (
					<>
						{pending.length > 0 && <div className="stratum-todos__divider" />}
						<ul className="stratum-todos__list">
							{done.map((todo) => (
								<TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
							))}
						</ul>
					</>
				)}
				{drafting && (
					<div className="stratum-todo-item stratum-todo-item--draft">
						<input type="checkbox" disabled />
						<input
							ref={inputRef}
							className="stratum-todo-item__draft-input"
							type="text"
							placeholder="Task name…"
							value={draft}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') commit();
								if (e.key === 'Escape') cancel();
							}}
							onBlur={commit}
						/>
					</div>
				)}
				<button className="stratum-matrix__footer-btn stratum-todos__add-btn" onClick={startDraft}>
					<IconPlus /> New Task
				</button>
			</div>
		</div>
	);
}

function TodoItem({ todo, onToggle, onDelete }: { todo: Todo; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
	return (
		<li className={`stratum-todo-item${todo.completed ? ' stratum-todo-item--done' : ''}`}>
			<input
				type="checkbox"
				checked={todo.completed}
				onChange={() => onToggle(todo.id)}
			/>
			<span className="stratum-todo-item__title" title={todo.title}>{todo.title}</span>
			{todo.dueDate && <span className="stratum-todo-item__due">{todo.dueDate}</span>}
			<button className="stratum-todo-item__delete" onClick={() => onDelete(todo.id)} title="Delete">
				<IconX />
			</button>
		</li>
	);
}
