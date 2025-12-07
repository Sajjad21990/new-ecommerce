import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { users, categories, brands } from "./schema";

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function seed() {
  console.log("🌱 Seeding database...\n");

  // Create admin user
  console.log("Creating admin user...");
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const [admin] = await db
    .insert(users)
    .values({
      name: "Admin User",
      email: "admin@store.com",
      password: hashedPassword,
      role: "admin",
      emailVerified: new Date(),
    })
    .onConflictDoNothing()
    .returning();

  if (admin) {
    console.log("✅ Admin user created:");
    console.log("   Email: admin@store.com");
    console.log("   Password: admin123\n");
  } else {
    console.log("⏭️  Admin user already exists\n");
  }

  // Create sample categories
  console.log("Creating categories...");
  const categoryData = [
    { name: "Tops", slug: "tops", description: "T-shirts, shirts, and more", sortOrder: 1 },
    { name: "Bottoms", slug: "bottoms", description: "Jeans, pants, and shorts", sortOrder: 2 },
    { name: "Dresses", slug: "dresses", description: "Casual and formal dresses", sortOrder: 3 },
    { name: "Accessories", slug: "accessories", description: "Bags, belts, and jewelry", sortOrder: 4 },
    { name: "Footwear", slug: "footwear", description: "Shoes, sandals, and sneakers", sortOrder: 5 },
  ];

  for (const cat of categoryData) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }
  console.log("✅ Categories created\n");

  // Create sample brands
  console.log("Creating brands...");
  const brandData = [
    { name: "Nike", slug: "nike" },
    { name: "Adidas", slug: "adidas" },
    { name: "Puma", slug: "puma" },
    { name: "Levi's", slug: "levis" },
    { name: "Zara", slug: "zara" },
    { name: "H&M", slug: "hm" },
  ];

  for (const brand of brandData) {
    await db.insert(brands).values(brand).onConflictDoNothing();
  }
  console.log("✅ Brands created\n");

  console.log("🎉 Seeding complete!");
  console.log("\n📝 You can now log in to the admin panel:");
  console.log("   URL: http://localhost:3000/admin");
  console.log("   Email: admin@store.com");
  console.log("   Password: admin123");

  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
