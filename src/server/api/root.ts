import { taskRouter } from "./routers/task";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { hfRouter } from "./routers/hf";
import { googleTasksRouter } from "./routers/googleTasks";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  task: taskRouter,
  hf: hfRouter,
  googleTasks: googleTasksRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);