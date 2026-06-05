import { useState } from 'react';
import type { Todo } from '../types';

interface TodoPanelProps {
	todos: Todo[];
	onAddTodo: (title: string) => void;
	onToggleTodo: (id: string) => void;
	onDeleteTodo: (id: string) => void;
}

export default function TodoPanel({ todos, onAddTodo, onToggleTodo, onDeleteTodo }: TodoPanelProps) {
	const [input, setInput] = useState('');

	function submit() {
		const title = input.trim();
		if (!title) return;
		onAddTodo(title);
		setInput('');
	}

	return (
		<div className="stratum-todos">
			<h3 className="stratum-section-title">Todos</h3>
			<div className="stratum-todos__input-row">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
					placeholder="Add a todo..."
					className="stratum-input"
				/>
				<button className="stratum-btn" onClick={submit}>+</button>
			</div>
			<ul className="stratum-todos__list">
				{todos.map((todo) => (
					<li key={todo.id} className={`stratum-todo-item ${todo.completed ? 'stratum-todo-item--done' : ''}`}>
						<input
							type="checkbox"
							checked={todo.completed}
							onChange={() => onToggleTodo(todo.id)}
						/>
						<span className="stratum-todo-item__title">{todo.title}</span>
						<button className="stratum-todo-item__delete" onClick={() => onDeleteTodo(todo.id)}>×</button>
					</li>
				))}
			</ul>
		</div>
	);
}
