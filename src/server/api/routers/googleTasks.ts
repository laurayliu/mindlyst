import { z } from "zod";
import { google } from "googleapis";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { env } from "~/env.js";

// for type safety
interface GoogleAPIErrorResponse {
    status?: number; // http status code
    data?: unknown;
}
interface GoogleAPIError extends Error {
    code?: string | number; // can also be string
    response?: GoogleAPIErrorResponse; // for GaxiosError
}

export const googleTasksRouter = createTRPCRouter({
  createTask: protectedProcedure
    .input(
      z.object({
        taskTitle: z.string().min(1, "Task title cannot be empty"),
        taskNotes: z.string().optional(),
        uiId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.accessToken) {
        throw new Error("User not authenticated or access token missing");
      }
      try {
        const authClient = new google.auth.OAuth2( //create oauth2 client w user access token
          env.GOOGLE_CLIENT_ID,
          env.GOOGLE_CLIENT_SECRET,
        );
        authClient.setCredentials({ access_token: ctx.session.accessToken });
        const tasksApi = google.tasks({ version: "v1", auth: authClient });

        const today = new Date(); // due date is current day cuz get it done bro
        const dueDate = today.toISOString().split('T')[0] + 'T23:59:59.000Z'; 

        const response = await tasksApi.tasks.insert({
          tasklist: "@default",
          requestBody: {
            title: input.taskTitle,
            notes: input.taskNotes,
            status: "needsAction", // not completed yet
            due: dueDate,
          },
        });

        if (response.status === 200 && response.data) {
          console.log("Google task created:", response.data.title);
          return {
            success: true,
            taskId: response.data.id,
            taskTitle: response.data.title,
            message: `Task "${response.data.title}" created successfully`,
            uiId: input.uiId,
          };
        } else {
          console.error("Failed to create google task, unexpected API response structure", response.data);
          throw new Error("Failed to create google task, unexpected API response");
        }
      } catch (error: unknown) {
        console.error("Error creating google task:", error);
        
        const googleError = error as GoogleAPIError;

        if (googleError.response?.status === 401 || googleError.response?.status === 403) {
            throw new Error("Authentication error with Google tasks API. Please sign in again");
        }
        if (typeof googleError.code === 'number' && (googleError.code === 401 || googleError.code === 403)) {
             throw new Error("Authentication error with Google tasks API. Please sign in again");
        }
        // general
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        throw new Error(`Failed to create Google task: ${errorMessage}`);
      }
    }),
});