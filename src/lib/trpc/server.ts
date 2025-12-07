import "server-only";

import { headers } from "next/headers";
import { cache } from "react";
import { createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

/**
 * Server-side tRPC caller for use in React Server Components
 *
 * Usage:
 * ```tsx
 * import { api } from "@/lib/trpc/server";
 *
 * export default async function Page() {
 *   const products = await api.product.getAll({ limit: 10 });
 *   return <ProductList products={products} />;
 * }
 * ```
 */
export const api = createCaller(createContext);
