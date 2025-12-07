import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { addresses } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

const addressSchema = z.object({
  type: z.enum(["shipping", "billing"]).default("shipping"),
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  addressLine1: z.string().min(5, "Address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6, "Valid pincode required"),
  isDefault: z.boolean().default(false),
});

export const addressRouter = createTRPCRouter({
  // Get all addresses for the current user
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;

    const userAddresses = await ctx.db.query.addresses.findMany({
      where: eq(addresses.userId, userId),
      orderBy: (addresses, { desc }) => [desc(addresses.isDefault), desc(addresses.createdAt)],
    });

    return userAddresses;
  }),

  // Get a single address by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const address = await ctx.db.query.addresses.findFirst({
        where: and(eq(addresses.id, input.id), eq(addresses.userId, userId)),
      });

      if (!address) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        });
      }

      return address;
    }),

  // Get default address
  getDefault: protectedProcedure
    .input(z.object({ type: z.enum(["shipping", "billing"]).optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const conditions = [eq(addresses.userId, userId), eq(addresses.isDefault, true)];

      if (input.type) {
        conditions.push(eq(addresses.type, input.type));
      }

      const address = await ctx.db.query.addresses.findFirst({
        where: and(...conditions),
      });

      return address;
    }),

  // Create a new address
  create: protectedProcedure.input(addressSchema).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;

    // If this is set as default, remove default from other addresses of same type
    if (input.isDefault) {
      await ctx.db
        .update(addresses)
        .set({ isDefault: false })
        .where(and(eq(addresses.userId, userId), eq(addresses.type, input.type)));
    }

    // Check if this is the first address - make it default
    const existingAddresses = await ctx.db.query.addresses.findMany({
      where: and(eq(addresses.userId, userId), eq(addresses.type, input.type)),
    });

    const [newAddress] = await ctx.db
      .insert(addresses)
      .values({
        userId,
        type: input.type,
        fullName: input.fullName,
        phone: input.phone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        isDefault: input.isDefault || existingAddresses.length === 0,
      })
      .returning();

    return newAddress;
  }),

  // Update an address
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: addressSchema.partial(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const existingAddress = await ctx.db.query.addresses.findFirst({
        where: and(eq(addresses.id, input.id), eq(addresses.userId, userId)),
      });

      if (!existingAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        });
      }

      // If setting as default, remove default from other addresses
      if (input.data.isDefault) {
        const type = input.data.type || existingAddress.type;
        await ctx.db
          .update(addresses)
          .set({ isDefault: false })
          .where(and(eq(addresses.userId, userId), eq(addresses.type, type)));
      }

      const [updatedAddress] = await ctx.db
        .update(addresses)
        .set(input.data)
        .where(eq(addresses.id, input.id))
        .returning();

      return updatedAddress;
    }),

  // Delete an address
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify ownership
      const existingAddress = await ctx.db.query.addresses.findFirst({
        where: and(eq(addresses.id, input.id), eq(addresses.userId, userId)),
      });

      if (!existingAddress) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        });
      }

      await ctx.db.delete(addresses).where(eq(addresses.id, input.id));

      // If the deleted address was default, make another one default
      if (existingAddress.isDefault) {
        const nextAddress = await ctx.db.query.addresses.findFirst({
          where: and(eq(addresses.userId, userId), eq(addresses.type, existingAddress.type)),
        });

        if (nextAddress) {
          await ctx.db
            .update(addresses)
            .set({ isDefault: true })
            .where(eq(addresses.id, nextAddress.id));
        }
      }

      return { success: true };
    }),

  // Set an address as default
  setDefault: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify ownership and get address type
      const address = await ctx.db.query.addresses.findFirst({
        where: and(eq(addresses.id, input.id), eq(addresses.userId, userId)),
      });

      if (!address) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Address not found",
        });
      }

      // Remove default from all addresses of same type
      await ctx.db
        .update(addresses)
        .set({ isDefault: false })
        .where(and(eq(addresses.userId, userId), eq(addresses.type, address.type)));

      // Set this address as default
      const [updatedAddress] = await ctx.db
        .update(addresses)
        .set({ isDefault: true })
        .where(eq(addresses.id, input.id))
        .returning();

      return updatedAddress;
    }),
});
