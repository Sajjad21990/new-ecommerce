import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For migrations and single queries
const migrationClient = postgres(connectionString, { max: 1 });

// For query purposes with connection pooling
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });

// Export for migrations
export const migrationDb = drizzle(migrationClient, { schema });

export type Database = typeof db;
