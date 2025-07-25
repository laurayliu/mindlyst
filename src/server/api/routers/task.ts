import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc"; // protected because user operations

import { env } from "~/env";


// Input for creating a task
// userId is not passed from client, infer from session instead for security
const createTaskInput = z.object({
  text: z.string().min(1, "Task text is required"),
  position: z.number().int().nonnegative(),    // index for ordering
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" }),
});

// Input for updating "completed" status
const setCompletedInput = z.object({
  id: z.string(),        // task id
  completed: z.boolean(),
});

// Input for updating task text
const updateTaskTextInput = z.object({
  id: z.string(),
  text: z.string().min(1),
});

// Input for deleting task
const deleteTaskInput = z.string();

export const taskRouter = createTRPCRouter({
  
  // Get all tasks for the user on a specific date (date YYYY-MM-DD string)
  getTasksByDate: protectedProcedure
    .input(z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date" }))
    .query(async ({ ctx, input }) => {
      const date = new Date(input);
      date.setHours(0, 0, 0, 0);

      const tasks = await ctx.db.task.findMany({
        where: {
          userId: ctx.session.user.id,
          date,
        },
        orderBy: [{ completed: "asc" }, { position: "asc" }],
      });

      return tasks;
    }),

  // Create a new task for the logged-in user
  createTask: protectedProcedure.input(createTaskInput).mutation(async ({ ctx, input }) => {
    const date = new Date(input.date);
    date.setHours(0, 0, 0, 0);

    const task = await ctx.db.task.create({
      data: {
        userId: ctx.session.user.id,
        text: input.text,
        completed: false,
        position: input.position,
        date,
      },
    });

    return task;
  }),

  // Update task completed status
  setCompleted: protectedProcedure.input(setCompletedInput).mutation(async ({ ctx, input }) => {
    const task = await ctx.db.task.update({
      where: { id: input.id },
      data: { completed: input.completed },
    });
    return task;
  }),

  // Update task text/title
  updateTaskText: protectedProcedure.input(updateTaskTextInput).mutation(async ({ ctx, input }) => {
    const task = await ctx.db.task.update({
      where: { id: input.id },
      data: { text: input.text },
    });
    return task;
  }),

  // Delete task by id
  deleteTask: protectedProcedure.input(deleteTaskInput).mutation(async ({ ctx, input }) => {
    const task = await ctx.db.task.delete({
      where: { id: input },
    });
    return task;
  }),

  // Bulk reorder tasks (send array of {id, position})
  reorderTasks: protectedProcedure
    .input(z.array(z.object({ id: z.string(), position: z.number().int() })))
    .mutation(async ({ ctx, input }) => {
      // Update all positions atomically
      await ctx.db.$transaction(
        input.map(({ id, position }) =>
          ctx.db.task.update({
            where: { id },
            data: { position },
          })
        )
      );
      return true;
    }),
});

