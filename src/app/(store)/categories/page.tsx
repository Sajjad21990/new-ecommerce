import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/server/db";
import { categories } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse all product categories.",
};

async function getCategories() {
  return db.query.categories.findMany({
    where: eq(categories.isActive, true),
    orderBy: (categories, { asc }) => [asc(categories.sortOrder), asc(categories.name)],
  });
}

export default async function CategoriesPage() {
  const allCategories = await getCategories();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shop by Category</h1>

      {allCategories.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No categories available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {allCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group"
            >
              <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100">
                {category.image ? (
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                    {category.name.charAt(0)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className="text-white text-xl font-semibold text-center px-4">
                    {category.name}
                  </h2>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
