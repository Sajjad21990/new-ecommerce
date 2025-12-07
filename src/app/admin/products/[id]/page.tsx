"use client";

import { use } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  ImageIcon,
  Tag,
  DollarSign,
  Layers,
  BarChart3,
  Eye,
  Calendar,
  Box,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const { data: product, isLoading, error } = trpc.product.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const deleteMutation = trpc.product.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      utils.product.adminList.invalidate();
      router.push("/admin/products");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  if (error) {
    notFound();
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px]" />
          </div>
          <div>
            <Skeleton className="h-[300px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const primaryImage = product.images?.find((img) => img.isPrimary) || product.images?.[0];
  const totalStock = product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
              <Badge
                variant={product.isActive ? "default" : "secondary"}
                className={cn(
                  product.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : ""
                )}
              >
                {product.isActive ? "Active" : "Draft"}
              </Badge>
              {product.isFeatured && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  Featured
                </Badge>
              )}
              {product.isNew && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                  New
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              SKU: {product.sku || "—"} • Created {format(new Date(product.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/products/${product.slug}`} target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/admin/products/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Product</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{product.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate({ id })}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image Gallery */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  {/* Primary Image - Larger */}
                  {primaryImage && (
                    <div className="col-span-2 row-span-2">
                      <div className="aspect-square relative rounded-lg overflow-hidden bg-muted border-2 border-primary/20">
                        <Image
                          src={primaryImage.url}
                          alt={primaryImage.altText || product.name}
                          fill
                          className="object-cover"
                        />
                        <Badge className="absolute top-2 left-2 bg-primary">Primary</Badge>
                      </div>
                    </div>
                  )}
                  {/* Other Images */}
                  {product.images
                    .filter((img) => img.id !== primaryImage?.id)
                    .map((image) => (
                      <div key={image.id} className="aspect-square relative rounded-lg overflow-hidden bg-muted border">
                        <Image
                          src={image.url}
                          alt={image.altText || product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="aspect-video flex flex-col items-center justify-center bg-muted rounded-lg">
                  <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No images</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Description
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.shortDescription && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Short Description</p>
                  <p className="text-sm">{product.shortDescription}</p>
                </div>
              )}
              {product.description ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Full Description</p>
                  <p className="text-sm whitespace-pre-wrap">{product.description}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No description provided</p>
              )}
            </CardContent>
          </Card>

          {/* Variants */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Variants ({product.variants?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-3">
                  {product.variants.map((variant, index) => (
                    <div
                      key={variant.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-background"
                    >
                      <div className="flex items-center gap-3">
                        {variant.colorHex && (
                          <div
                            className="h-8 w-8 rounded-full border shadow-sm"
                            style={{ backgroundColor: variant.colorHex }}
                          />
                        )}
                        <div>
                          <p className="font-medium text-sm">
                            {[variant.size, variant.color].filter(Boolean).join(" / ") ||
                              `Variant ${index + 1}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {variant.sku || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-medium text-sm">
                            {variant.price
                              ? `₹${parseFloat(variant.price).toLocaleString()}`
                              : "Base price"}
                          </p>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <Badge
                            variant={variant.stock > 10 ? "default" : variant.stock > 0 ? "secondary" : "destructive"}
                            className={cn(
                              variant.stock > 10
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : variant.stock > 0
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : ""
                            )}
                          >
                            {variant.stock} in stock
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Layers className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No variants defined</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Pricing */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                {product.salePrice ? (
                  <>
                    <span className="text-2xl font-bold">
                      ₹{parseFloat(product.salePrice).toLocaleString()}
                    </span>
                    <span className="text-lg text-muted-foreground line-through">
                      ₹{parseFloat(product.basePrice).toLocaleString()}
                    </span>
                    <Badge className="bg-red-500 ml-2">
                      {Math.round((1 - parseFloat(product.salePrice) / parseFloat(product.basePrice)) * 100)}% off
                    </Badge>
                  </>
                ) : (
                  <span className="text-2xl font-bold">
                    ₹{parseFloat(product.basePrice).toLocaleString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inventory Summary */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Box className="h-4 w-4" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Stock</span>
                <Badge
                  variant={totalStock > 10 ? "default" : totalStock > 0 ? "secondary" : "destructive"}
                  className={cn(
                    totalStock > 10
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : totalStock > 0
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : ""
                  )}
                >
                  {totalStock} units
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Organization */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Category</p>
                <p className="text-sm font-medium">
                  {product.category?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Brand</p>
                <p className="text-sm font-medium">{product.brand?.name || "—"}</p>
              </div>
              {product.tags && product.tags.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {product.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(product.createdAt), "MMM d, yyyy HH:mm")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(product.updatedAt), "MMM d, yyyy HH:mm")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-xs">{product.slug}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
