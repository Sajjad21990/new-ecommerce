import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { cmsContent } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

// Define content types and their schemas
const contentTypes = {
  hero_banner: z.object({
    slides: z.array(
      z.object({
        title: z.string(),
        subtitle: z.string().optional(),
        imageUrl: z.string().url(),
        linkUrl: z.string().optional(),
        linkText: z.string().optional(),
      })
    ),
  }),
  promo_strip: z.object({
    text: z.string(),
    linkUrl: z.string().optional(),
    linkText: z.string().optional(),
    bgColor: z.string().optional(),
  }),
  featured_categories: z.object({
    categories: z.array(
      z.object({
        categoryId: z.string().uuid(),
        imageUrl: z.string().url().optional(),
        title: z.string().optional(),
      })
    ),
  }),
  announcement: z.object({
    message: z.string(),
    type: z.enum(["info", "warning", "success", "error"]).default("info"),
    dismissible: z.boolean().default(true),
  }),
  footer_content: z.object({
    about: z.string().optional(),
    socialLinks: z
      .array(
        z.object({
          platform: z.string(),
          url: z.string().url(),
        })
      )
      .optional(),
  }),
  size_guide: z.object({
    categories: z.array(
      z.object({
        name: z.string(),
        measurements: z.array(
          z.object({
            size: z.string(),
            values: z.record(z.string(), z.string()),
          })
        ),
        measurementLabels: z.array(z.string()),
      })
    ),
  }),
};

type ContentKey = keyof typeof contentTypes;

export const contentRouter = createTRPCRouter({
  // Public: Get content by key
  getByKey: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const content = await ctx.db.query.cmsContent.findFirst({
        where: eq(cmsContent.key, input.key),
      });

      if (!content || !content.isActive) {
        return null;
      }

      return content;
    }),

  // Public: Get multiple content items by keys
  getByKeys: publicProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.keys.map((key) =>
          ctx.db.query.cmsContent.findFirst({
            where: eq(cmsContent.key, key),
          })
        )
      );

      // Return as a map
      return input.keys.reduce(
        (acc, key, index) => {
          const content = results[index];
          if (content && content.isActive) {
            acc[key] = content;
          }
          return acc;
        },
        {} as Record<string, typeof results[0]>
      );
    }),

  // Admin: List all content
  adminList: adminProcedure.query(async ({ ctx }) => {
    const contentList = await ctx.db.query.cmsContent.findMany({
      orderBy: desc(cmsContent.updatedAt),
    });

    return contentList;
  }),

  // Admin: Get content by ID
  adminGetById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const content = await ctx.db.query.cmsContent.findFirst({
        where: eq(cmsContent.id, input.id),
      });

      if (!content) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Content not found",
        });
      }

      return content;
    }),

  // Admin: Create or update content
  adminUpsert: adminProcedure
    .input(
      z.object({
        key: z.string().min(1).max(100),
        title: z.string().max(255).optional(),
        content: z.any(), // JSON content - validated by frontend
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if content with this key exists
      const existing = await ctx.db.query.cmsContent.findFirst({
        where: eq(cmsContent.key, input.key),
      });

      if (existing) {
        // Update existing
        const [updated] = await ctx.db
          .update(cmsContent)
          .set({
            title: input.title,
            content: input.content,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(cmsContent.key, input.key))
          .returning();

        return updated;
      } else {
        // Create new
        const [created] = await ctx.db
          .insert(cmsContent)
          .values({
            key: input.key,
            title: input.title,
            content: input.content,
            isActive: input.isActive,
          })
          .returning();

        return created;
      }
    }),

  // Admin: Update content by ID
  adminUpdate: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: z.object({
          title: z.string().max(255).optional(),
          content: z.any().optional(),
          isActive: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, data } = input;

      const existing = await ctx.db.query.cmsContent.findFirst({
        where: eq(cmsContent.id, id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Content not found",
        });
      }

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (data.title !== undefined) updateData.title = data.title;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      const [updated] = await ctx.db
        .update(cmsContent)
        .set(updateData)
        .where(eq(cmsContent.id, id))
        .returning();

      return updated;
    }),

  // Admin: Delete content
  adminDelete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.cmsContent.findFirst({
        where: eq(cmsContent.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Content not found",
        });
      }

      await ctx.db.delete(cmsContent).where(eq(cmsContent.id, input.id));

      return { success: true };
    }),

  // Admin: Toggle content status
  adminToggleStatus: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.cmsContent.findFirst({
        where: eq(cmsContent.id, input.id),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Content not found",
        });
      }

      const [updated] = await ctx.db
        .update(cmsContent)
        .set({
          isActive: !existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(cmsContent.id, input.id))
        .returning();

      return updated;
    }),

  // Get content types (for admin UI reference)
  getContentTypes: adminProcedure.query(() => {
    return [
      {
        key: "hero_banner",
        name: "Hero Banner",
        description: "Homepage hero slider with images and CTAs",
      },
      {
        key: "promo_strip",
        name: "Promo Strip",
        description: "Top promotional banner strip",
      },
      {
        key: "featured_categories",
        name: "Featured Categories",
        description: "Featured category cards on homepage",
      },
      {
        key: "announcement",
        name: "Announcement",
        description: "Site-wide announcement banner",
      },
      {
        key: "footer_content",
        name: "Footer Content",
        description: "Footer about text and social links",
      },
      {
        key: "size_guide",
        name: "Size Guide",
        description: "Product size guide measurements",
      },
    ];
  }),
});
