import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { sizeGuides, categories } from "@/server/db/schema";

const measurementSchema = z.object({
  label: z.string(), // e.g., "Chest", "Waist", "Length"
  sizes: z.record(z.string(), z.string()), // e.g., { "S": "36", "M": "38", "L": "40" }
});

export const sizeGuideRouter = createTRPCRouter({
  // Public: Get size guide by category
  getByCategory: publicProcedure
    .input(z.object({ categoryId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const guide = await ctx.db.query.sizeGuides.findFirst({
        where: eq(sizeGuides.categoryId, input.categoryId),
        with: {
          category: {
            columns: { id: true, name: true },
          },
        },
      });

      return guide;
    }),

  // Public: Get size guide by ID
  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const guide = await ctx.db.query.sizeGuides.findFirst({
        where: eq(sizeGuides.id, input.id),
        with: {
          category: {
            columns: { id: true, name: true },
          },
        },
      });

      if (!guide) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Size guide not found" });
      }

      return guide;
    }),

  // Admin: Get all size guides
  getAll: adminProcedure.query(async ({ ctx }) => {
    const guides = await ctx.db.query.sizeGuides.findMany({
      with: {
        category: {
          columns: { id: true, name: true },
        },
      },
      orderBy: (g, { asc }) => [asc(g.name)],
    });

    return guides;
  }),

  // Admin: Create size guide
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        categoryId: z.string().uuid().optional(),
        measurements: z.array(measurementSchema),
        instructions: z.string().optional(),
        image: z.string().url().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if category already has a size guide
      if (input.categoryId) {
        const existing = await ctx.db.query.sizeGuides.findFirst({
          where: eq(sizeGuides.categoryId, input.categoryId),
        });

        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This category already has a size guide",
          });
        }
      }

      const [guide] = await ctx.db
        .insert(sizeGuides)
        .values({
          name: input.name,
          categoryId: input.categoryId,
          measurements: input.measurements,
          instructions: input.instructions,
          image: input.image,
          isActive: input.isActive,
        })
        .returning();

      return guide;
    }),

  // Admin: Update size guide
  update: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        categoryId: z.string().uuid().nullable().optional(),
        measurements: z.array(measurementSchema).optional(),
        instructions: z.string().nullable().optional(),
        image: z.string().url().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check if new category already has a size guide
      if (data.categoryId) {
        const existing = await ctx.db.query.sizeGuides.findFirst({
          where: eq(sizeGuides.categoryId, data.categoryId),
        });

        if (existing && existing.id !== id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This category already has a size guide",
          });
        }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
      if (data.measurements !== undefined) updateData.measurements = data.measurements;
      if (data.instructions !== undefined) updateData.instructions = data.instructions;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const [guide] = await ctx.db
        .update(sizeGuides)
        .set(updateData)
        .where(eq(sizeGuides.id, id))
        .returning();

      return guide;
    }),

  // Admin: Delete size guide
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(sizeGuides).where(eq(sizeGuides.id, input.id));
      return { success: true };
    }),

  // Admin: Duplicate size guide
  duplicate: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.db.query.sizeGuides.findFirst({
        where: eq(sizeGuides.id, input.id),
      });

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Size guide not found" });
      }

      const [guide] = await ctx.db
        .insert(sizeGuides)
        .values({
          name: `${original.name} (Copy)`,
          categoryId: null, // Don't duplicate category association
          measurements: original.measurements,
          instructions: original.instructions,
          image: original.image,
          isActive: false, // Start as inactive
        })
        .returning();

      return guide;
    }),
});
