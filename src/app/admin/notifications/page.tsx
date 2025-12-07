"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Bell,
  ShoppingCart,
  Package,
  Star,
  RotateCcw,
  Users,
  AlertCircle,
  Check,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const iconMap = {
  order: ShoppingCart,
  inventory: Package,
  review: Star,
  return: RotateCcw,
  customer: Users,
  system: AlertCircle,
};

const colorMap = {
  order: "text-blue-500 bg-blue-50",
  inventory: "text-yellow-500 bg-yellow-50",
  review: "text-purple-500 bg-purple-50",
  return: "text-orange-500 bg-orange-50",
  customer: "text-green-500 bg-green-50",
  system: "text-gray-500 bg-gray-50",
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = trpc.notifications.getAll.useQuery({
    page,
    limit: 20,
  });

  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery();

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      toast.success("Marked as read");
      refetch();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("All notifications marked as read");
      refetch();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      toast.success("Notification deleted");
      refetch();
    },
  });

  const clearAllMutation = trpc.notifications.clearAll.useMutation({
    onSuccess: () => {
      toast.success("All notifications cleared");
      refetch();
    },
  });

  const notifications = data?.notifications || [];

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={!unreadCount || markAllAsReadMutation.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (confirm("Are you sure you want to clear all notifications?")) {
                clearAllMutation.mutate();
              }
            }}
            disabled={notifications.length === 0 || clearAllMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear all
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <Bell className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{unreadCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.type === "order").length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Inventory</CardTitle>
            <Package className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {notifications.filter((n) => n.type === "inventory").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={
                      notifications.length > 0 &&
                      selectedIds.size === notifications.length
                    }
                    onCheckedChange={selectAll}
                  />
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notification</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading notifications...
                  </TableCell>
                </TableRow>
              ) : notifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No notifications yet</p>
                  </TableCell>
                </TableRow>
              ) : (
                notifications.map((notification) => {
                  const Icon =
                    iconMap[notification.type as keyof typeof iconMap] || AlertCircle;
                  const colors =
                    colorMap[notification.type as keyof typeof colorMap] ||
                    "text-gray-500 bg-gray-50";
                  const [textColor, bgColor] = colors.split(" ");

                  return (
                    <TableRow
                      key={notification.id}
                      className={cn(!notification.isRead && "bg-blue-50/30")}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(notification.id)}
                          onCheckedChange={() => toggleSelect(notification.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div
                          className={cn(
                            "inline-flex items-center justify-center h-8 w-8 rounded-full",
                            bgColor
                          )}
                        >
                          <Icon className={cn("h-4 w-4", textColor)} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {notification.link ? (
                            <Link
                              href={notification.link}
                              className="font-medium hover:underline"
                            >
                              {notification.title}
                            </Link>
                          ) : (
                            <span className="font-medium">{notification.title}</span>
                          )}
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(notification.createdAt), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        {notification.isRead ? (
                          <Badge variant="secondary">Read</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800">Unread</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                markAsReadMutation.mutate({ id: notification.id })
                              }
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              deleteMutation.mutate({ id: notification.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page === data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
