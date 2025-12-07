import { z } from "zod";
import { eq, asc } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { brands } from "@/server/db/schema";

export const brandRouter = createTRPCRouter({
  // Get all active brands
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.brands.findMany({
      where: eq(brands.isActive, true),
      orderBy: asc(brands.name),
    });
  }),

  // Get brand by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.brands.findFirst({
        where: eq(brands.slug, input.slug),
      });
    }),

  // Admin: Create brand
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        logo: z.string().url().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newBrand] = await ctx.db.insert(brands).values(input).returning();
      return newBrand;
    }),

  // Admin: Update brand
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        logo: z.string().url().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      const [updatedBrand] = await ctx.db
        .update(brands)
        .set(updateData)
        .where(eq(brands.id, id))
        .returning();
      return updatedBrand;
    }),

  // Admin: Delete brand
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(brands).where(eq(brands.id, input.id));
      return { success: true };
    }),

  // Admin: List all brands
  adminList: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.brands.findMany({
      orderBy: asc(brands.name),
    });
  }),
});
