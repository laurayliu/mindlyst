"use client";
import { api } from "~/trpc/react";

export default function TaskList() {
  const { data, isLoading, error } = api.task.getAll.useQuery();

  console.log("TODOS: ", data);

  if (isLoading) return <p>Loading tasks...</p>;
  if (error) return <p className="text-red-500">Error: {error.message}</p>;
  if (!data || data.length === 0) return <p>No tasks found.</p>;

  return (
    <div className="flex flex-col gap-2">
      {data.map((task) => (
        <div key={task.id}>{task.text}</div>
      ))}
    </div>
  );
}