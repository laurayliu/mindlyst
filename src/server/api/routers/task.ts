import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";


export const taskRouter = createTRPCRouter({
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.task.findMany();
  }),
});