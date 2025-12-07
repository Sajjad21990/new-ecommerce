import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { productQuestions, products } from "@/server/db/schema";

export const productQuestionRouter = createTRPCRouter({
  // Public: Get approved questions for a product
  getByProduct: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        limit: z.number().min(1).max(50).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const questions = await ctx.db.query.productQuestions.findMany({
        where: and(
          eq(productQuestions.productId, input.productId),
          eq(productQuestions.isApproved, true),
          eq(productQuestions.isPublic, true)
        ),
        with: {
          user: {
            columns: { id: true, name: true },
          },
          answerer: {
            columns: { id: true, name: true },
          },
        },
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(productQuestions.createdAt)],
      });

      return questions;
    }),

  // Public: Ask a question (guest)
  askGuest: publicProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        name: z.string().min(1),
        email: z.string().email(),
        question: z.string().min(10).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify product exists
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.productId),
        columns: { id: true },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const [question] = await ctx.db
        .insert(productQuestions)
        .values({
          productId: input.productId,
          name: input.name,
          email: input.email,
          question: input.question,
          isApproved: false,
          isPublic: true,
        })
        .returning();

      return question;
    }),

  // Protected: Ask a question (logged-in user)
  ask: protectedProcedure
    .input(
      z.object({
        productId: z.string().uuid(),
        question: z.string().min(10).max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify product exists
      const product = await ctx.db.query.products.findFirst({
        where: eq(products.id, input.productId),
        columns: { id: true },
      });

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      }

      const [question] = await ctx.db
        .insert(productQuestions)
        .values({
          productId: input.productId,
          userId: ctx.session.user.id,
          question: input.question,
          isApproved: false,
          isPublic: true,
        })
        .returning();

      return question;
    }),

  // Admin: Get all questions (with filters)
  getAll: adminProcedure
    .input(
      z.object({
        productId: z.string().uuid().optional(),
        isApproved: z.boolean().optional(),
        hasAnswer: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      let whereClause = undefined;

      const conditions = [];
      if (input.productId) {
        conditions.push(eq(productQuestions.productId, input.productId));
      }
      if (input.isApproved !== undefined) {
        conditions.push(eq(productQuestions.isApproved, input.isApproved));
      }

      if (conditions.length > 0) {
        whereClause = and(...conditions);
      }

      const questions = await ctx.db.query.productQuestions.findMany({
        where: whereClause,
        with: {
          product: {
            columns: { id: true, name: true, slug: true },
          },
          user: {
            columns: { id: true, name: true, email: true },
          },
          answerer: {
            columns: { id: true, name: true },
          },
        },
        limit: input.limit,
        offset: input.offset,
        orderBy: [desc(productQuestions.createdAt)],
      });

      // Filter by hasAnswer if specified
      if (input.hasAnswer !== undefined) {
        return questions.filter((q) =>
          input.hasAnswer ? q.answer !== null : q.answer === null
        );
      }

      return questions;
    }),

  // Admin: Get single question
  get: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const question = await ctx.db.query.productQuestions.findFirst({
        where: eq(productQuestions.id, input.id),
        with: {
          product: {
            columns: { id: true, name: true, slug: true },
          },
          user: {
            columns: { id: true, name: true, email: true },
          },
          answerer: {
            columns: { id: true, name: true },
          },
        },
      });

      if (!question) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Question not found" });
      }

      return question;
    }),

  // Admin: Answer a question
  answer: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        answer: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [question] = await ctx.db
        .update(productQuestions)
        .set({
          answer: input.answer,
          answeredBy: ctx.session.user.id,
          answeredAt: new Date(),
          isApproved: true, // Auto-approve when answered
        })
        .where(eq(productQuestions.id, input.id))
        .returning();

      return question;
    }),

  // Admin: Approve/reject question
  setApproval: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isApproved: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [question] = await ctx.db
        .update(productQuestions)
        .set({ isApproved: input.isApproved })
        .where(eq(productQuestions.id, input.id))
        .returning();

      return question;
    }),

  // Admin: Set public/private
  setPublic: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        isPublic: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [question] = await ctx.db
        .update(productQuestions)
        .set({ isPublic: input.isPublic })
        .where(eq(productQuestions.id, input.id))
        .returning();

      return question;
    }),

  // Admin: Delete question
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(productQuestions).where(eq(productQuestions.id, input.id));
      return { success: true };
    }),

  // Admin: Get unanswered questions count
  getUnansweredCount: adminProcedure.query(async ({ ctx }) => {
    const questions = await ctx.db.query.productQuestions.findMany({
      where: eq(productQuestions.isApproved, false),
      columns: { id: true },
    });

    return questions.length;
  }),
});
