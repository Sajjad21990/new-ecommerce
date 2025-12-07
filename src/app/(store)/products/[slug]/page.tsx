"use client";

import { use, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, Minus, Plus, ShoppingBag, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ProductCard } from "@/components/store/product-card";
import { ProductReviews } from "@/components/store/product-reviews";
import { RecentlyViewed } from "@/components/store/recently-viewed";
import { SocialShare } from "@/components/store/social-share";
import { CompareButton } from "@/components/store/comparison-bar";
import { StockNotification } from "@/components/store/stock-notification";
import { SizeGuide } from "@/components/store/size-guide";
import { ProductQuestions } from "@/components/store/product-questions";
import { PincodeChecker } from "@/components/store/pincode-checker";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";
import { useRecentlyViewedStore } from "@/stores/recently-viewed";
import { toast } from "sonner";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const { addItem } = useCartStore();
  const { toggleItem: toggleWishlist, isInWishlist } = useWishlistStore();
  const { addItem: addToRecentlyViewed } = useRecentlyViewedStore();

  const { data: product, isLoading, error } = trpc.product.getBySlug.useQuery({ slug });
  const { data: similarProducts } = trpc.product.getSimilar.useQuery(
    { productId: product?.id || "", limit: 4 },
    { enabled: !!product?.id }
  );
  // Track recently viewed products
  useEffect(() => {
    if (product) {
      addToRecentlyViewed({
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.salePrice ? parseFloat(product.salePrice) : parseFloat(product.basePrice),
        originalPrice: product.salePrice ? parseFloat(product.basePrice) : undefined,
        image: product.images?.[0]?.url,
      });
    }
  }, [product, addToRecentlyViewed]);

  if (error) {
    notFound();
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="w-20 h-20 rounded" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const images = product.images || [];
  const variants = product.variants || [];
  const reviews = product.reviews || [];

  const basePrice = parseFloat(product.basePrice);
  const salePrice = product.salePrice ? parseFloat(product.salePrice) : null;
  const currentPrice = salePrice || basePrice;
  const discount = salePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : null;

  // Get variant price if selected
  const selectedVariantData = variants.find((v) => v.id === selectedVariant);
  const variantPrice = selectedVariantData?.price
    ? parseFloat(selectedVariantData.price)
    : null;
  const displayPrice = variantPrice || currentPrice;

  // Group variants by attribute
  const sizes = [...new Set(variants.filter((v) => v.size).map((v) => v.size))];
  const colors = [...new Set(variants.filter((v) => v.color).map((v) => ({
    name: v.color,
    hex: v.colorHex,
  })))];

  // Find matching variant based on selections
  const findVariant = (size: string | null, color: string | null) => {
    return variants.find(
      (v) =>
        (!size || v.size === size) &&
        (!color || v.color === color)
    );
  };

  const handleSizeChange = (size: string) => {
    setSelectedSize(size);
    const variant = findVariant(size, selectedColor);
    setSelectedVariant(variant?.id || null);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    const variant = findVariant(selectedSize, color);
    setSelectedVariant(variant?.id || null);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const handleAddToCart = () => {
    // Validate variant selection if variants exist
    if (variants.length > 0) {
      if (sizes.length > 0 && !selectedSize) {
        toast.error("Please select a size");
        return;
      }
      if (colors.length > 0 && !selectedColor) {
        toast.error("Please select a color");
        return;
      }
    }

    const stock = selectedVariantData?.stock ?? 99;
    if (stock <= 0) {
      toast.error("This item is out of stock");
      return;
    }

    addItem({
      productId: product.id,
      variantId: selectedVariant,
      name: product.name,
      slug: product.slug,
      price: displayPrice,
      originalPrice: salePrice ? basePrice : undefined,
      quantity,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
      colorHex: selectedVariantData?.colorHex || undefined,
      image: images[0]?.url,
      stock,
    });

    toast.success("Added to cart!");
  };

  const handleToggleWishlist = () => {
    toggleWishlist({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: displayPrice,
      originalPrice: salePrice ? basePrice : undefined,
      image: images[0]?.url,
      isNew: product.isNew,
    });

    if (isInWishlist(product.id)) {
      toast.success("Removed from wishlist");
    } else {
      toast.success("Added to wishlist!");
    }
  };

  const inWishlist = isInWishlist(product?.id || "");

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        {product.category && (
          <>
            <span>/</span>
            <Link
              href={`/categories/${product.category.slug}`}
              className="hover:text-foreground"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {images.length > 0 ? (
              <>
                <Image
                  src={images[selectedImage].url}
                  alt={images[selectedImage].altText || product.name}
                  fill
                  className="object-cover"
                  priority
                />
                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={() =>
                        setSelectedImage(
                          selectedImage === 0 ? images.length - 1 : selectedImage - 1
                        )
                      }
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={() =>
                        setSelectedImage(
                          selectedImage === images.length - 1 ? 0 : selectedImage + 1
                        )
                      }
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <span>No Image</span>
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {discount && (
                <Badge className="bg-red-500">-{discount}%</Badge>
              )}
              {product.isNew && <Badge className="bg-black">New</Badge>}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImage(index)}
                  className={cn(
                    "relative w-20 h-20 rounded border-2 overflow-hidden flex-shrink-0",
                    selectedImage === index
                      ? "border-black"
                      : "border-transparent"
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.altText || `${product.name} ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Title & Brand */}
          <div>
            {product.brand && (
              <Link
                href={`/brands/${product.brand.slug}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                {product.brand.name}
              </Link>
            )}
            <h1 className="text-3xl font-bold mt-1">{product.name}</h1>

            {/* Rating */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        "h-4 w-4",
                        i < Math.round(averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({reviews.length} reviews)
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatPrice(displayPrice)}</span>
            {salePrice && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(basePrice)}
              </span>
            )}
          </div>

          {/* Short Description */}
          {product.shortDescription && (
            <p className="text-muted-foreground">{product.shortDescription}</p>
          )}

          <Separator />

          {/* Size Selection */}
          {sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">Size</span>
                <SizeGuide categoryId={product.categoryId || undefined} />
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    onClick={() => handleSizeChange(size!)}
                    className="min-w-[48px]"
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {colors.length > 0 && (
            <div>
              <span className="text-sm font-medium mb-3 block">
                Color: {selectedColor || "Select a color"}
              </span>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorChange(color.name!)}
                    className={cn(
                      "w-10 h-10 rounded-full border-2",
                      selectedColor === color.name
                        ? "ring-2 ring-offset-2 ring-black"
                        : ""
                    )}
                    style={{ backgroundColor: color.hex || color.name || undefined }}
                    title={color.name || ""}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <span className="text-sm font-medium mb-3 block">Quantity</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedVariantData && (
                <span className="text-sm text-muted-foreground">
                  {selectedVariantData.stock} in stock
                </span>
              )}
            </div>
          </div>

          {/* Add to Cart */}
          {(() => {
            const isOutOfStock = selectedVariantData ? selectedVariantData.stock <= 0 : false;
            const variantLabel = [selectedSize, selectedColor].filter(Boolean).join(", ");

            return isOutOfStock ? (
              <div className="space-y-3">
                <Button size="lg" className="w-full" disabled>
                  Out of Stock
                </Button>
                <StockNotification
                  productId={product.id}
                  productName={product.name}
                  variantId={selectedVariant || undefined}
                  variantLabel={variantLabel || undefined}
                />
              </div>
            ) : (
              <div className="flex gap-3">
                <Button size="lg" className="flex-1" onClick={handleAddToCart}>
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Add to Cart
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleToggleWishlist}
                  className={cn(inWishlist && "text-red-500 hover:text-red-600")}
                >
                  <Heart className={cn("h-5 w-5", inWishlist && "fill-current")} />
                </Button>
              </div>
            );
          })()}

          {/* Compare & Share */}
          <div className="flex items-center justify-between pt-2">
            <CompareButton
              product={{
                productId: product.id,
                name: product.name,
                slug: product.slug,
                price: displayPrice,
                originalPrice: salePrice ? basePrice : undefined,
                image: images[0]?.url,
                categoryId: product.categoryId || undefined,
              }}
            />
            <SocialShare
              url={typeof window !== "undefined" ? window.location.href : ""}
              title={product.name}
              description={product.shortDescription || undefined}
            />
          </div>

          {/* Pincode Checker */}
          <PincodeChecker />

          {/* Additional Info */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="description">
              <AccordionTrigger>Description</AccordionTrigger>
              <AccordionContent>
                <div className="prose prose-sm max-w-none">
                  {product.description || "No description available."}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="shipping">
              <AccordionTrigger>Shipping & Returns</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>Free shipping on orders over Rs.999</p>
                  <p>Standard delivery: 3-5 business days</p>
                  <p>Express delivery: 1-2 business days</p>
                  <p>30-day return policy for unused items</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="mt-16">
        <ProductReviews productId={product.id} />
      </section>

      {/* Product Questions */}
      <section className="mt-16">
        <ProductQuestions productId={product.id} />
      </section>

      {/* Similar Products */}
      {similarProducts && similarProducts.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-8">You May Also Like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {similarProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                basePrice={p.basePrice}
                salePrice={p.salePrice}
                imageUrl={p.images?.[0]?.url}
                imageAlt={p.images?.[0]?.altText ?? undefined}
                isNew={p.isNew}
                isFeatured={p.isFeatured}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed */}
      <RecentlyViewed excludeProductId={product.id} />
    </div>
  );
}
