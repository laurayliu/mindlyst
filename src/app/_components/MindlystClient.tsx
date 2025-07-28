"use client";
import { useState, useCallback, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { api } from "~/trpc/react";
import type { RouterOutputs } from "~/trpc/react";
import { motion, AnimatePresence } from "motion/react";
import { LuLoader, LuPlus, LuCheck, LuInfo } from "react-icons/lu";
import { FcGoogle } from "react-icons/fc";

// type for extracted task
type ExtractedTask = RouterOutputs["hf"]["extractTasks"]["extractedTasks"][number];
// type for a task sent to google tasks
type SentTask = ExtractedTask & {
  uiId: string;
  status: "idle" | "pending" | "success" | "failed";
  message?: string;
};

export function MindlystClient() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";

  const [taskExtractionInput, setTaskExtractionInput] = useState("");
  const [tasksToProcess, setTasksToProcess] = useState<SentTask[]>([]);
  const [taskExtractionLoading, setTaskExtractionLoading] = useState(false);
  const [taskExtractionError, setTaskExtractionError] = useState<string | null>(null);

  const [addingAllTasksLoading, setAddingAllTasksLoading] = useState(false);
  const [googleTasksOverallError, setGoogleTasksOverallError] = useState<string | null>(null);
  const [googleTasksOverallSuccess, setGoogleTasksOverallSuccess] = useState<string | null>(null);

  const extractTasksMutation = api.hf.extractTasks.useMutation({
    onMutate: () => {
      setTaskExtractionLoading(true);
      setTaskExtractionError(null);
      setTasksToProcess([]);
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

  const createGoogleTaskMutation = api.googleTasks.createTask.useMutation({
    onMutate: (newTaskInput) => {
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
    },
    onError: (err, variables) => {
      setTasksToProcess((prev) =>
        prev.map((task) =>
          task.uiId === variables.uiId
            ? { ...task, status: "failed", message: err.message }
            : task,
        ),
      );
      console.error("Google task creation mutation error for task:", variables.taskTitle, err);
    },
  });

  // effect to manage addingAllTasksLoading and overall messages
  useEffect(() => {
    // if any task is pending
    const anyTaskPending = tasksToProcess.some(t => t.status === "pending");
    setAddingAllTasksLoading(anyTaskPending);

    // only update overall messages if no tasks pending
    if (!anyTaskPending && tasksToProcess.length > 0) {
      const attemptedTasks = tasksToProcess.filter(t => t.status !== "idle");
      const successfulCount = attemptedTasks.filter(t => t.status === "success").length;
      const failedCount = attemptedTasks.filter(t => t.status === "failed").length;

      if (attemptedTasks.length === 0) { // no tasks attempted
        setGoogleTasksOverallSuccess(null);
        setGoogleTasksOverallError(null);
      } else if (successfulCount > 0 && failedCount === 0) {
        setGoogleTasksOverallSuccess(`Successfully added ${successfulCount} tasks to Google tasks!`);
        setGoogleTasksOverallError(null);
      } else if (successfulCount > 0 && failedCount > 0) {
        setGoogleTasksOverallSuccess(`Added ${successfulCount} tasks. ${failedCount} tasks failed. Check specific task statuses.`);
        setGoogleTasksOverallError(null);
      } else if (failedCount > 0 && successfulCount === 0) {
        setGoogleTasksOverallError("All tasks failed to add to Google tasks. Check specific task statuses.");
        setGoogleTasksOverallSuccess(null);
      }
    } else if (tasksToProcess.length === 0) { // no tasks extracted yet
        setGoogleTasksOverallSuccess(null);
        setGoogleTasksOverallError(null);
    }
  }, [tasksToProcess]); // rerun when tasksToProcess changes

  const handleExtractTasks = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = taskExtractionInput.trim();
    if (trimmedInput.length < 50) {
      setTaskExtractionError("Please enter at least 50 characters for effective task extraction");
      return;
    }
    setTaskExtractionError(null);
    extractTasksMutation.mutate({ text: trimmedInput });
  }, [taskExtractionInput, extractTasksMutation]);

  const handleAddTaskToGoogle = useCallback((task: SentTask) => {
    if (task.status === "pending" || task.status === "success") {
      return;
    }

    // update task status in UI
    setTasksToProcess((prev) =>
      prev.map((t) =>
        t.uiId === task.uiId ? { ...t, status: "pending", message: undefined } : t,
      ),
    );

    // call the trpc mutation
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
    setGoogleTasksOverallSuccess(null);
    setGoogleTasksOverallError(null);
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
    // useEffect sets addingAllTasksLoading to true cuz tasksToProcess now contains pending tasks
  }, [tasksToProcess, createGoogleTaskMutation]);

  // animated subheadings
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const phrases = [
    "unload your thoughts",
    "let AI extract your tasks",
    "stay organized with Google tasks"
  ];
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex(prev => (prev + 1) % phrases.length);
    }, 3000); // change every 3 seconds
    
    return () => clearInterval(interval);
  }, [phrases.length]);

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <motion.h1
        className="text-5xl font-extrabold tracking-tight sm:text-[5rem]"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        mind<span className="text-title-accent">lyst</span>
      </motion.h1>

      {/* animating subheading */}
      <div className="h-20 mt-2 flex flex-col items-center justify-center text-center relative">
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-transparent via-title-accent to-transparent rounded-full opacity-60"></div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhraseIndex}
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
            className="text-xl text-muted max-w-2xl px-4 py-2"
          >
            {phrases[currentPhraseIndex]}
          </motion.div>
        </AnimatePresence>

        <div className="flex space-x-2 mt-4">
          {phrases.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentPhraseIndex ? "bg-title-accent" : "bg-muted"
              }`}
              initial={{ scale: 0.8 }}
              animate={{
                scale: index === currentPhraseIndex ? 1.2 : 0.8,
                opacity: index === currentPhraseIndex ? 1 : 0.5
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>

      {/* auth */}
      <motion.div
        className="w-full max-w-2xl rounded-2xl bg-card/80 backdrop-blur-lg p-5 text-center shadow-xl border border-white/10 mt-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FcGoogle className="text-2xl" />
          <div className="text-left">
            <h3 className="text-lg font-semibold text-text">Google tasks sync</h3>
            {status === "loading" ? (
              <p className="text-sm text-muted">checking status...</p>
            ) : isAuthenticated ? (
              <p className="text-sm text-muted">
                connected as <span className="font-medium">{session.user?.name ?? session.user?.email?.split('@')[0]}</span>
              </p>
            ) : (
              <p className="text-sm text-muted">connect to sync tasks</p>
            )}
          </div>
        </div>

          {isAuthenticated ? (
            <motion.button
              onClick={() => signOut()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-error/20 to-error/40 px-4 py-2.5 text-sm font-medium text-error backdrop-blur-sm transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>sign out</span>
            </motion.button>
          ) : (
            <motion.button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary/20 to-primary/40 px-4 py-2.5 text-sm font-medium text-primary backdrop-blur-sm transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span>sign in</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* task extraction */}
      <motion.div
        className="w-full max-w-2xl rounded-2xl bg-card/80 backdrop-blur-lg p-6 shadow-xl border border-white/10 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h2 className="mb-4 text-2xl font-bold text-text">extract tasks from text</h2>

        <form onSubmit={handleExtractTasks} className="flex flex-col gap-4">
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-white/10 bg-card/50 p-4 text-text placeholder:text-muted focus:border-primary focus:ring-primary focus:outline-none transition-colors duration-200 backdrop-blur-sm"
            value={taskExtractionInput}
            onChange={(e) => setTaskExtractionInput(e.target.value)}
            placeholder="enter a paragraph or brainstorm notes to extract tasks (min 50 chars)..."
            disabled={taskExtractionLoading}
            aria-label="enter text for task extraction"
          />

          <motion.button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={taskExtractionLoading || taskExtractionInput.trim().length < 50}
            aria-label={taskExtractionLoading ? "extracting tasks..." : "extract tasks"}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {taskExtractionLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LuLoader className="animate-spin" /> extracting tasks...
              </span>
            ) : (
              "extract tasks"
            )}
          </motion.button>

          {taskExtractionError && (
            <AnimatePresence>
              <motion.p
                className="text-error mt-2 text-sm text-center"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {taskExtractionError}
              </motion.p>
            </AnimatePresence>
          )}
        </form>
        {tasksToProcess.length > 0 && (
          <motion.div
            className="mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="mb-3 text-xl font-bold text-text">Extracted tasks:</h3>
            <ul className="space-y-4">
              <AnimatePresence>
              {tasksToProcess.map((task) => (
                <motion.li
                  key={task.uiId}
                  className="rounded-xl bg-card/60 p-4 shadow-sm border border-white/10 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-lg font-semibold text-text">{task.title}</p>
                  {task.notes && (
                    <p className="mb-2 text-muted text-sm italic">Notes: {task.notes}</p>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    {task.status === "pending" ? (
                      <span className="flex items-center gap-1 font-medium text-warning">
                        <LuLoader className="animate-spin" /> Adding...
                      </span>
                    ) : task.status === "success" ? (
                      <span className="flex items-center gap-1 font-medium text-success">
                        <LuCheck /> Added to Google tasks!
                      </span>
                    ) : task.status === "failed" ? (
                      <span className="flex items-center gap-1 font-medium text-error">
                        <LuInfo /> Failed: {task.message || "Unknown error" /* eslint-disable-line @typescript-eslint/prefer-nullish-coalescing */}
                      </span>
                    ) : ( // task.status === "idle"
                      <motion.button
                        onClick={() => handleAddTaskToGoogle(task)}
                        className="flex items-center gap-1 rounded-xl bg-success px-4 py-2 text-sm font-semibold text-white transition hover:bg-success/80 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!isAuthenticated || addingAllTasksLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <LuPlus /> Add to Google Tasks
                      </motion.button>
                    )}
                  </div>
                </motion.li>
              ))}
              </AnimatePresence>
            </ul>

            {/* Add all taasks button */}
            {tasksToProcess.some(t => t.status === "idle" || t.status === "failed") && (
              <motion.div
                className="mt-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.button
                  onClick={handleAddAllExtractedTasksToGoogle}
                  className="rounded-xl bg-gradient-to-r from-primary to-secondary px-6 py-3 font-semibold text-white transition-all hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!isAuthenticated || addingAllTasksLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {addingAllTasksLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LuLoader className="animate-spin" /> Adding all tasks...
                    </span>
                  ) : (
                    "Add all remaining to Google tasks"
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* status messages with animations */}
            <AnimatePresence>
              {googleTasksOverallSuccess && (
                <motion.p
                  className="text-success mt-4 text-sm text-center"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {googleTasksOverallSuccess}
                </motion.p>
              )}

              {googleTasksOverallError && (
                <motion.p
                  className="text-error mt-4 text-sm text-center"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {googleTasksOverallError}
                </motion.p>
              )}
            </AnimatePresence>

            {!isAuthenticated && (
              <motion.p
                className="text-sm text-warning text-center mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Please sign in with Google to add tasks
              </motion.p>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}