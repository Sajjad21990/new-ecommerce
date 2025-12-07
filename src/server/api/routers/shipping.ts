import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, sql } from "drizzle-orm";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import {
  shippingZones,
  shippingZonePincodes,
  nonServiceablePincodes,
} from "@/server/db/schema";

export const shippingRouter = createTRPCRouter({
  // Public: Check if pincode is serviceable and get shipping rate
  checkPincode: publicProcedure
    .input(z.object({ pincode: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      // First check if pincode is non-serviceable
      const blocked = await ctx.db.query.nonServiceablePincodes.findFirst({
        where: eq(nonServiceablePincodes.pincode, input.pincode),
      });

      if (blocked) {
        return {
          available: false,
          reason: blocked.reason || "This area is not serviceable",
        };
      }

      // Find the zone for this pincode
      const pincodeEntry = await ctx.db.query.shippingZonePincodes.findFirst({
        where: eq(shippingZonePincodes.pincode, input.pincode),
        with: {
          zone: true,
        },
      });

      if (!pincodeEntry || !pincodeEntry.zone.isActive) {
        return { available: false };
      }

      return {
        available: true,
        zoneName: pincodeEntry.zone.name,
        rate: parseFloat(pincodeEntry.zone.rate),
        freeShippingThreshold: pincodeEntry.zone.freeShippingThreshold
          ? parseFloat(pincodeEntry.zone.freeShippingThreshold)
          : undefined,
        estimatedDays: pincodeEntry.zone.estimatedDays,
        city: pincodeEntry.city,
        state: pincodeEntry.state,
      };
    }),

  // Admin: Get all shipping zones
  getZones: adminProcedure.query(async ({ ctx }) => {
    const zones = await ctx.db.query.shippingZones.findMany({
      orderBy: (z, { asc }) => [asc(z.sortOrder), asc(z.name)],
      with: {
        pincodes: true,
      },
    });

    return zones.map((zone) => ({
      ...zone,
      pincodeCount: zone.pincodes.length,
    }));
  }),

  // Admin: Get single zone with pincodes
  getZone: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const zone = await ctx.db.query.shippingZones.findFirst({
        where: eq(shippingZones.id, input.id),
        with: {
          pincodes: true,
        },
      });

      if (!zone) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Zone not found" });
      }

      return zone;
    }),

  // Admin: Create shipping zone
  createZone: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        rate: z.number().min(0),
        freeShippingThreshold: z.number().min(0).optional(),
        estimatedDays: z.string().optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [zone] = await ctx.db
        .insert(shippingZones)
        .values({
          name: input.name,
          description: input.description,
          rate: input.rate.toString(),
          freeShippingThreshold: input.freeShippingThreshold?.toString(),
          estimatedDays: input.estimatedDays,
          isActive: input.isActive,
          sortOrder: input.sortOrder,
        })
        .returning();

      return zone;
    }),

  // Admin: Update shipping zone
  updateZone: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        rate: z.number().min(0).optional(),
        freeShippingThreshold: z.number().min(0).nullable().optional(),
        estimatedDays: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.rate !== undefined) updateData.rate = data.rate.toString();
      if (data.freeShippingThreshold !== undefined) {
        updateData.freeShippingThreshold = data.freeShippingThreshold?.toString() ?? null;
      }
      if (data.estimatedDays !== undefined) updateData.estimatedDays = data.estimatedDays;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

      const [zone] = await ctx.db
        .update(shippingZones)
        .set(updateData)
        .where(eq(shippingZones.id, id))
        .returning();

      return zone;
    }),

  // Admin: Delete shipping zone
  deleteZone: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(shippingZones).where(eq(shippingZones.id, input.id));
      return { success: true };
    }),

  // Admin: Add pincodes to zone
  addPincodes: adminProcedure
    .input(
      z.object({
        zoneId: z.string().uuid(),
        pincodes: z.array(
          z.object({
            pincode: z.string().length(6),
            city: z.string().optional(),
            state: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check zone exists
      const zone = await ctx.db.query.shippingZones.findFirst({
        where: eq(shippingZones.id, input.zoneId),
      });

      if (!zone) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Zone not found" });
      }

      // Insert pincodes (ignoring duplicates)
      const values = input.pincodes.map((p) => ({
        zoneId: input.zoneId,
        pincode: p.pincode,
        city: p.city,
        state: p.state,
      }));

      if (values.length > 0) {
        await ctx.db.insert(shippingZonePincodes).values(values).onConflictDoNothing();
      }

      return { added: values.length };
    }),

  // Admin: Remove pincode from zone
  removePincode: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(shippingZonePincodes)
        .where(eq(shippingZonePincodes.id, input.id));
      return { success: true };
    }),

  // Admin: Bulk remove pincodes
  removePincodes: adminProcedure
    .input(
      z.object({
        zoneId: z.string().uuid(),
        pincodes: z.array(z.string().length(6)),
      })
    )
    .mutation(async ({ ctx, input }) => {
      for (const pincode of input.pincodes) {
        await ctx.db
          .delete(shippingZonePincodes)
          .where(
            and(
              eq(shippingZonePincodes.zoneId, input.zoneId),
              eq(shippingZonePincodes.pincode, pincode)
            )
          );
      }
      return { removed: input.pincodes.length };
    }),

  // Admin: Get all non-serviceable pincodes
  getNonServiceable: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.query.nonServiceablePincodes.findMany({
      orderBy: (p, { asc }) => [asc(p.pincode)],
    });
  }),

  // Admin: Add non-serviceable pincode
  addNonServiceable: adminProcedure
    .input(
      z.object({
        pincode: z.string().length(6),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [entry] = await ctx.db
        .insert(nonServiceablePincodes)
        .values({
          pincode: input.pincode,
          reason: input.reason,
        })
        .onConflictDoNothing()
        .returning();

      return entry;
    }),

  // Admin: Remove non-serviceable pincode
  removeNonServiceable: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(nonServiceablePincodes)
        .where(eq(nonServiceablePincodes.id, input.id));
      return { success: true };
    }),

  // Admin: Import pincodes from CSV data
  importPincodes: adminProcedure
    .input(
      z.object({
        zoneId: z.string().uuid(),
        data: z.array(
          z.object({
            pincode: z.string(),
            city: z.string().optional(),
            state: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const validPincodes = input.data.filter(
        (p) => p.pincode && p.pincode.length === 6 && /^\d+$/.test(p.pincode)
      );

      if (validPincodes.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid pincodes found in the data",
        });
      }

      const values = validPincodes.map((p) => ({
        zoneId: input.zoneId,
        pincode: p.pincode,
        city: p.city,
        state: p.state,
      }));

      await ctx.db.insert(shippingZonePincodes).values(values).onConflictDoNothing();

      return { imported: validPincodes.length };
    }),
});
