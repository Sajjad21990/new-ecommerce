import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/server/db";
import { brands } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Brands",
  description: "Explore our collection of premium brands.",
};

async function getBrands() {
  return db.query.brands.findMany({
    where: eq(brands.isActive, true),
    orderBy: (brands, { asc }) => [asc(brands.name)],
  });
}

export default async function BrandsPage() {
  const allBrands = await getBrands();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Our Brands</h1>

      {allBrands.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No brands available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {allBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/products?brand=${brand.slug}`}
              className="group"
            >
              <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 border hover:border-gray-300 transition-colors">
                {brand.logo ? (
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    fill
                    className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-400">
                      {brand.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              <h2 className="mt-2 text-center font-medium group-hover:text-gray-600 transition-colors">
                {brand.name}
              </h2>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
