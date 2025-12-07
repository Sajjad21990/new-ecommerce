"use client";

import { useState } from "react";
import {
  Percent,
  Plus,
  Search,
  Loader2,
  Calendar,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  IndianRupee,
  Tag,
  Hash,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const couponFormSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50, "Code must be at most 50 characters"),
  type: z.enum(["percentage", "fixed"]),
  value: z.number().positive("Value must be positive"),
  minOrderAmount: z.number().min(0).optional().nullable(),
  maxDiscount: z.number().min(0).optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validUntil: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type CouponFormData = z.infer<typeof couponFormSchema>;

export default function CouponsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<string | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: stats } = trpc.coupon.adminStats.useQuery();
  const { data, isLoading } = trpc.coupon.adminList.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    status: status as "active" | "inactive" | "expired" | "all" | undefined,
  });

  const { data: editingCouponData } = trpc.coupon.adminGetById.useQuery(
    { id: editingCoupon! },
    { enabled: !!editingCoupon }
  );

  const createCoupon = trpc.coupon.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Coupon created successfully");
      utils.coupon.adminList.invalidate();
      utils.coupon.adminStats.invalidate();
      setIsDialogOpen(false);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create coupon");
    },
  });

  const updateCoupon = trpc.coupon.adminUpdate.useMutation({
    onSuccess: () => {
      toast.success("Coupon updated successfully");
      utils.coupon.adminList.invalidate();
      utils.coupon.adminStats.invalidate();
      setEditingCoupon(null);
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update coupon");
    },
  });

  const deleteCoupon = trpc.coupon.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Coupon deleted successfully");
      utils.coupon.adminList.invalidate();
      utils.coupon.adminStats.invalidate();
      setDeletingCoupon(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete coupon");
    },
  });

  const toggleStatus = trpc.coupon.adminToggleStatus.useMutation({
    onSuccess: () => {
      toast.success("Coupon status updated");
      utils.coupon.adminList.invalidate();
      utils.coupon.adminStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      type: "percentage",
      value: 0,
      isActive: true,
    },
  });

  const watchType = watch("type");

  const onSubmit = (data: CouponFormData) => {
    const payload = {
      ...data,
      code: data.code.toUpperCase().replace(/\s/g, ""),
      minOrderAmount: data.minOrderAmount || null,
      maxDiscount: data.maxDiscount || null,
      usageLimit: data.usageLimit || null,
      validFrom: data.validFrom ? new Date(data.validFrom) : null,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
    };

    if (editingCoupon) {
      updateCoupon.mutate({ id: editingCoupon, data: payload });
    } else {
      createCoupon.mutate(payload);
    }
  };

  const handleEdit = (couponId: string) => {
    setEditingCoupon(couponId);
  };

  // Update form when editing coupon data loads
  if (editingCouponData && editingCoupon) {
    const coupon = editingCouponData;
    setValue("code", coupon.code);
    setValue("type", coupon.type);
    setValue("value", parseFloat(coupon.value));
    setValue(
      "minOrderAmount",
      coupon.minOrderAmount ? parseFloat(coupon.minOrderAmount) : null
    );
    setValue(
      "maxDiscount",
      coupon.maxDiscount ? parseFloat(coupon.maxDiscount) : null
    );
    setValue("usageLimit", coupon.usageLimit);
    setValue(
      "validFrom",
      coupon.validFrom
        ? new Date(coupon.validFrom).toISOString().split("T")[0]
        : null
    );
    setValue(
      "validUntil",
      coupon.validUntil
        ? new Date(coupon.validUntil).toISOString().split("T")[0]
        : null
    );
    setValue("isActive", coupon.isActive);
  }

  const formatPrice = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const getCouponStatus = (coupon: {
    isActive: boolean;
    validFrom: Date | null;
    validUntil: Date | null;
    usageLimit: number | null;
    usedCount: number;
  }) => {
    const now = new Date();
    if (!coupon.isActive) return { label: "Inactive", color: "bg-gray-100 text-gray-800" };
    if (coupon.validUntil && new Date(coupon.validUntil) < now)
      return { label: "Expired", color: "bg-red-100 text-red-800" };
    if (coupon.validFrom && new Date(coupon.validFrom) > now)
      return { label: "Scheduled", color: "bg-blue-100 text-blue-800" };
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
      return { label: "Exhausted", color: "bg-orange-100 text-orange-800" };
    return { label: "Active", color: "bg-green-100 text-green-800" };
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-muted-foreground mt-1">
            Manage discount codes and promotions
          </p>
        </div>
        <Dialog
          open={isDialogOpen || !!editingCoupon}
          onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setEditingCoupon(null);
              reset();
            } else {
              setIsDialogOpen(true);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCoupon ? "Edit Coupon" : "Create Coupon"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="code">Coupon Code</Label>
                <Input
                  id="code"
                  {...register("code")}
                  placeholder="SUMMER20"
                  className="uppercase"
                />
                {errors.code && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.code.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Discount Type</Label>
                  <Select
                    value={watchType}
                    onValueChange={(value) =>
                      setValue("type", value as "percentage" | "fixed")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="value">
                    {watchType === "percentage" ? "Percentage" : "Amount"}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    {...register("value")}
                    placeholder={watchType === "percentage" ? "20" : "500"}
                  />
                  {errors.value && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.value.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minOrderAmount">Min. Order (₹)</Label>
                  <Input
                    id="minOrderAmount"
                    type="number"
                    {...register("minOrderAmount")}
                    placeholder="1000"
                  />
                </div>
                <div>
                  <Label htmlFor="maxDiscount">Max. Discount (₹)</Label>
                  <Input
                    id="maxDiscount"
                    type="number"
                    {...register("maxDiscount")}
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="usageLimit">Usage Limit</Label>
                <Input
                  id="usageLimit"
                  type="number"
                  {...register("usageLimit")}
                  placeholder="Unlimited"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">Valid From</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    {...register("validFrom")}
                  />
                </div>
                <div>
                  <Label htmlFor="validUntil">Valid Until</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    {...register("validUntil")}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={watch("isActive")}
                  onCheckedChange={(checked) => setValue("isActive", checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCoupon(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createCoupon.isPending || updateCoupon.isPending}
                >
                  {(createCoupon.isPending || updateCoupon.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingCoupon ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Coupons
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCoupons || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Coupons
            </CardTitle>
            <Percent className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.activeCoupons || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expired
            </CardTitle>
            <Calendar className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.expiredCoupons || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usage
            </CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsage || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search coupons..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.coupons.length === 0 ? (
            <div className="text-center py-16">
              <Percent className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No coupons found</h3>
              <p className="text-muted-foreground mb-4">
                {search
                  ? "Try adjusting your search"
                  : "Create your first coupon to get started"}
              </p>
              {!search && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Coupon
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.coupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <span className="font-mono font-semibold">
                          {coupon.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        {coupon.type === "percentage" ? (
                          <span>{parseFloat(coupon.value)}% off</span>
                        ) : (
                          <span>{formatPrice(coupon.value)} off</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          {coupon.minOrderAmount && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <IndianRupee className="h-3 w-3" />
                              Min: {formatPrice(coupon.minOrderAmount)}
                            </div>
                          )}
                          {coupon.maxDiscount && (
                            <div className="text-muted-foreground">
                              Max: {formatPrice(coupon.maxDiscount)}
                            </div>
                          )}
                          {!coupon.minOrderAmount && !coupon.maxDiscount && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {coupon.usedCount}
                          {coupon.usageLimit && ` / ${coupon.usageLimit}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm space-y-1">
                          <div>From: {formatDate(coupon.validFrom)}</div>
                          <div>Until: {formatDate(coupon.validUntil)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleStatus.mutate({ id: coupon.id })}
                            title={coupon.isActive ? "Deactivate" : "Activate"}
                          >
                            {coupon.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(coupon.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-700"
                            disabled={coupon.usedCount > 0}
                            title={
                              coupon.usedCount > 0
                                ? "Cannot delete used coupons"
                                : "Delete coupon"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * 20 + 1} to{" "}
                {Math.min(page * 20, data.total)} of {data.total} coupons
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCoupon}
        onOpenChange={(open) => !open && setDeletingCoupon(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Coupon?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              coupon.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingCoupon && deleteCoupon.mutate({ id: deletingCoupon })}
            >
              {deleteCoupon.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
