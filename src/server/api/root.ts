import { createTRPCRouter, createCallerFactory } from "@/server/api/trpc";
import { productRouter } from "./routers/product";
import { categoryRouter } from "./routers/category";
import { brandRouter } from "./routers/brand";
import { cartRouter } from "./routers/cart";
import { orderRouter } from "./routers/order";
import { addressRouter } from "./routers/address";
import { userRouter } from "./routers/user";
import { contentRouter } from "./routers/content";
import { settingsRouter } from "./routers/settings";
import { returnsRouter } from "./routers/returns";
import { emailTemplatesRouter } from "./routers/emailTemplates";
import { reportsRouter } from "./routers/reports";
import { mediaRouter } from "./routers/media";
import { stockNotificationRouter } from "./routers/stockNotification";
import { sizeGuideRouter } from "./routers/sizeGuide";
import { productQuestionRouter } from "./routers/productQuestion";
import { seoRouter } from "./routers/seo";
import { inventoryAlertRouter } from "./routers/inventoryAlert";
import { inventoryRouter } from "./routers/inventory";
import { notificationsRouter } from "./routers/notifications";
import { dashboardRouter } from "./routers/dashboard";
import { abandonedCartRouter } from "./routers/abandonedCart";

/**
 * Root router for the tRPC API
 * All routers are added here
 */
export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  product: productRouter,
  category: categoryRouter,
  brand: brandRouter,
  cart: cartRouter,
  order: orderRouter,
  address: addressRouter,
  user: userRouter,
  content: contentRouter,
  settings: settingsRouter,
  returns: returnsRouter,
  emailTemplates: emailTemplatesRouter,
  reports: reportsRouter,
  media: mediaRouter,
  stockNotification: stockNotificationRouter,
  sizeGuide: sizeGuideRouter,
  productQuestion: productQuestionRouter,
  seo: seoRouter,
  inventoryAlert: inventoryAlertRouter,
  inventory: inventoryRouter,
  notifications: notificationsRouter,
  abandonedCart: abandonedCartRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;

// Create a caller factory for server-side calls
export const createCaller = createCallerFactory(appRouter);
