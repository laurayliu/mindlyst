// src/server/api/routers/googleTasks.ts
import { z } from "zod";
import { google } from "googleapis"; // Import the googleapis library
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env.js"; // Changed from env.js to env.mjs as per your setup

// Define a custom interface for Google API errors to improve type safety
interface GoogleAPIErrorResponse {
    status?: number; // HTTP status code
    data?: unknown; // Response body
}
interface GoogleAPIError extends Error {
    code?: string | number; // This can be a string (e.g., 'EAUTH') or a number (HTTP status code)
    response?: GoogleAPIErrorResponse; // For Gaxios errors
}

export const googleTasksRouter = createTRPCRouter({
  createTask: protectedProcedure // Make this a protected procedure as it requires auth
    .input(
      z.object({
        taskTitle: z.string().min(1, "Task title cannot be empty"),
        taskNotes: z.string().optional(),
        uiId: z.string(), // <--- THIS LINE IS CRUCIAL: ADD IT HERE
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Ensure user is authenticated and has an access token
      if (!ctx.session?.accessToken) {
        throw new Error("User not authenticated or access token missing.");
      }
      try {
        // Create an OAuth2 client with the user's access token
        const auth = new google.auth.OAuth2(
          env.GOOGLE_CLIENT_ID,
          env.GOOGLE_CLIENT_SECRET,
        );
        auth.setCredentials({ access_token: ctx.session.accessToken });
        const tasksApi = google.tasks({ version: "v1", auth });
        // Get the current date in YYYY-MM-DD format for the due date
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0"); // Month is 0-indexed
        const day = String(today.getDate()).padStart(2, "0");
        const dueDate = `${year}-${month}-${day}T23:59:59.000Z`; // Set to end of day UTC
        const response = await tasksApi.tasks.insert({
          tasklist: "@default", // Use the default task list
          requestBody: {
            title: input.taskTitle,
            notes: input.taskNotes,
            status: "needsAction", // Mark as not completed
            due: dueDate, // Set due date
          },
        });
        if (response.status === 200 && response.data) {
          console.log("Task created:", response.data.title);
          return {
            success: true,
            taskId: response.data.id,
            taskTitle: response.data.title,
            message: `Task "${response.data.title}" created successfully!`,
            uiId: input.uiId, // <--- AND THIS LINE IS CRUCIAL: ADD IT TO THE RETURN OBJECT
          };
        } else {
          // This case usually means response.ok was false, but sometimes API might return non-200 with data
          console.error("Failed to create task response:", response.data);
          throw new Error("Failed to create Google Task.");
        }
      } catch (error: unknown) { // Explicitly declare error as unknown
        console.error("Error creating Google Task:", error);
        // Safely check for properties on the error object
        const googleError = error as GoogleAPIError; // Assert as our custom interface for convenience
        // Check if it's a Google API error with a status code
        if (googleError.response?.status === 401 || googleError.response?.status === 403) {
            throw new Error("Authentication error with Google Tasks API. Please sign in again.");
        }
        // Also check for a top-level `code` property, which can sometimes be an HTTP status code
        // or a specific error string from Node.js (e.g., 'ECONNREFUSED' for network errors)
        if (typeof googleError.code === 'number' && (googleError.code === 401 || googleError.code === 403)) {
             throw new Error("Authentication error with Google Tasks API. Please sign in again.");
        }

        // Fallback for general Error objects or unknown types
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        throw new Error(`Failed to create Google Task: ${errorMessage}`);
      }
    }),
});