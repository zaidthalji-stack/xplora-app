import React from 'react';

export default function Plan({ t }: any) {
  const rawTodos = t?.toolInvocation?.args?.todos;
  const todos = Array.isArray(rawTodos) ? rawTodos : rawTodos ? [rawTodos] : [];

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Plan</h2>
      {todos.length === 0 ? (
        <p>No todos found.</p>
      ) : (
        <ul>
          {todos.map((todo, i) => (
            <li key={i}>
              {typeof todo === 'string' ? todo : JSON.stringify(todo)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
