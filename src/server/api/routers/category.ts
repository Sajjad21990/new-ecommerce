import { z } from "zod";
import { eq, and, isNull, asc } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { categories } from "@/server/db/schema";

export const categoryRouter = createTRPCRouter({
  // Get all categories (hierarchical)
  getAll: publicProcedure.query(async ({ ctx }) => {
    const allCategories = await ctx.db.query.categories.findMany({
      where: eq(categories.isActive, true),
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
    });

    // Build hierarchy
    const rootCategories = allCategories.filter((c) => !c.parentId);
    const childrenMap = new Map<string, typeof allCategories>();

    allCategories.forEach((cat) => {
      if (cat.parentId) {
        const existing = childrenMap.get(cat.parentId) || [];
        existing.push(cat);
        childrenMap.set(cat.parentId, existing);
      }
    });

    return rootCategories.map((root) => ({
      ...root,
      children: childrenMap.get(root.id) || [],
    }));
  }),

  // Get single category by slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.categories.findFirst({
        where: and(eq(categories.slug, input.slug), eq(categories.isActive, true)),
        with: {
          children: {
            where: eq(categories.isActive, true),
            orderBy: [asc(categories.sortOrder)],
          },
          parent: true,
        },
      });
    }),

  // Get root categories (for mega menu)
  getRootCategories: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.categories.findMany({
      where: and(eq(categories.isActive, true), isNull(categories.parentId)),
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
      with: {
        children: {
          where: eq(categories.isActive, true),
          orderBy: [asc(categories.sortOrder)],
        },
      },
    });
  }),

  // Admin: Create category
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        description: z.string().optional(),
        image: z.string().url().optional(),
        parentId: z.string().uuid().nullable().optional(),
        sortOrder: z.number().default(0),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [newCategory] = await ctx.db
        .insert(categories)
        .values(input)
        .returning();

      return newCategory;
    }),

  // Admin: Update category
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        slug: z.string().min(1).optional(),
        description: z.string().optional(),
        image: z.string().url().nullable().optional(),
        parentId: z.string().uuid().nullable().optional(),
        sortOrder: z.number().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [updatedCategory] = await ctx.db
        .update(categories)
        .set(updateData)
        .where(eq(categories.id, id))
        .returning();

      return updatedCategory;
    }),

  // Admin: Delete category
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),

  // Admin: List all categories (flat)
  adminList: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.categories.findMany({
      orderBy: [asc(categories.sortOrder), asc(categories.name)],
      with: {
        parent: {
          columns: { id: true, name: true },
        },
      },
    });
  }),
});
