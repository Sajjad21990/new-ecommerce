import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { emailTemplates } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

// Default email templates for initial setup
const defaultTemplates = [
  {
    key: "order_confirmation",
    name: "Order Confirmation",
    subject: "Order Confirmed - {{order_number}}",
    variables: ["order_number", "customer_name", "order_items", "subtotal", "shipping", "discount", "total", "shipping_address", "payment_method"],
  },
  {
    key: "order_shipped",
    name: "Order Shipped",
    subject: "Your Order {{order_number}} Has Been Shipped!",
    variables: ["order_number", "customer_name", "tracking_number", "tracking_url", "carrier", "estimated_delivery"],
  },
  {
    key: "order_delivered",
    name: "Order Delivered",
    subject: "Your Order {{order_number}} Has Been Delivered",
    variables: ["order_number", "customer_name", "review_link"],
  },
  {
    key: "order_cancelled",
    name: "Order Cancelled",
    subject: "Order {{order_number}} Has Been Cancelled",
    variables: ["order_number", "customer_name", "cancellation_reason", "refund_amount"],
  },
  {
    key: "return_requested",
    name: "Return Request Received",
    subject: "Return Request {{return_number}} Received",
    variables: ["return_number", "order_number", "customer_name", "return_reason", "items"],
  },
  {
    key: "return_approved",
    name: "Return Approved",
    subject: "Return {{return_number}} Has Been Approved",
    variables: ["return_number", "customer_name", "instructions", "return_address"],
  },
  {
    key: "return_rejected",
    name: "Return Rejected",
    subject: "Return {{return_number}} Status Update",
    variables: ["return_number", "customer_name", "rejection_reason"],
  },
  {
    key: "refund_processed",
    name: "Refund Processed",
    subject: "Refund Processed for Order {{order_number}}",
    variables: ["order_number", "customer_name", "refund_amount", "refund_method"],
  },
  {
    key: "low_stock_alert",
    name: "Low Stock Alert (Admin)",
    subject: "Low Stock Alert: {{product_count}} Products Need Attention",
    variables: ["product_count", "products_list"],
  },
  {
    key: "new_order_admin",
    name: "New Order Notification (Admin)",
    subject: "New Order Received - {{order_number}}",
    variables: ["order_number", "customer_name", "customer_email", "total", "items_count"],
  },
  {
    key: "welcome",
    name: "Welcome Email",
    subject: "Welcome to {{store_name}}!",
    variables: ["customer_name", "store_name", "store_url"],
  },
  {
    key: "password_reset",
    name: "Password Reset",
    subject: "Reset Your Password",
    variables: ["customer_name", "reset_link", "expiry_time"],
  },
];

export const emailTemplatesRouter = createTRPCRouter({
  // Get all email templates
  getAll: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.emailTemplates.findMany({
      orderBy: desc(emailTemplates.createdAt),
    });
  }),

  // Get single template by key
  getByKey: adminProcedure
    .input(z.object({ key: z.string() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.key, input.key),
      });

      if (!template) {
        // Return default template info if not customized yet
        const defaultTemplate = defaultTemplates.find((t) => t.key === input.key);
        if (defaultTemplate) {
          return {
            ...defaultTemplate,
            id: null,
            htmlContent: "",
            textContent: null,
            isActive: true,
            isDefault: true,
          };
        }
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      return { ...template, isDefault: false };
    }),

  // Get template by ID
  getById: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const template = await ctx.db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, input.id),
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      return template;
    }),

  // Create or update template
  upsert: adminProcedure
    .input(
      z.object({
        key: z.string(),
        name: z.string(),
        subject: z.string(),
        htmlContent: z.string(),
        textContent: z.string().optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if template exists
      const existing = await ctx.db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.key, input.key),
      });

      if (existing) {
        // Update
        const [updated] = await ctx.db
          .update(emailTemplates)
          .set({
            name: input.name,
            subject: input.subject,
            htmlContent: input.htmlContent,
            textContent: input.textContent,
            variables: input.variables,
            isActive: input.isActive,
            updatedAt: new Date(),
          })
          .where(eq(emailTemplates.key, input.key))
          .returning();

        return updated;
      } else {
        // Create
        const [created] = await ctx.db
          .insert(emailTemplates)
          .values({
            key: input.key,
            name: input.name,
            subject: input.subject,
            htmlContent: input.htmlContent,
            textContent: input.textContent,
            variables: input.variables,
            isActive: input.isActive,
          })
          .returning();

        return created;
      }
    }),

  // Toggle template active status
  toggleActive: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const template = await ctx.db.query.emailTemplates.findFirst({
        where: eq(emailTemplates.id, input.id),
      });

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      const [updated] = await ctx.db
        .update(emailTemplates)
        .set({
          isActive: !template.isActive,
          updatedAt: new Date(),
        })
        .where(eq(emailTemplates.id, input.id))
        .returning();

      return updated;
    }),

  // Delete template (revert to default)
  delete: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(emailTemplates).where(eq(emailTemplates.id, input.id));
      return { success: true };
    }),

  // Get list of available template types (for creating new)
  getTemplateTypes: adminProcedure.query(() => {
    return defaultTemplates.map((t) => ({
      key: t.key,
      name: t.name,
      variables: t.variables,
    }));
  }),

  // Preview template with sample data
  preview: adminProcedure
    .input(
      z.object({
        htmlContent: z.string(),
        sampleData: z.record(z.string(), z.string()).optional(),
      })
    )
    .mutation(({ input }) => {
      let preview = input.htmlContent;

      // Replace variables with sample data
      const sampleData = input.sampleData || {
        order_number: "ORD-ABC123",
        customer_name: "John Doe",
        store_name: "Your Store",
        total: "₹2,499",
        tracking_number: "TRK123456789",
        return_number: "RMA-XYZ789",
      };

      for (const [key, value] of Object.entries(sampleData)) {
        preview = preview.replace(new RegExp(`{{${key}}}`, "g"), value);
      }

      return { preview };
    }),

  // Initialize default templates
  initializeDefaults: adminProcedure.mutation(async ({ ctx }) => {
    const existingKeys = await ctx.db.query.emailTemplates.findMany({
      columns: { key: true },
    });

    const existingKeySet = new Set(existingKeys.map((t) => t.key));
    const toCreate = defaultTemplates.filter((t) => !existingKeySet.has(t.key));

    if (toCreate.length === 0) {
      return { created: 0 };
    }

    // Create default HTML for each template
    const defaultHtml = (name: string, variables: string[]) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000; color: #fff; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>STORE</h1>
    </div>
    <div class="content">
      <h2>${name}</h2>
      <p>Hello {{customer_name}},</p>
      <p>This is a default template. Please customize it in your admin panel.</p>
      <p>Available variables: ${variables.map((v) => `{{${v}}}`).join(", ")}</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Your Store. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

    await ctx.db.insert(emailTemplates).values(
      toCreate.map((t) => ({
        key: t.key,
        name: t.name,
        subject: t.subject,
        htmlContent: defaultHtml(t.name, t.variables),
        variables: t.variables,
        isActive: true,
      }))
    );

    return { created: toCreate.length };
  }),
});
