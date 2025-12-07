import { Metadata } from "next";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://store.com";

type Props = {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const product = await db.query.products.findFirst({
    where: eq(products.slug, slug),
    columns: {
      name: true,
      shortDescription: true,
      description: true,
      basePrice: true,
      salePrice: true,
    },
    with: {
      images: {
        limit: 1,
        columns: {
          url: true,
          altText: true,
        },
      },
      brand: {
        columns: {
          name: true,
        },
      },
      category: {
        columns: {
          name: true,
        },
      },
    },
  });

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  const description =
    product.shortDescription ||
    product.description?.slice(0, 160) ||
    `Shop ${product.name} at Store. Premium quality fashion products with fast delivery across India.`;

  const price = product.salePrice || product.basePrice;
  const image = product.images?.[0]?.url;

  return {
    title: product.name,
    description,
    keywords: [
      product.name,
      product.brand?.name,
      product.category?.name,
      "buy online",
      "India",
    ].filter(Boolean) as string[],
    openGraph: {
      title: product.name,
      description,
      url: `${siteUrl}/products/${slug}`,
      siteName: "Store",
      images: image
        ? [
            {
              url: image,
              width: 800,
              height: 800,
              alt: product.images?.[0]?.altText || product.name,
            },
          ]
        : [],
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      images: image ? [image] : [],
    },
    other: {
      "product:price:amount": price,
      "product:price:currency": "INR",
    },
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
