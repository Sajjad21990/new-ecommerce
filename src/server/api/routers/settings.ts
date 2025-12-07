import { z } from "zod";
import { eq } from "drizzle-orm";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { settings } from "@/server/db/schema";

// Define settings schemas
const storeSettingsSchema = z.object({
  storeName: z.string().min(1).max(100),
  storeEmail: z.string().email(),
  storePhone: z.string().optional(),
  storeAddress: z.string().optional(),
  currency: z.string().default("INR"),
  currencySymbol: z.string().default("₹"),
  taxRate: z.number().min(0).max(100).default(0),
  freeShippingThreshold: z.number().min(0).optional(),
  defaultShippingCost: z.number().min(0).default(0),
});

const socialSettingsSchema = z.object({
  facebook: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
  pinterest: z.string().url().optional().or(z.literal("")),
});

const seoSettingsSchema = z.object({
  metaTitle: z.string().max(70).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal("")),
  googleAnalyticsId: z.string().optional(),
});

const shippingSettingsSchema = z.object({
  enableFreeShipping: z.boolean().default(true),
  freeShippingMinimum: z.number().min(0).default(999),
  flatRate: z.number().min(0).default(49),
  estimatedDeliveryDays: z.object({
    min: z.number().min(1).default(3),
    max: z.number().min(1).default(7),
  }),
  enableCOD: z.boolean().default(true),
  codExtraCharge: z.number().min(0).default(0),
});

const paymentSettingsSchema = z.object({
  razorpayEnabled: z.boolean().default(true),
  codEnabled: z.boolean().default(true),
  testMode: z.boolean().default(false),
});

export const settingsRouter = createTRPCRouter({
  // Public: Get specific setting by key
  get: publicProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const setting = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, input.key),
      });

      return setting?.value ?? null;
    }),

  // Public: Get multiple settings
  getMultiple: publicProcedure
    .input(z.object({ keys: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.keys.map((key) =>
          ctx.db.query.settings.findFirst({
            where: eq(settings.key, key),
          })
        )
      );

      return input.keys.reduce(
        (acc, key, index) => {
          acc[key] = results[index]?.value ?? null;
          return acc;
        },
        {} as Record<string, unknown>
      );
    }),

  // Public: Get store settings (commonly needed)
  getStoreSettings: publicProcedure.query(async ({ ctx }) => {
    const setting = await ctx.db.query.settings.findFirst({
      where: eq(settings.key, "store"),
    });

    const defaults = {
      storeName: "STORE",
      storeEmail: "support@store.com",
      storePhone: "",
      storeAddress: "",
      currency: "INR",
      currencySymbol: "₹",
      taxRate: 0,
      freeShippingThreshold: 999,
      defaultShippingCost: 49,
    };

    return { ...defaults, ...(setting?.value as object) };
  }),

  // Public: Get shipping settings
  getShippingSettings: publicProcedure.query(async ({ ctx }) => {
    const setting = await ctx.db.query.settings.findFirst({
      where: eq(settings.key, "shipping"),
    });

    const defaults = {
      enableFreeShipping: true,
      freeShippingMinimum: 999,
      flatRate: 49,
      estimatedDeliveryDays: { min: 3, max: 7 },
      enableCOD: true,
      codExtraCharge: 0,
    };

    return { ...defaults, ...(setting?.value as object) };
  }),

  // Admin: Get all settings
  adminGetAll: adminProcedure.query(async ({ ctx }) => {
    const allSettings = await ctx.db.query.settings.findMany();

    // Convert to key-value object
    return allSettings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, unknown>
    );
  }),

  // Admin: Update store settings
  adminUpdateStore: adminProcedure
    .input(storeSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, "store"),
      });

      if (existing) {
        await ctx.db
          .update(settings)
          .set({ value: input, updatedAt: new Date() })
          .where(eq(settings.key, "store"));
      } else {
        await ctx.db.insert(settings).values({
          key: "store",
          value: input,
        });
      }

      return input;
    }),

  // Admin: Update social settings
  adminUpdateSocial: adminProcedure
    .input(socialSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, "social"),
      });

      if (existing) {
        await ctx.db
          .update(settings)
          .set({ value: input, updatedAt: new Date() })
          .where(eq(settings.key, "social"));
      } else {
        await ctx.db.insert(settings).values({
          key: "social",
          value: input,
        });
      }

      return input;
    }),

  // Admin: Update SEO settings
  adminUpdateSEO: adminProcedure
    .input(seoSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, "seo"),
      });

      if (existing) {
        await ctx.db
          .update(settings)
          .set({ value: input, updatedAt: new Date() })
          .where(eq(settings.key, "seo"));
      } else {
        await ctx.db.insert(settings).values({
          key: "seo",
          value: input,
        });
      }

      return input;
    }),

  // Admin: Update shipping settings
  adminUpdateShipping: adminProcedure
    .input(shippingSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, "shipping"),
      });

      if (existing) {
        await ctx.db
          .update(settings)
          .set({ value: input, updatedAt: new Date() })
          .where(eq(settings.key, "shipping"));
      } else {
        await ctx.db.insert(settings).values({
          key: "shipping",
          value: input,
        });
      }

      return input;
    }),

  // Admin: Update payment settings
  adminUpdatePayment: adminProcedure
    .input(paymentSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, "payment"),
      });

      if (existing) {
        await ctx.db
          .update(settings)
          .set({ value: input, updatedAt: new Date() })
          .where(eq(settings.key, "payment"));
      } else {
        await ctx.db.insert(settings).values({
          key: "payment",
          value: input,
        });
      }

      return input;
    }),

  // Admin: Set any setting (generic)
  adminSet: adminProcedure
    .input(
      z.object({
        key: z.string().min(1).max(100),
        value: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.settings.findFirst({
        where: eq(settings.key, input.key),
      });

      if (existing) {
        await ctx.db
          .update(settings)
          .set({ value: input.value, updatedAt: new Date() })
          .where(eq(settings.key, input.key));
      } else {
        await ctx.db.insert(settings).values({
          key: input.key,
          value: input.value,
        });
      }

      return { key: input.key, value: input.value };
    }),
});
