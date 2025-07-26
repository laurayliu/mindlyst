// src/app/_components/MindlystClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react"; // Correct import path
import { LuLoader, LuPlus, LuCheck, LuInfo } from "react-icons/lu";

// Define type for ExtractedTask
type ExtractedTask = RouterOutputs["hf"]["extractTasks"]["extractedTasks"][number];

// Define type for a task that has been sent to Google Tasks (for UI state)
type SentTask = ExtractedTask & {
  uiId: string; // Add a unique UI ID for stable rendering and tracking
  status: "idle" | "pending" | "success" | "failed"; // 'idle' for not yet attempted
  message?: string;
};

export function MindlystClient() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  // --- State for Task Extraction & Google Tasks ---
  const [taskExtractionInput, setTaskExtractionInput] = useState("");
  const [tasksToProcess, setTasksToProcess] = useState<SentTask[]>([]);
  const [taskExtractionLoading, setTaskExtractionLoading] = useState(false);
  const [taskExtractionError, setTaskExtractionError] = useState<string | null>(null);
  const [googleTasksOverallLoading, setGoogleTasksOverallLoading] = useState(false);
  const [googleTasksOverallError, setGoogleTasksOverallError] = useState<string | null>(null);
  const [googleTasksOverallSuccess, setGoogleTasksOverallSuccess] = useState<string | null>(null);

  // tRPC mutation for AI Task Extraction
  const extractTasksMutation = api.hf.extractTasks.useMutation({
    onMutate: () => {
      setTaskExtractionLoading(true);
      setTaskExtractionError(null);
      setTasksToProcess([]); // Clear previous tasks
      setGoogleTasksOverallSuccess(null);
      setGoogleTasksOverallError(null);
    },
    onSuccess: (data) => {
      if (data.success && data.extractedTasks) {
        setTasksToProcess(data.extractedTasks.map(task => ({
          ...task,
          uiId: crypto.randomUUID(),
          status: "idle"
        })));
        setTaskExtractionInput("");
      } else {
        setTaskExtractionError("AI failed to extract tasks. Please refine your input.");
      }
    },
    onError: (err) => {
      setTaskExtractionError(`AI Error: ${err.message}`);
      console.error("AI Extraction Mutation Error:", err);
    },
    onSettled: () => {
      setTaskExtractionLoading(false);
    },
  });

  // tRPC mutation for creating Google Tasks
  const createGoogleTaskMutation = api.googleTasks.createTask.useMutation({
    onMutate: (newTaskInput) => {
      setGoogleTasksOverallLoading(true);
      setGoogleTasksOverallError(null);
      setGoogleTasksOverallSuccess(null);
      setTasksToProcess((prev) =>
        prev.map((task) =>
          task.uiId === newTaskInput.uiId
            ? { ...task, status: "pending", message: undefined }
            : task,
        ),
      );
    },
    onSuccess: (data, variables) => {
      setTasksToProcess((prev) =>
        prev.map((task) =>
          task.uiId === variables.uiId
            ? { ...task, status: "success", message: data.message }
            : task,
        ),
      );
      const allTasksProcessed = tasksToProcess.every(t => t.status !== "pending");
      if (allTasksProcessed) {
        setGoogleTasksOverallLoading(false);
        const successfulCount = tasksToProcess.filter(t => t.status === "success").length;
        const failedCount = tasksToProcess.filter(t => t.status === "failed").length;
        
        if (successfulCount > 0 && failedCount === 0) {
            setGoogleTasksOverallSuccess(`Successfully added all ${successfulCount} tasks to Google Tasks!`);
        } else if (successfulCount > 0 && failedCount > 0) {
            setGoogleTasksOverallSuccess(`Added ${successfulCount} tasks. ${failedCount} tasks failed. Check specific task statuses.`);
            setGoogleTasksOverallError(null);
        } else if (failedCount > 0 && successfulCount === 0) {
             setGoogleTasksOverallError("All tasks failed to add to Google Tasks. Check specific task statuses.");
             setGoogleTasksOverallSuccess(null);
        }
      }
    },
    onError: (err, variables) => {
      setTasksToProcess((prev) =>
        prev.map((task) =>
          task.uiId === variables.uiId
            ? { ...task, status: "failed", message: err.message }
            : task,
        ),
      );
      if (!googleTasksOverallSuccess) {
          setGoogleTasksOverallError(`Failed to add task "${variables.taskTitle}": ${err.message}`);
      }
      console.error("Google Task Creation Mutation Error for task:", variables.taskTitle, err);
      const allTasksProcessed = tasksToProcess.every(t => t.status !== "pending");
      if (allTasksProcessed) {
        setGoogleTasksOverallLoading(false);
        const successfulCount = tasksToProcess.filter(t => t.status === "success").length;
        const failedCount = tasksToProcess.filter(t => t.status === "failed").length;
        
        if (successfulCount > 0 && failedCount === 0) {
            setGoogleTasksOverallSuccess(`Successfully added all ${successfulCount} tasks to Google Tasks!`);
        } else if (successfulCount > 0 && failedCount > 0) {
            setGoogleTasksOverallSuccess(`Added ${successfulCount} tasks. ${failedCount} tasks failed. Check specific task statuses.`);
            setGoogleTasksOverallError(null);
        } else if (failedCount > 0 && successfulCount === 0) {
             setGoogleTasksOverallError("All tasks failed to add to Google Tasks. Check specific task statuses.");
             setGoogleTasksOverallSuccess(null);
        }
      }
    },
  });

  // --- Handlers ---
 
  const handleExtractTasks = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = taskExtractionInput.trim();
    if (trimmedInput.length < 50) {
      setTaskExtractionError("Please enter at least 50 characters for effective task extraction.");
      return;
    }
    setTaskExtractionError(null);
    extractTasksMutation.mutate({ text: trimmedInput });
  }, [taskExtractionInput, extractTasksMutation]);

  const handleAddTaskToGoogle = useCallback((task: SentTask) => {
    if (task.status === "pending" || task.status === "success") {
      return;
    }
    setTasksToProcess((prev) =>
      prev.map((t) =>
        t.uiId === task.uiId ? { ...t, status: "pending", message: undefined } : t,
      ),
    );
    createGoogleTaskMutation.mutate({
      taskTitle: task.title,
      taskNotes: task.notes,
      uiId: task.uiId,
    });
  }, [createGoogleTaskMutation]);

  const handleAddAllExtractedTasksToGoogle = useCallback(() => {
    const tasksToProcessNow = tasksToProcess.filter(t => t.status === "idle" || t.status === "failed");
    if (tasksToProcessNow.length === 0) {
      setGoogleTasksOverallError("No tasks available to add or all have been processed.");
      return;
    }
    setGoogleTasksOverallLoading(true);
    setGoogleTasksOverallError(null);
    setGoogleTasksOverallSuccess(null);
    setTasksToProcess(prevTasks =>
        prevTasks.map(task => {
            if (tasksToProcessNow.some(t => t.uiId === task.uiId)) {
                return { ...task, status: "pending", message: undefined };
            }
            return task;
        })
    );
    tasksToProcessNow.forEach(task => {
        createGoogleTaskMutation.mutate({
            taskTitle: task.title,
            taskNotes: task.notes,
            uiId: task.uiId,
        });
    });
  }, [tasksToProcess, createGoogleTaskMutation]);

  return (
    <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
      <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-[5rem]">
        Mind<span className="text-[hsl(200,80%,70%)]">lyst</span>
      </h1>
      <p className="text-lg text-gray-300 text-center">
        Unload your thoughts, let AI extract your tasks, and manage them with Google Tasks.
      </p>

      {/* Auth Section */}
      <div className="w-full max-w-2xl rounded-lg bg-gray-800 p-6 text-center shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-white">Google Tasks Integration</h2>
        {status === "loading" ? (
          <p className="text-gray-400">Loading authentication status...</p>
        ) : isAuthenticated ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg text-white">
              Signed in as <span className="font-semibold">{session.user?.name || session.user?.email /* eslint-disable-line @typescript-eslint/prefer-nullish-coalescing */}</span>
            </p>
            <button
              onClick={() => signOut()}
              className="rounded-lg bg-red-600 px-6 py-2 font-semibold text-white transition hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-lg text-white">Sign in to sync tasks with Google.</p>
            <button
              onClick={() => signIn("google")}
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              Sign In with Google
            </button>
          </div>
        )}
      </div>

      {/* Task Extraction Section (remains the main feature) */}
      <div className="w-full max-w-2xl rounded-lg bg-gray-800 p-6 shadow-xl">
        <h2 className="mb-4 text-2xl font-bold text-white">Extract Tasks from Text</h2>
        <form onSubmit={handleExtractTasks} className="flex flex-col gap-4">
          <textarea
            className="min-h-[120px] w-full rounded-md border border-gray-600 bg-gray-700 p-3 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-blue-500 focus:outline-none transition-colors duration-200"
            value={taskExtractionInput}
            onChange={(e) => setTaskExtractionInput(e.target.value)}
            placeholder="Enter a paragraph or brainstorm notes to extract tasks (min 50 chars)... E.g., 'I need to prepare for the meeting next week, that means creating an agenda and emailing it by Tuesday. Also, I should research new project management tools. Oh, and pick up dry cleaning by Friday.'"
            disabled={taskExtractionLoading}
            aria-label="Enter text for task extraction"
          />
          <button
            type="submit"
            className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={taskExtractionLoading || taskExtractionInput.trim().length < 50}
            aria-label={taskExtractionLoading ? "Extracting tasks..." : "Extract Tasks"}
          >
            {taskExtractionLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LuLoader className="animate-spin" /> Extracting Tasks...
              </span>
            ) : (
              "Extract Tasks"
            )}
          </button>
          {taskExtractionError && <p className="text-red-400 mt-2 text-sm text-center">{taskExtractionError}</p>}
        </form>

        {tasksToProcess.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-xl font-bold text-white">Extracted Tasks:</h3>
            <ul className="space-y-4">
              {tasksToProcess.map((task) => (
                <li key={task.uiId} className="rounded-md bg-gray-700 p-4 shadow-sm border border-gray-600">
                  <p className="text-lg font-semibold text-white">{task.title}</p>
                  {task.notes && (
                    <p className="mb-2 text-gray-300 text-sm italic">Notes: {task.notes}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {task.status === "pending" ? (
                      <span className="flex items-center gap-1 font-medium text-yellow-400">
                        <LuLoader className="animate-spin" /> Adding...
                      </span>
                    ) : task.status === "success" ? (
                      <span className="flex items-center gap-1 font-medium text-green-400">
                        <LuCheck /> Added to Google Tasks!
                      </span>
                    ) : task.status === "failed" ? (
                      <span className="flex items-center gap-1 font-medium text-red-400">
                        <LuInfo /> Failed: {task.message || "Unknown error" /* eslint-disable-line @typescript-eslint/prefer-nullish-coalescing */}
                      </span>
                    ) : ( // task.status === "idle"
                      <button
                        onClick={() => handleAddTaskToGoogle(task)}
                        className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isAuthenticated || googleTasksOverallLoading}
                      >
                        <LuPlus /> Add to Google Tasks
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {/* Add All Tasks Button */}
            {tasksToProcess.some(t => t.status === "idle" || t.status === "failed") && (
                <div className="mt-6 text-center">
                    <button
                        onClick={handleAddAllExtractedTasksToGoogle}
                        className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isAuthenticated || googleTasksOverallLoading}
                    >
                        {googleTasksOverallLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <LuLoader className="animate-spin" /> Adding All Tasks...
                            </span>
                        ) : (
                            "Add All Remaining to Google Tasks"
                        )}
                    </button>
                </div>
            )}
            {googleTasksOverallSuccess && <p className="text-green-400 mt-4 text-sm text-center">{googleTasksOverallSuccess}</p>}
            {googleTasksOverallError && <p className="text-red-400 mt-4 text-sm text-center">{googleTasksOverallError}</p>}
            {!isAuthenticated && (
                <p className="text-sm text-yellow-400 text-center mt-4">
                    Please sign in with Google to add tasks.
                </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}