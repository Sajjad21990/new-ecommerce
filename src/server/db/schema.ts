import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);
export const addressTypeEnum = pgEnum("address_type", ["billing", "shipping"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);
export const couponTypeEnum = pgEnum("coupon_type", ["percentage", "fixed"]);
export const productVisibilityEnum = pgEnum("product_visibility", [
  "visible",
  "hidden",
  "catalog_only",
  "search_only",
]);
export const returnStatusEnum = pgEnum("return_status", [
  "requested",
  "approved",
  "rejected",
  "shipped",
  "received",
  "refunded",
  "completed",
]);
export const returnReasonEnum = pgEnum("return_reason", [
  "defective",
  "wrong_item",
  "not_as_described",
  "changed_mind",
  "size_issue",
  "other",
]);

// Users
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  role: userRoleEnum("role").default("customer").notNull(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  tags: text("tags").array(),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
  reviews: many(reviews),
  wishlist: many(wishlist),
  cart: many(carts),
}));

// Addresses
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: addressTypeEnum("type").default("shipping").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  addressLine1: text("address_line_1").notNull(),
  addressLine2: text("address_line_2"),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 100 }).notNull(),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, {
    fields: [addresses.userId],
    references: [users.id],
  }),
}));

// Categories
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  image: text("image"),
  parentId: uuid("parent_id"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryParent",
  }),
  children: many(categories, { relationName: "categoryParent" }),
  products: many(products),
}));

// Brands
export const brands = pgTable("brands", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  logo: text("logo"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

// Products
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  shortDescription: text("short_description"),
  sku: varchar("sku", { length: 100 }),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  isNew: boolean("is_new").default(false).notNull(),
  tags: text("tags").array(),
  visibility: productVisibilityEnum("visibility").default("visible").notNull(),
  minOrderQuantity: integer("min_order_quantity").default(1),
  maxOrderQuantity: integer("max_order_quantity"),
  publishedAt: timestamp("published_at"),
  // New fields for imported data
  care: text("care"),
  deliveryAndReturns: text("delivery_and_returns"),
  gifting: text("gifting"),
  youtubeLink: jsonb("youtube_link"),
  stockQuantity: integer("stock_quantity").default(0),
  inStock: boolean("in_stock").default(true).notNull(),
  searchText: text("search_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  images: many(productImages),
  variants: many(productVariants),
  reviews: many(reviews),
  wishlist: many(wishlist),
}));

// Product Images
export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  altText: varchar("alt_text", { length: 255 }),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
});

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// Product Variants
export const productVariants = pgTable("product_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  sku: varchar("sku", { length: 100 }),
  size: varchar("size", { length: 50 }),
  color: varchar("color", { length: 50 }),
  colorHex: varchar("color_hex", { length: 7 }),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  stock: integer("stock").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productVariantsRelations = relations(productVariants, ({ one }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
}));

// Orders
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable for guest orders
  guestEmail: varchar("guest_email", { length: 255 }), // Email for guest orders
  status: orderStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  razorpayOrderId: varchar("razorpay_order_id", { length: 255 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 255 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  billingAddress: jsonb("billing_address"),
  notes: text("notes"),
  adminNotes: text("admin_notes"),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  trackingUrl: text("tracking_url"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
  timeline: many(orderTimeline),
  returns: many(orderReturns),
}));

// Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  size: varchar("size", { length: 50 }),
  color: varchar("color", { length: 50 }),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

// Order Timeline (Activity Log)
export const orderTimeline = pgTable("order_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(), // status_change, note, email_sent, payment, refund
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data like old/new status, email subject, etc.
  isPublic: boolean("is_public").default(false).notNull(), // Visible to customer
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderTimelineRelations = relations(orderTimeline, ({ one }) => ({
  order: one(orders, {
    fields: [orderTimeline.orderId],
    references: [orders.id],
  }),
  creator: one(users, {
    fields: [orderTimeline.createdBy],
    references: [users.id],
  }),
}));

// Order Returns (RMA)
export const orderReturns = pgTable("order_returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  returnNumber: varchar("return_number", { length: 50 }).notNull().unique(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: returnStatusEnum("status").default("requested").notNull(),
  reason: returnReasonEnum("reason").notNull(),
  reasonDetails: text("reason_details"),
  items: jsonb("items").notNull(), // Array of { orderItemId, quantity, reason }
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }),
  refundMethod: varchar("refund_method", { length: 50 }), // original_payment, store_credit
  adminNotes: text("admin_notes"),
  customerNotes: text("customer_notes"),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderReturnsRelations = relations(orderReturns, ({ one }) => ({
  order: one(orders, {
    fields: [orderReturns.orderId],
    references: [orders.id],
  }),
  user: one(users, {
    fields: [orderReturns.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [orderReturns.approvedBy],
    references: [users.id],
  }),
}));

// Email Templates
export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(), // order_confirmation, order_shipped, etc.
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  variables: text("variables").array(), // List of available variables like {{order_number}}, {{customer_name}}
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Media Folders
export const mediaFolders = pgTable("media_folders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  parentId: uuid("parent_id"),
  path: text("path").notNull(), // Full path like "/products/shirts"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mediaFoldersRelations = relations(mediaFolders, ({ one, many }) => ({
  parent: one(mediaFolders, {
    fields: [mediaFolders.parentId],
    references: [mediaFolders.id],
    relationName: "folderParent",
  }),
  children: many(mediaFolders, { relationName: "folderParent" }),
  assets: many(mediaAssets),
}));

// Media Assets
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(), // Display name
  fileName: varchar("file_name", { length: 255 }).notNull(), // Original file name
  altText: varchar("alt_text", { length: 500 }),
  caption: text("caption"),
  folderId: uuid("folder_id").references(() => mediaFolders.id, { onDelete: "set null" }),
  url: text("url").notNull(), // Cloudinary URL
  publicId: varchar("public_id", { length: 255 }).notNull(), // Cloudinary public_id
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  format: varchar("format", { length: 20 }).notNull(), // jpg, png, webp, etc.
  size: integer("size").notNull(), // File size in bytes
  width: integer("width"),
  height: integer("height"),
  metadata: jsonb("metadata"), // Extra Cloudinary data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  folder: one(mediaFolders, {
    fields: [mediaAssets.folderId],
    references: [mediaFolders.id],
  }),
}));

// Cart
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const cartsRelations = relations(carts, ({ one, many }) => ({
  user: one(users, {
    fields: [carts.userId],
    references: [users.id],
  }),
  items: many(cartItems),
}));

// Cart Items
export const cartItems = pgTable("cart_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  cartId: uuid("cart_id")
    .notNull()
    .references(() => carts.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "cascade",
  }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cartId],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

// Wishlist
export const wishlist = pgTable("wishlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wishlistRelations = relations(wishlist, ({ one }) => ({
  user: one(users, {
    fields: [wishlist.userId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlist.productId],
    references: [products.id],
  }),
}));

// Reviews
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  comment: text("comment"),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

// Coupons
export const coupons = pgTable("coupons", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: couponTypeEnum("type").notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  maxDiscount: decimal("max_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0).notNull(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CMS Content
export const cmsContent = pgTable("cms_content", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 255 }),
  content: jsonb("content"),
  isActive: boolean("is_active").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Settings
export const settings = pgTable("settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// NextAuth.js required tables
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  id_token: text("id_token"),
  session_state: varchar("session_state", { length: 255 }),
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expires: timestamp("expires").notNull(),
});

// Stock Notifications (Back in Stock)
export const stockNotifications = pgTable("stock_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "cascade",
  }),
  notified: boolean("notified").default(false).notNull(),
  notifiedAt: timestamp("notified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockNotificationsRelations = relations(stockNotifications, ({ one }) => ({
  product: one(products, {
    fields: [stockNotifications.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [stockNotifications.variantId],
    references: [productVariants.id],
  }),
}));

// Admin Notifications
export const notificationTypeEnum = pgEnum("notification_type", [
  "order",
  "inventory",
  "review",
  "return",
  "customer",
  "system",
]);

export const adminNotifications = pgTable("admin_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  link: text("link"), // Optional link to relevant page
  metadata: jsonb("metadata"), // Additional data like orderId, productId, etc.
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Product Questions & Answers
export const productQuestions = pgTable("product_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  name: varchar("name", { length: 255 }), // For guest questions
  email: varchar("email", { length: 255 }), // For guest questions
  question: text("question").notNull(),
  answer: text("answer"),
  answeredBy: uuid("answered_by").references(() => users.id, { onDelete: "set null" }),
  answeredAt: timestamp("answered_at"),
  isPublic: boolean("is_public").default(false).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productQuestionsRelations = relations(productQuestions, ({ one }) => ({
  product: one(products, {
    fields: [productQuestions.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [productQuestions.userId],
    references: [users.id],
  }),
  answerer: one(users, {
    fields: [productQuestions.answeredBy],
    references: [users.id],
  }),
}));

// Size Guides
export const sizeGuides = pgTable("size_guides", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  measurements: jsonb("measurements").notNull(), // Array of { label, sizes: { S: "36", M: "38", ... } }
  instructions: text("instructions"), // How to measure
  image: text("image"), // Measurement diagram
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sizeGuidesRelations = relations(sizeGuides, ({ one }) => ({
  category: one(categories, {
    fields: [sizeGuides.categoryId],
    references: [categories.id],
  }),
}));

// Shipping Zones
export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  rate: decimal("rate", { precision: 10, scale: 2 }).notNull(),
  freeShippingThreshold: decimal("free_shipping_threshold", { precision: 10, scale: 2 }),
  estimatedDays: varchar("estimated_days", { length: 50 }), // e.g., "3-5 days"
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Shipping Zone Pincodes
export const shippingZonePincodes = pgTable("shipping_zone_pincodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id")
    .notNull()
    .references(() => shippingZones.id, { onDelete: "cascade" }),
  pincode: varchar("pincode", { length: 10 }).notNull(),
  city: varchar("city", { length: 255 }),
  state: varchar("state", { length: 255 }),
});

export const shippingZonePincodesRelations = relations(shippingZonePincodes, ({ one }) => ({
  zone: one(shippingZones, {
    fields: [shippingZonePincodes.zoneId],
    references: [shippingZones.id],
  }),
}));

export const shippingZonesRelations = relations(shippingZones, ({ many }) => ({
  pincodes: many(shippingZonePincodes),
}));

// Non-Serviceable Pincodes (Blocked areas)
export const nonServiceablePincodes = pgTable("non_serviceable_pincodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  pincode: varchar("pincode", { length: 10 }).notNull().unique(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Guest Orders (for guest checkout - orders without user account)
export const guestOrders = pgTable("guest_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  status: orderStatusEnum("status").default("pending").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("pending").notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }),
  razorpayOrderId: varchar("razorpay_order_id", { length: 255 }),
  razorpayPaymentId: varchar("razorpay_payment_id", { length: 255 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  shippingAddress: jsonb("shipping_address").notNull(),
  billingAddress: jsonb("billing_address"),
  items: jsonb("items").notNull(), // Array of order items
  notes: text("notes"),
  trackingNumber: varchar("tracking_number", { length: 255 }),
  trackingUrl: text("tracking_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Abandoned Carts (for recovery emails)
export const abandonedCarts = pgTable("abandoned_carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  cartData: jsonb("cart_data").notNull(),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  recoveryToken: varchar("recovery_token", { length: 255 }).notNull().unique(),
  recoveryEmailSent: boolean("recovery_email_sent").default(false).notNull(),
  recoveryEmailSentAt: timestamp("recovery_email_sent_at"),
  recovered: boolean("recovered").default(false).notNull(),
  recoveredAt: timestamp("recovered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const abandonedCartsRelations = relations(abandonedCarts, ({ one }) => ({
  user: one(users, {
    fields: [abandonedCarts.userId],
    references: [users.id],
  }),
}));

// SEO Metadata (per-page/per-product SEO overrides)
export const seoMetadata = pgTable("seo_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // product, category, page
  entityId: uuid("entity_id").notNull(),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: text("meta_description"),
  metaKeywords: text("meta_keywords"),
  ogTitle: varchar("og_title", { length: 255 }),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  noIndex: boolean("no_index").default(false).notNull(),
  noFollow: boolean("no_follow").default(false).notNull(),
  structuredData: jsonb("structured_data"), // JSON-LD data
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory Alerts
export const inventoryAlerts = pgTable("inventory_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").references(() => productVariants.id, {
    onDelete: "cascade",
  }),
  threshold: integer("threshold").notNull().default(5),
  alertSent: boolean("alert_sent").default(false).notNull(),
  alertSentAt: timestamp("alert_sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryAlertsRelations = relations(inventoryAlerts, ({ one }) => ({
  product: one(products, {
    fields: [inventoryAlerts.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [inventoryAlerts.variantId],
    references: [productVariants.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Brand = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type Coupon = typeof coupons.$inferSelect;
export type NewCoupon = typeof coupons.$inferInsert;
export type OrderTimeline = typeof orderTimeline.$inferSelect;
export type NewOrderTimeline = typeof orderTimeline.$inferInsert;
export type OrderReturn = typeof orderReturns.$inferSelect;
export type NewOrderReturn = typeof orderReturns.$inferInsert;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
export type MediaFolder = typeof mediaFolders.$inferSelect;
export type NewMediaFolder = typeof mediaFolders.$inferInsert;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
export type StockNotification = typeof stockNotifications.$inferSelect;
export type NewStockNotification = typeof stockNotifications.$inferInsert;
export type ProductQuestion = typeof productQuestions.$inferSelect;
export type NewProductQuestion = typeof productQuestions.$inferInsert;
export type SizeGuide = typeof sizeGuides.$inferSelect;
export type NewSizeGuide = typeof sizeGuides.$inferInsert;
export type ShippingZone = typeof shippingZones.$inferSelect;
export type NewShippingZone = typeof shippingZones.$inferInsert;
export type ShippingZonePincode = typeof shippingZonePincodes.$inferSelect;
export type NewShippingZonePincode = typeof shippingZonePincodes.$inferInsert;
export type GuestOrder = typeof guestOrders.$inferSelect;
export type NewGuestOrder = typeof guestOrders.$inferInsert;
export type AbandonedCart = typeof abandonedCarts.$inferSelect;
export type NewAbandonedCart = typeof abandonedCarts.$inferInsert;
export type SeoMetadata = typeof seoMetadata.$inferSelect;
export type NewSeoMetadata = typeof seoMetadata.$inferInsert;
export type InventoryAlert = typeof inventoryAlerts.$inferSelect;
export type NewInventoryAlert = typeof inventoryAlerts.$inferInsert;
export type AdminNotification = typeof adminNotifications.$inferSelect;
export type NewAdminNotification = typeof adminNotifications.$inferInsert;
