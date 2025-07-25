"use client";
import React, { useState } from "react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";

type Task = RouterOutputs["task"]["getTasksByDate"][number];

export default function TaskList() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const { data: tasks, isLoading, error, refetch } = api.task.getTasksByDate.useQuery(todayISO);

  const setCompleted = api.task.setCompleted.useMutation({ onSuccess: () => refetch() });
  const updateTaskText = api.task.updateTaskText.useMutation({ onSuccess: () => refetch() });
  const deleteTask = api.task.deleteTask.useMutation({ onSuccess: () => refetch() });
  const createTask = api.task.createTask.useMutation({ onSuccess: () => refetch() });

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [newTaskText, setNewTaskText] = useState("");

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditedText(String(task.text));
  };
  const saveEdit = (taskId: string) => {
    if (!editedText.trim()) return;
    updateTaskText.mutate({ id: taskId, text: editedText.trim() });
    setEditingTaskId(null);
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const maxPos = tasks?.reduce((max, t) => Math.max(max, Number(t.position)), -1) ?? -1;
    createTask.mutate({
      text: newTaskText.trim(),
      position: maxPos + 1,
      date: todayISO,
    });
    setNewTaskText("");
  };

  if (isLoading) return <p>Loading tasks...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;
  
  const loadingCreate = createTask.status === "pending";

  return (
    <section>
      <h2>{"Today's Tasks"}</h2>
      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Add a new task"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTask();
            }
          }}
          style={{ padding: 8, width: "300px" }}
          disabled={loadingCreate}
        />
        <button onClick={handleAddTask} disabled={loadingCreate || !newTaskText.trim()}>
          Add
        </button>
      </div>

      {(!tasks || tasks.length === 0) && <p>No tasks for today.</p>}

      <ul>
        {(tasks ?? [])
          .sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return a.position - b.position;
          })
          .map((task) => (
            <li
              key={task.id}
              className={task.completed ? "line-through opacity-60" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
            >
              <input
                type="checkbox"
                checked={!!task.completed}
                onChange={() => setCompleted.mutate({ id: task.id, completed: !task.completed })}
              />
              {editingTaskId === task.id ? (
                <input
                  type="text"
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  onBlur={() => saveEdit(task.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(task.id);
                    else if (e.key === "Escape") setEditingTaskId(null);
                  }}
                  autoFocus
                  style={{ flexGrow: 1 }}
                />
              ) : (
                <span
                  onClick={() => startEditing(task)}
                  style={{ cursor: "pointer", flexGrow: 1 }}
                  title="Click to edit"
                >
                  {String(task.text)}
                </span>
              )}
              <button onClick={() => deleteTask.mutate(task.id)}>Delete</button>
            </li>
          ))}
      </ul>
    </section>
  );
}