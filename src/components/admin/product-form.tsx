"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Trash2,
  X,
  ImageIcon,
  Sparkles,
  Loader2,
  Save,
  Eye,
  Package,
  Tag,
  DollarSign,
  Layers,
  Settings,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import { MediaPicker, type MediaAsset } from "@/components/admin/media-picker";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens"),
  description: z.string().optional(),
  shortDescription: z.string().max(200).optional(),
  care: z.string().optional(),
  deliveryAndReturns: z.string().optional(),
  gifting: z.string().optional(),
  sku: z.string().optional(),
  basePrice: z.coerce.number().positive("Price must be positive"),
  salePrice: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  brandId: z.string().uuid().optional().or(z.literal("")),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  isNew: z.boolean(),
  tags: z.string().optional(),
  images: z.array(
    z.object({
      url: z.string().url("Must be a valid URL"),
      altText: z.string().optional(),
      isPrimary: z.boolean(),
      sortOrder: z.number(),
    })
  ),
  variants: z.array(
    z.object({
      sku: z.string().optional(),
      size: z.string().optional(),
      color: z.string().optional(),
      colorHex: z.string().optional(),
      description: z.string().optional(),
      price: z.union([z.coerce.number().positive(), z.literal("")]).optional(),
      stock: z.number().min(0),
    })
  ),
  seo: z.object({
    metaTitle: z.string().max(70).optional(),
    metaDescription: z.string().max(160).optional(),
    metaKeywords: z.string().optional(),
    ogTitle: z.string().max(70).optional(),
    ogDescription: z.string().max(200).optional(),
    ogImage: z.string().optional(),
    canonicalUrl: z.string().optional(),
    noIndex: z.boolean(),
    noFollow: z.boolean(),
  }).optional(),
});

type ProductFormValues = z.infer<typeof productSchema>;

type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

type ProductVariant = {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  description: string | null;
  price: string | null;
  stock: number;
  isActive: boolean;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  care: string | null;
  deliveryAndReturns: string | null;
  gifting: string | null;
  sku: string | null;
  basePrice: string;
  salePrice: string | null;
  categoryId: string | null;
  brandId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isNew: boolean;
  tags: string[] | null;
  images: ProductImage[];
  variants: ProductVariant[];
};

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!product;
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(["general", "pricing", "images"]);

  const utils = trpc.useUtils();
  const { data: categories } = trpc.category.adminList.useQuery();
  const { data: brands } = trpc.brand.adminList.useQuery();

  const form = useForm<ProductFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: product?.name || "",
      slug: product?.slug || "",
      description: product?.description || "",
      shortDescription: product?.shortDescription || "",
      care: product?.care || "",
      deliveryAndReturns: product?.deliveryAndReturns || "",
      gifting: product?.gifting || "",
      sku: product?.sku || "",
      basePrice: product ? parseFloat(product.basePrice) : 0,
      salePrice: product?.salePrice ? parseFloat(product.salePrice) : "",
      categoryId: product?.categoryId || "",
      brandId: product?.brandId || "",
      isActive: product?.isActive ?? true,
      isFeatured: product?.isFeatured ?? false,
      isNew: product?.isNew ?? true,
      tags: product?.tags?.join(", ") || "",
      images: product?.images?.map((img) => ({
        url: img.url,
        altText: img.altText || "",
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      })) || [],
      variants: product?.variants?.map((v) => ({
        sku: v.sku || "",
        size: v.size || "",
        color: v.color || "",
        colorHex: v.colorHex || "",
        description: v.description || "",
        price: v.price ? parseFloat(v.price) : "",
        stock: v.stock,
      })) || [],
      seo: {
        metaTitle: "",
        metaDescription: "",
        metaKeywords: "",
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        canonicalUrl: "",
        noIndex: false,
        noFollow: false,
      },
    },
  });

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({
    control: form.control,
    name: "images",
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const createMutation = trpc.product.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      utils.product.adminList.invalidate();
      router.push("/admin/products");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create product");
    },
  });

  const updateMutation = trpc.product.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      utils.product.adminList.invalidate();
      router.push("/admin/products");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update product");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Watch form values for live preview
  const watchedName = form.watch("name");
  const watchedBasePrice = form.watch("basePrice");
  const watchedSalePrice = form.watch("salePrice");
  const watchedShortDescription = form.watch("shortDescription");
  const watchedImages = form.watch("images");
  const watchedIsActive = form.watch("isActive");
  const watchedIsFeatured = form.watch("isFeatured");
  const watchedIsNew = form.watch("isNew");
  const watchedTags = form.watch("tags");

  const onSubmit = (data: ProductFormValues) => {
    const tags = data.tags
      ? data.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description || undefined,
      shortDescription: data.shortDescription || undefined,
      care: data.care || undefined,
      deliveryAndReturns: data.deliveryAndReturns || undefined,
      gifting: data.gifting || undefined,
      sku: data.sku || undefined,
      basePrice: data.basePrice,
      salePrice: data.salePrice ? Number(data.salePrice) : undefined,
      categoryId: data.categoryId || undefined,
      brandId: data.brandId || undefined,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      isNew: data.isNew,
      tags,
      images: data.images.length > 0 ? data.images : undefined,
      variants: data.variants.length > 0
        ? data.variants.map((v) => ({
            ...v,
            price: v.price ? Number(v.price) : undefined,
          }))
        : undefined,
    };

    if (isEditing) {
      updateMutation.mutate({ id: product.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleNameChange = (value: string) => {
    form.setValue("name", value);
    if (!isEditing || !form.getValues("slug")) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("slug", slug);
    }
  };

  const setPrimaryImage = (index: number) => {
    const images = form.getValues("images");
    images.forEach((_, i) => {
      form.setValue(`images.${i}.isPrimary`, i === index);
    });
  };

  const handleMediaSelect = (assets: MediaAsset[]) => {
    const currentImages = form.getValues("images");
    const newImages = assets.map((asset, idx) => ({
      url: asset.url,
      altText: asset.altText || "",
      isPrimary: currentImages.length === 0 && idx === 0,
      sortOrder: currentImages.length + idx,
    }));
    newImages.forEach((img) => appendImage(img));
  };

  const generateSEO = async () => {
    const name = form.getValues("name");
    const description = form.getValues("description");
    const shortDescription = form.getValues("shortDescription");
    const tags = form.getValues("tags");

    if (!name) {
      toast.error("Please enter a product name first");
      return;
    }

    setIsGeneratingSEO(true);
    try {
      const response = await fetch("/api/ai/generate-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          shortDescription,
          tags,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate SEO");
      }

      const seoData = await response.json();

      form.setValue("seo.metaTitle", seoData.metaTitle || "");
      form.setValue("seo.metaDescription", seoData.metaDescription || "");
      form.setValue("seo.metaKeywords", seoData.metaKeywords || "");
      form.setValue("seo.ogTitle", seoData.ogTitle || "");
      form.setValue("seo.ogDescription", seoData.ogDescription || "");

      toast.success("SEO content generated successfully!");
    } catch (error) {
      toast.error("Failed to generate SEO content");
      console.error(error);
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  // Get primary image for preview
  const primaryImage = watchedImages.find((img) => img.isPrimary) || watchedImages[0];

  // Parse tags for display
  const tagsArray = watchedTags
    ? watchedTags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Get category and brand names
  const selectedCategory = categories?.find((c) => c.id === form.watch("categoryId"));
  const selectedBrand = brands?.find((b) => b.id === form.watch("brandId"));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Accordion
              type="multiple"
              value={expandedSections}
              onValueChange={setExpandedSections}
              className="space-y-4"
            >
              {/* General Information */}
              <AccordionItem value="general" className="border-border/50 bg-card/50 backdrop-blur-sm rounded-lg border">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">General Information</h3>
                      <p className="text-xs text-muted-foreground">Basic product details</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name *</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                onChange={(e) => handleNameChange(e.target.value)}
                                placeholder="Enter product name"
                                className="bg-background"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Slug *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="product-url-slug" className="bg-background" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="shortDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Short Description</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Brief product description (max 200 chars)"
                              className="bg-background"
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/200 characters
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Description (Markdown)</FormLabel>
                          <FormControl>
                            <MarkdownEditor
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Detailed product description..."
                              height={200}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="care"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Care Instructions (Markdown)</FormLabel>
                          <FormControl>
                            <MarkdownEditor
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Care instructions for the product..."
                              height={150}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="deliveryAndReturns"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery & Returns (Markdown)</FormLabel>
                          <FormControl>
                            <MarkdownEditor
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Delivery and return policy..."
                              height={150}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="gifting"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gifting Information (Markdown)</FormLabel>
                          <FormControl>
                            <MarkdownEditor
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="Gift packaging and options..."
                              height={150}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="ABC-123" className="bg-background" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Pricing */}
              <AccordionItem value="pricing" className="border-border/50 bg-card/50 backdrop-blur-sm rounded-lg border">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Pricing</h3>
                      <p className="text-xs text-muted-foreground">Set product pricing</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="basePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price (INR) *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                              <Input {...field} type="number" min={0} step={0.01} className="pl-7 bg-background" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sale Price (INR)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                              <Input
                                {...field}
                                type="number"
                                min={0}
                                step={0.01}
                                placeholder="Optional"
                                className="pl-7 bg-background"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>Leave empty if not on sale</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {watchedSalePrice && Number(watchedSalePrice) > 0 && watchedBasePrice > 0 && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        Discount: {Math.round((1 - Number(watchedSalePrice) / watchedBasePrice) * 100)}% off
                      </p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Images */}
              <AccordionItem value="images" className="border-border/50 bg-card/50 backdrop-blur-sm rounded-lg border">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                      <ImageIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Images</h3>
                      <p className="text-xs text-muted-foreground">{imageFields.length} image(s) added</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  {imageFields.length === 0 ? (
                    <div
                      className="text-center py-12 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => setMediaPickerOpen(true)}
                    >
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-2">No images added yet</p>
                      <Button type="button" variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Images
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {imageFields.map((field, index) => {
                          const imageUrl = form.watch(`images.${index}.url`);
                          const isPrimary = form.watch(`images.${index}.isPrimary`);
                          return (
                            <div
                              key={field.id}
                              className={cn(
                                "relative group rounded-lg border-2 overflow-hidden transition-all",
                                isPrimary
                                  ? "border-primary ring-2 ring-primary/20"
                                  : "border-border hover:border-border/80"
                              )}
                            >
                              <div className="aspect-square relative bg-muted">
                                {imageUrl ? (
                                  <Image
                                    src={imageUrl}
                                    alt={form.watch(`images.${index}.altText`) || "Product image"}
                                    fill
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              {isPrimary && (
                                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded font-medium">
                                  Primary
                                </div>
                              )}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                {!isPrimary && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setPrimaryImage(index)}
                                    title="Set as primary"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeImage(index)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setMediaPickerOpen(true)}
                          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50 flex flex-col items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Plus className="h-6 w-6 mb-1" />
                          <span className="text-xs">Add More</span>
                        </button>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Variants */}
              <AccordionItem value="variants" className="border-border/50 bg-card/50 backdrop-blur-sm rounded-lg border">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                      <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">Variants</h3>
                      <p className="text-xs text-muted-foreground">{variantFields.length} variant(s)</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  {variantFields.length === 0 ? (
                    <div className="text-center py-8">
                      <Layers className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        No variants added yet. Add variants for different sizes, colors, etc.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          appendVariant({
                            sku: "",
                            size: "",
                            color: "",
                            colorHex: "",
                            description: "",
                            price: "",
                            stock: 0,
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Variant
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {variantFields.map((field, index) => (
                        <div
                          key={field.id}
                          className="p-4 rounded-lg border bg-background space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {form.watch(`variants.${index}.colorHex`) && (
                                <div
                                  className="h-5 w-5 rounded-full border"
                                  style={{
                                    backgroundColor: form.watch(`variants.${index}.colorHex`),
                                  }}
                                />
                              )}
                              <h4 className="font-medium text-sm">
                                {form.watch(`variants.${index}.size`) ||
                                  form.watch(`variants.${index}.color`) ||
                                  `Variant ${index + 1}`}
                              </h4>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeVariant(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Size</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="S, M, L..." className="h-9" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.color`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Color</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Red, Blue..." className="h-9" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.colorHex`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Color Code</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="color" className="h-9 p-1" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <FormField
                              control={form.control}
                              name={`variants.${index}.sku`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">SKU</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Variant SKU" className="h-9" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Price Override</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min={0}
                                      step={0.01}
                                      placeholder="Base price"
                                      className="h-9"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`variants.${index}.stock`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Stock</FormLabel>
                                  <FormControl>
                                    <Input {...field} type="number" min={0} className="h-9" />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          appendVariant({
                            sku: "",
                            size: "",
                            color: "",
                            colorHex: "",
                            description: "",
                            price: "",
                            stock: 0,
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Another Variant
                      </Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* SEO */}
              <AccordionItem value="seo" className="border-border/50 bg-card/50 backdrop-blur-sm rounded-lg border">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
                      <Search className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold">SEO & Meta Data</h3>
                      <p className="text-xs text-muted-foreground">Search engine optimization</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6">
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateSEO}
                        disabled={isGeneratingSEO}
                      >
                        {isGeneratingSEO ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>

                    <FormField
                      control={form.control}
                      name="seo.metaTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Product page title for search engines"
                              maxLength={70}
                              className="bg-background"
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/70 characters
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seo.metaDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Brief description for search results"
                              maxLength={160}
                              rows={3}
                              className="bg-background resize-none"
                            />
                          </FormControl>
                          <FormDescription>
                            {field.value?.length || 0}/160 characters
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seo.metaKeywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meta Keywords</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="keyword1, keyword2, keyword3"
                              className="bg-background"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <h4 className="font-medium text-sm">Open Graph (Social Media)</h4>

                    <FormField
                      control={form.control}
                      name="seo.ogTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OG Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Title for social media shares"
                              maxLength={70}
                              className="bg-background"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seo.ogDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>OG Description</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Description for social media shares"
                              maxLength={200}
                              rows={2}
                              className="bg-background resize-none"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="seo.noIndex"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-background">
                            <div>
                              <FormLabel className="text-sm">No Index</FormLabel>
                              <FormDescription className="text-xs">Hide from search</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="seo.noFollow"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-background">
                            <div>
                              <FormLabel className="text-sm">No Follow</FormLabel>
                              <FormDescription className="text-xs">Don&apos;t follow links</FormDescription>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Right Column - Preview & Settings */}
          <div className="space-y-6 lg:sticky lg:top-4 self-start">
            {/* Preview Card */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Image Preview */}
                <div className="aspect-square relative rounded-lg overflow-hidden bg-muted border">
                  {primaryImage ? (
                    <Image
                      src={primaryImage.url}
                      alt={primaryImage.altText || "Product preview"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="h-12 w-12 mb-2" />
                      <span className="text-xs">No image</span>
                    </div>
                  )}
                  {watchedIsNew && (
                    <Badge className="absolute top-2 left-2 bg-blue-500">New</Badge>
                  )}
                  {watchedSalePrice && Number(watchedSalePrice) > 0 && (
                    <Badge className="absolute top-2 right-2 bg-red-500">Sale</Badge>
                  )}
                </div>

                {/* Product Name */}
                <div>
                  <h3 className="font-semibold line-clamp-2">
                    {watchedName || "Product Name"}
                  </h3>
                  {watchedShortDescription && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {watchedShortDescription}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  {watchedSalePrice && Number(watchedSalePrice) > 0 ? (
                    <>
                      <span className="text-lg font-bold">
                        ₹{Number(watchedSalePrice).toLocaleString()}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        ₹{watchedBasePrice.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-lg font-bold">
                      ₹{watchedBasePrice > 0 ? watchedBasePrice.toLocaleString() : "0"}
                    </span>
                  )}
                </div>

                {/* Tags */}
                {tagsArray.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tagsArray.slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {tagsArray.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{tagsArray.length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status & Visibility */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Published</Label>
                        <p className="text-xs text-muted-foreground">Visible on store</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />

                <Separator />

                <FormField
                  control={form.control}
                  name="isFeatured"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Featured</Label>
                        <p className="text-xs text-muted-foreground">Show on homepage</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isNew"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">New Arrival</Label>
                        <p className="text-xs text-muted-foreground">Display new badge</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
              </CardContent>
            </Card>

            {/* Organization */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Organization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.parent ? `${cat.parent.name} / ` : ""}
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brandId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Brand</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {brands?.map((brand) => (
                            <SelectItem key={brand.id} value={brand.id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => {
                    const [inputValue, setInputValue] = useState("");
                    const tags = field.value
                      ? field.value.split(",").map((t) => t.trim()).filter(Boolean)
                      : [];

                    const addTag = (tag: string) => {
                      const trimmedTag = tag.trim();
                      if (trimmedTag && !tags.includes(trimmedTag)) {
                        const newTags = [...tags, trimmedTag].join(", ");
                        field.onChange(newTags);
                        setInputValue("");
                      }
                    };

                    const removeTag = (tagToRemove: string) => {
                      const newTags = tags.filter((t) => t !== tagToRemove).join(", ");
                      field.onChange(newTags);
                    };

                    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(inputValue);
                      } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
                        removeTag(tags[tags.length - 1]);
                      }
                    };

                    return (
                      <FormItem>
                        <FormLabel className="text-xs">Tags</FormLabel>
                        <FormControl>
                          <div className="space-y-2">
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs gap-1 pr-1"
                                  >
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() => removeTag(tag)}
                                      className="hover:bg-muted rounded-full p-0.5"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <Input
                              value={inputValue}
                              onChange={(e) => setInputValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              placeholder="Add tag..."
                              className="bg-background h-8 text-sm"
                            />
                          </div>
                        </FormControl>
                        <FormDescription className="text-xs">Press Enter to add</FormDescription>
                      </FormItem>
                    );
                  }}
                />
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Save Changes" : "Create Product"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/products")}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>

        <MediaPicker
          open={mediaPickerOpen}
          onOpenChange={setMediaPickerOpen}
          onSelect={handleMediaSelect}
          multiple={true}
        />
      </form>
    </Form>
  );
}
