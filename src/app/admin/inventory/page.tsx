"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Package,
  AlertTriangle,
  PackageX,
  PackageCheck,
  Search,
  ChevronDown,
  ChevronRight,
  Save,
  Loader2,
  Edit,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";

type StockFilter = "all" | "low_stock" | "out_of_stock" | "in_stock";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [page, setPage] = useState(1);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [editingStock, setEditingStock] = useState<{
    variantId: string;
    productName: string;
    variantLabel: string;
    currentStock: number;
    newStock: number;
  } | null>(null);

  const { data, isLoading, refetch } = trpc.inventory.getOverview.useQuery({
    page,
    limit: 50,
    filter,
    search: search || undefined,
  });

  const updateStockMutation = trpc.inventory.updateStock.useMutation({
    onSuccess: () => {
      toast.success("Stock updated successfully");
      refetch();
      setEditingStock(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update stock");
    },
  });

  const updateInStockMutation = trpc.inventory.updateInStock.useMutation({
    onSuccess: () => {
      toast.success("Stock status updated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update stock status");
    },
  });

  const toggleExpand = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const handleStockUpdate = () => {
    if (!editingStock) return;

    updateStockMutation.mutate({
      variantId: editingStock.variantId,
      stock: editingStock.newStock,
      adjustment: "set",
    });
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case "in_stock":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
            In Stock
          </Badge>
        );
      case "low_stock":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">
            Low Stock
          </Badge>
        );
      case "out_of_stock":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20">
            Out of Stock
          </Badge>
        );
      default:
        return null;
    }
  };

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-sm text-muted-foreground">
          Track and manage stock levels across all products
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Stock</CardTitle>
            <PackageCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats?.inStock || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats?.lowStock || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
            <PackageX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats?.outOfStock || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-background"
          />
        </div>
        <Select
          value={filter}
          onValueChange={(value: StockFilter) => {
            setFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Inventory Table */}
      <Card className="border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-center">Variants</TableHead>
                <TableHead className="text-center">Total Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32">
                    <div className="flex items-center justify-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Loading inventory...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Package className="h-8 w-8 mb-2 opacity-50" />
                      <p>No products found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map((item) => (
                  <>
                    <TableRow key={item.id} className="group">
                      <TableCell>
                        {item.hasVariants && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleExpand(item.id)}
                          >
                            {expandedProducts.has(item.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {item.sku || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {item.variants.length || 0}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {item.totalStock}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.inStock}
                            onCheckedChange={(checked) => {
                              updateInStockMutation.mutate({
                                productId: item.id,
                                inStock: checked,
                              });
                            }}
                            disabled={updateInStockMutation.isPending}
                          />
                          <span className={`text-sm ${item.inStock ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {item.inStock ? "In Stock" : "Out of Stock"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {!item.hasVariants && (
                          <span className="text-xs text-muted-foreground">No Variants</span>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded variant rows */}
                    {expandedProducts.has(item.id) &&
                      item.variants.map((variant) => (
                        <TableRow
                          key={variant.id}
                          className="bg-muted/30 hover:bg-muted/50"
                        >
                          <TableCell></TableCell>
                          <TableCell className="pl-8">
                            <span className="text-muted-foreground text-sm">
                              {[variant.size, variant.color]
                                .filter(Boolean)
                                .join(" / ") || "Default Variant"}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-sm">
                            {variant.sku || "-"}
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-center">
                            <span
                              className={
                                variant.stock === 0
                                  ? "text-red-600 dark:text-red-400 font-semibold"
                                  : variant.stock <= 5
                                  ? "text-amber-600 dark:text-amber-400 font-semibold"
                                  : "font-semibold"
                              }
                            >
                              {variant.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            {variant.stock === 0 ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 text-xs">
                                Out
                              </Badge>
                            ) : variant.stock <= 5 ? (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 text-xs">
                                Low
                              </Badge>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8"
                              onClick={() =>
                                setEditingStock({
                                  variantId: variant.id,
                                  productName: item.name,
                                  variantLabel: [variant.size, variant.color]
                                    .filter(Boolean)
                                    .join(" / ") || "Default Variant",
                                  currentStock: variant.stock,
                                  newStock: variant.stock,
                                })
                              }
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" />
                              Update
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Stock Dialog */}
      <Dialog open={!!editingStock} onOpenChange={() => setEditingStock(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Stock</DialogTitle>
            <DialogDescription>
              {editingStock?.productName} - {editingStock?.variantLabel}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Current Stock</span>
              <span className="text-lg font-semibold">{editingStock?.currentStock}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Stock Quantity</label>
              <Input
                type="number"
                min={0}
                value={editingStock?.newStock ?? 0}
                onChange={(e) =>
                  setEditingStock((prev) =>
                    prev ? { ...prev, newStock: parseInt(e.target.value) || 0 } : null
                  )
                }
                className="bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStock(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleStockUpdate}
              disabled={updateStockMutation.isPending}
            >
              {updateStockMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
