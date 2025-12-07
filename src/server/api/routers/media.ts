import { z } from "zod";
import { eq, and, isNull, desc, asc, ilike, or, inArray, count } from "drizzle-orm";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { mediaFolders, mediaAssets } from "@/server/db/schema";
import { TRPCError } from "@trpc/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Helper to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const mediaRouter = createTRPCRouter({
  // ============ FOLDERS ============

  // Get all folders (with optional parent filter)
  getFolders: adminProcedure
    .input(
      z.object({
        parentId: z.string().uuid().nullable().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const parentId = input?.parentId;

      const folders = await ctx.db.query.mediaFolders.findMany({
        where: parentId === undefined
          ? undefined
          : parentId === null
            ? isNull(mediaFolders.parentId)
            : eq(mediaFolders.parentId, parentId),
        orderBy: [asc(mediaFolders.name)],
        with: {
          children: true,
        },
      });

      // Get asset count for each folder
      const folderIds = folders.map(f => f.id);
      const assetCounts = folderIds.length > 0
        ? await ctx.db
            .select({
              folderId: mediaAssets.folderId,
              count: count(),
            })
            .from(mediaAssets)
            .where(inArray(mediaAssets.folderId, folderIds))
            .groupBy(mediaAssets.folderId)
        : [];

      const countMap = new Map(assetCounts.map(c => [c.folderId, c.count]));

      return folders.map(folder => ({
        ...folder,
        assetCount: countMap.get(folder.id) || 0,
        childCount: folder.children?.length || 0,
      }));
    }),

  // Get folder by ID with breadcrumb path
  getFolder: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const folder = await ctx.db.query.mediaFolders.findFirst({
        where: eq(mediaFolders.id, input.id),
        with: {
          parent: true,
          children: true,
        },
      });

      if (!folder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      // Build breadcrumb path
      const breadcrumbs: { id: string; name: string }[] = [];
      let currentFolder = folder;

      while (currentFolder) {
        breadcrumbs.unshift({ id: currentFolder.id, name: currentFolder.name });
        if (currentFolder.parentId) {
          const parent = await ctx.db.query.mediaFolders.findFirst({
            where: eq(mediaFolders.id, currentFolder.parentId),
          });
          currentFolder = parent as typeof currentFolder;
        } else {
          break;
        }
      }

      return { ...folder, breadcrumbs };
    }),

  // Create folder
  createFolder: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        parentId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(input.name);

      // Build the path
      let path = `/${slug}`;
      if (input.parentId) {
        const parent = await ctx.db.query.mediaFolders.findFirst({
          where: eq(mediaFolders.id, input.parentId),
        });
        if (parent) {
          path = `${parent.path}/${slug}`;
        }
      }

      const [folder] = await ctx.db
        .insert(mediaFolders)
        .values({
          name: input.name,
          slug,
          parentId: input.parentId || null,
          path,
        })
        .returning();

      return folder;
    }),

  // Rename folder
  renameFolder: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = generateSlug(input.name);

      const existingFolder = await ctx.db.query.mediaFolders.findFirst({
        where: eq(mediaFolders.id, input.id),
      });

      if (!existingFolder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      // Update path (replace last segment)
      const pathParts = existingFolder.path.split("/");
      pathParts[pathParts.length - 1] = slug;
      const newPath = pathParts.join("/");

      const [folder] = await ctx.db
        .update(mediaFolders)
        .set({
          name: input.name,
          slug,
          path: newPath,
          updatedAt: new Date(),
        })
        .where(eq(mediaFolders.id, input.id))
        .returning();

      // TODO: Update paths of all children recursively

      return folder;
    }),

  // Move folder
  moveFolder: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        newParentId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.query.mediaFolders.findFirst({
        where: eq(mediaFolders.id, input.id),
      });

      if (!folder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      // Prevent moving folder into itself
      if (input.newParentId === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot move folder into itself",
        });
      }

      // Check if new parent is a descendant of this folder
      if (input.newParentId) {
        const newParentCheck = await ctx.db
          .select({ path: mediaFolders.path })
          .from(mediaFolders)
          .where(eq(mediaFolders.id, input.newParentId))
          .limit(1);

        if (newParentCheck[0]?.path.startsWith(folder.path + "/")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot move folder into its own descendant",
          });
        }
      }

      // Build new path
      let newPath = `/${folder.slug}`;
      if (input.newParentId) {
        const newParent = await ctx.db.query.mediaFolders.findFirst({
          where: eq(mediaFolders.id, input.newParentId),
        });
        if (newParent) {
          newPath = `${newParent.path}/${folder.slug}`;
        }
      }

      const [updated] = await ctx.db
        .update(mediaFolders)
        .set({
          parentId: input.newParentId,
          path: newPath,
          updatedAt: new Date(),
        })
        .where(eq(mediaFolders.id, input.id))
        .returning();

      return updated;
    }),

  // Delete folder (and optionally move contents)
  deleteFolder: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        moveContentsTo: z.string().uuid().nullable().optional(), // null = root, undefined = delete all
      })
    )
    .mutation(async ({ ctx, input }) => {
      const folder = await ctx.db.query.mediaFolders.findFirst({
        where: eq(mediaFolders.id, input.id),
        with: {
          children: true,
          assets: true,
        },
      });

      if (!folder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Folder not found",
        });
      }

      // Move or delete contents
      if (input.moveContentsTo !== undefined) {
        // Move assets to new folder
        await ctx.db
          .update(mediaAssets)
          .set({ folderId: input.moveContentsTo })
          .where(eq(mediaAssets.folderId, input.id));

        // Move child folders to new parent
        await ctx.db
          .update(mediaFolders)
          .set({ parentId: input.moveContentsTo })
          .where(eq(mediaFolders.parentId, input.id));
      } else {
        // Delete all assets in folder (and from Cloudinary)
        for (const asset of folder.assets || []) {
          try {
            await cloudinary.uploader.destroy(asset.publicId);
          } catch (e) {
            console.error("Failed to delete from Cloudinary:", e);
          }
        }
        await ctx.db.delete(mediaAssets).where(eq(mediaAssets.folderId, input.id));

        // Recursively delete child folders
        const deleteChildren = async (parentId: string) => {
          const children = await ctx.db.query.mediaFolders.findMany({
            where: eq(mediaFolders.parentId, parentId),
          });
          for (const child of children) {
            await deleteChildren(child.id);
            await ctx.db.delete(mediaAssets).where(eq(mediaAssets.folderId, child.id));
            await ctx.db.delete(mediaFolders).where(eq(mediaFolders.id, child.id));
          }
        };
        await deleteChildren(input.id);
      }

      // Delete the folder
      await ctx.db.delete(mediaFolders).where(eq(mediaFolders.id, input.id));

      return { success: true };
    }),

  // ============ ASSETS ============

  // Get assets with filtering and pagination
  getAssets: adminProcedure
    .input(
      z.object({
        folderId: z.string().uuid().nullable().optional(), // null = root, undefined = all
        search: z.string().optional(),
        mimeType: z.string().optional(), // Filter by type like "image"
        sortBy: z.enum(["createdAt", "name", "size"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      // Folder filter
      if (input.folderId !== undefined) {
        if (input.folderId === null) {
          conditions.push(isNull(mediaAssets.folderId));
        } else {
          conditions.push(eq(mediaAssets.folderId, input.folderId));
        }
      }

      // Search filter
      if (input.search) {
        conditions.push(
          or(
            ilike(mediaAssets.name, `%${input.search}%`),
            ilike(mediaAssets.fileName, `%${input.search}%`),
            ilike(mediaAssets.altText, `%${input.search}%`)
          )
        );
      }

      // MIME type filter
      if (input.mimeType) {
        conditions.push(ilike(mediaAssets.mimeType, `${input.mimeType}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (input.page - 1) * input.limit;

      // Build order by
      const orderByColumn = {
        createdAt: mediaAssets.createdAt,
        name: mediaAssets.name,
        size: mediaAssets.size,
      }[input.sortBy];

      const orderBy = input.sortOrder === "asc" ? asc(orderByColumn) : desc(orderByColumn);

      const [assets, totalCount] = await Promise.all([
        ctx.db.query.mediaAssets.findMany({
          where: whereClause,
          orderBy: [orderBy],
          limit: input.limit,
          offset,
          with: {
            folder: true,
          },
        }),
        ctx.db
          .select({ count: count() })
          .from(mediaAssets)
          .where(whereClause),
      ]);

      return {
        assets,
        pagination: {
          total: totalCount[0]?.count || 0,
          page: input.page,
          limit: input.limit,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / input.limit),
        },
      };
    }),

  // Get single asset
  getAsset: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const asset = await ctx.db.query.mediaAssets.findFirst({
        where: eq(mediaAssets.id, input.id),
        with: {
          folder: true,
        },
      });

      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      return asset;
    }),

  // Create asset (after Cloudinary upload)
  createAsset: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        fileName: z.string().min(1).max(255),
        altText: z.string().max(500).optional(),
        caption: z.string().optional(),
        folderId: z.string().uuid().nullable().optional(),
        url: z.string().url(),
        publicId: z.string(),
        mimeType: z.string(),
        format: z.string(),
        size: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [asset] = await ctx.db
        .insert(mediaAssets)
        .values({
          name: input.name,
          fileName: input.fileName,
          altText: input.altText || null,
          caption: input.caption || null,
          folderId: input.folderId || null,
          url: input.url,
          publicId: input.publicId,
          mimeType: input.mimeType,
          format: input.format,
          size: input.size,
          width: input.width || null,
          height: input.height || null,
          metadata: input.metadata || null,
        })
        .returning();

      return asset;
    }),

  // Update asset metadata
  updateAsset: adminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(255).optional(),
        altText: z.string().max(500).optional(),
        caption: z.string().optional(),
        folderId: z.string().uuid().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      const [asset] = await ctx.db
        .update(mediaAssets)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(mediaAssets.id, id))
        .returning();

      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      return asset;
    }),

  // Move assets to folder
  moveAssets: adminProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()),
        folderId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(mediaAssets)
        .set({
          folderId: input.folderId,
          updatedAt: new Date(),
        })
        .where(inArray(mediaAssets.id, input.ids));

      return { success: true, count: input.ids.length };
    }),

  // Delete asset
  deleteAsset: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.query.mediaAssets.findFirst({
        where: eq(mediaAssets.id, input.id),
      });

      if (!asset) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      // Delete from Cloudinary
      try {
        await cloudinary.uploader.destroy(asset.publicId);
      } catch (e) {
        console.error("Failed to delete from Cloudinary:", e);
      }

      // Delete from database
      await ctx.db.delete(mediaAssets).where(eq(mediaAssets.id, input.id));

      return { success: true };
    }),

  // Bulk delete assets
  bulkDeleteAssets: adminProcedure
    .input(z.object({ ids: z.array(z.string().uuid()) }))
    .mutation(async ({ ctx, input }) => {
      const assets = await ctx.db.query.mediaAssets.findMany({
        where: inArray(mediaAssets.id, input.ids),
      });

      // Delete from Cloudinary
      for (const asset of assets) {
        try {
          await cloudinary.uploader.destroy(asset.publicId);
        } catch (e) {
          console.error("Failed to delete from Cloudinary:", e);
        }
      }

      // Delete from database
      await ctx.db.delete(mediaAssets).where(inArray(mediaAssets.id, input.ids));

      return { success: true, count: input.ids.length };
    }),

  // Get library stats
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [totalAssets, totalFolders, totalSize] = await Promise.all([
      ctx.db.select({ count: count() }).from(mediaAssets),
      ctx.db.select({ count: count() }).from(mediaFolders),
      ctx.db
        .select({
          total: count(),
        })
        .from(mediaAssets),
    ]);

    // Get size by summing
    const sizeResult = await ctx.db.query.mediaAssets.findMany({
      columns: { size: true },
    });
    const totalSizeBytes = sizeResult.reduce((acc, a) => acc + (a.size || 0), 0);

    return {
      totalAssets: totalAssets[0]?.count || 0,
      totalFolders: totalFolders[0]?.count || 0,
      totalSize: totalSizeBytes,
    };
  }),
});
