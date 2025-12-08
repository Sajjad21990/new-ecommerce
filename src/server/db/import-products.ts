import { db } from "./index";
import { products, productImages, categories } from "./schema";
import { eq } from "drizzle-orm";
import TurndownService from "turndown";

// Initialize Turndown for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

// Types for the old API response
interface OldApiImage {
  id: number;
  attributes: {
    name: string;
    url: string;
    formats?: {
      large?: { url: string };
      medium?: { url: string };
      small?: { url: string };
      thumbnail?: { url: string };
    };
  };
}

interface OldApiCategory {
  id: number;
  attributes: {
    name: string;
    slug: string;
    specialty?: string;
  };
}

interface OldApiProduct {
  id: number;
  attributes: {
    name: string;
    slug: string;
    description: string;
    shop_price: number;
    base_price: number;
    stock_quantity: number;
    inStock: boolean;
    search_text: string;
    care: string;
    delivery_and_returns: string;
    gifting: string;
    youtube_link: string;
    createdAt: string;
    updatedAt: string;
    images: {
      data: OldApiImage[];
    };
    category: {
      data: OldApiCategory | null;
    };
    sub_category: {
      data: OldApiCategory | null;
    };
  };
}

interface ApiResponse {
  data: OldApiProduct[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

// Convert HTML to Markdown
function htmlToMarkdown(html: string | null | undefined): string | null {
  if (!html || html.trim() === "") return null;
  try {
    const markdown = turndownService.turndown(html);
    return markdown.trim() || null;
  } catch {
    // If conversion fails, return the original content
    return html;
  }
}

// Cache for categories to avoid duplicate lookups
const categoryCache = new Map<string, string>();

async function getOrCreateCategory(
  name: string,
  slug: string,
  parentId: string | null = null
): Promise<string> {
  const cacheKey = `${slug}-${parentId || "root"}`;

  if (categoryCache.has(cacheKey)) {
    return categoryCache.get(cacheKey)!;
  }

  // Check if category exists
  const existing = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    categoryCache.set(cacheKey, existing[0].id);
    return existing[0].id;
  }

  // Create new category
  const [newCategory] = await db
    .insert(categories)
    .values({
      name,
      slug,
      parentId,
      isActive: true,
    })
    .returning();

  categoryCache.set(cacheKey, newCategory.id);
  console.log(`Created category: ${name} (${slug})`);
  return newCategory.id;
}

async function generateUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (existing.length === 0) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

async function fetchProducts(): Promise<ApiResponse> {
  console.log("Fetching products from old API...");

  const response = await fetch("https://www.pashafabrics.in/api/controller/product", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "authorization": "pasha-fabrics-india-controller-key",
    },
    body: JSON.stringify({
      brand: null,
      categoryIncluded: "all",
      collectionName: "category",
      subCategory: false,
      attributeNames: ["slug"],
      attributeValues: [""],
      operator: "$containsi",
      pagination: true,
      pageNumber: 1,
      pageSize: 20000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data as ApiResponse;
}

function parseYoutubeLink(youtubeLink: string): object | null {
  if (!youtubeLink) return null;

  try {
    return JSON.parse(youtubeLink);
  } catch {
    return null;
  }
}

async function deleteExistingProducts() {
  console.log("Deleting existing products and images...");

  // Delete all product images first (due to foreign key constraint)
  await db.delete(productImages);
  console.log("Deleted all product images");

  // Delete all products
  await db.delete(products);
  console.log("Deleted all products");
}

async function importProducts() {
  console.log("Starting product import...\n");

  // Delete existing products first
  await deleteExistingProducts();
  console.log("");

  const apiResponse = await fetchProducts();
  const allProducts = apiResponse.data;

  console.log(`Found ${allProducts.length} products to import\n`);

  let created = 0;
  let failed = 0;
  const errors: { slug: string; error: string }[] = [];

  for (let i = 0; i < allProducts.length; i++) {
    const oldProduct = allProducts[i];
    const attrs = oldProduct.attributes;

    try {
      // Handle category
      let categoryId: string | null = null;
      let parentCategoryId: string | null = null;

      // Create parent category if exists
      if (attrs.category?.data) {
        const cat = attrs.category.data.attributes;
        parentCategoryId = await getOrCreateCategory(cat.name, cat.slug, null);
      }

      // Create subcategory if exists, use it as the product's category
      if (attrs.sub_category?.data) {
        const subCat = attrs.sub_category.data.attributes;
        categoryId = await getOrCreateCategory(subCat.name, subCat.slug, parentCategoryId);
      } else if (parentCategoryId) {
        categoryId = parentCategoryId;
      }

      // Generate unique slug
      const slug = await generateUniqueSlug(attrs.slug);

      // Parse tags from search_text - split by newlines and spaces
      const tags = attrs.search_text
        ? attrs.search_text
            .split(/[\n\s]+/) // Split by newlines and spaces
            .map((t) => t.trim())
            .filter((t) => t.length > 0)
        : null;

      // Parse youtube link
      const youtubeLink = parseYoutubeLink(attrs.youtube_link);

      // Convert HTML fields to Markdown
      const description = htmlToMarkdown(attrs.description);
      const care = htmlToMarkdown(attrs.care);
      const deliveryAndReturns = htmlToMarkdown(attrs.delivery_and_returns);
      const gifting = htmlToMarkdown(attrs.gifting);

      // Insert product
      const [newProduct] = await db
        .insert(products)
        .values({
          name: attrs.name,
          slug,
          description,
          basePrice: String(attrs.shop_price),
          salePrice: attrs.base_price !== attrs.shop_price ? String(attrs.base_price) : null,
          categoryId,
          isActive: true, // All imported products are active
          stockQuantity: attrs.stock_quantity,
          care,
          deliveryAndReturns,
          gifting,
          youtubeLink,
          searchText: attrs.search_text,
          tags,
          publishedAt: new Date(),
        })
        .returning();

      // Insert images
      if (attrs.images?.data && attrs.images.data.length > 0) {
        const imageValues = attrs.images.data.map((img, index) => {
          // Use the large format if available, otherwise use the original URL
          const imageUrl =
            img.attributes.formats?.large?.url ||
            img.attributes.formats?.medium?.url ||
            img.attributes.url;

          return {
            productId: newProduct.id,
            url: imageUrl,
            altText: img.attributes.name || attrs.name,
            sortOrder: index,
            isPrimary: index === 0,
          };
        });

        await db.insert(productImages).values(imageValues);
      }

      created++;

      // Progress log every 50 products
      if ((i + 1) % 50 === 0 || i === allProducts.length - 1) {
        console.log(`Progress: ${i + 1}/${allProducts.length} products processed`);
      }
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push({ slug: attrs.slug, error: errorMessage });
      console.error(`Failed to import ${attrs.slug}: ${errorMessage}`);
    }
  }

  console.log("\n========== Import Complete ==========");
  console.log(`Total products: ${allProducts.length}`);
  console.log(`Created: ${created}`);
  console.log(`Failed: ${failed}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach((e) => console.log(`  - ${e.slug}: ${e.error}`));
  }
}

// Run the import
importProducts()
  .then(() => {
    console.log("\nImport finished successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  });
