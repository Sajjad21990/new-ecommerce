"use client";

import { useState } from "react";
import {
  FileText,
  Plus,
  Loader2,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image as ImageIcon,
  Type,
  List,
  AlertCircle,
  Ruler,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// Content type icons
const contentTypeIcons: Record<string, React.ReactNode> = {
  hero_banner: <ImageIcon className="h-5 w-5" />,
  promo_strip: <Type className="h-5 w-5" />,
  featured_categories: <List className="h-5 w-5" />,
  announcement: <AlertCircle className="h-5 w-5" />,
  footer_content: <FileText className="h-5 w-5" />,
  size_guide: <Ruler className="h-5 w-5" />,
};

// Content type labels
const contentTypeLabels: Record<string, string> = {
  hero_banner: "Hero Banner",
  promo_strip: "Promo Strip",
  featured_categories: "Featured Categories",
  announcement: "Announcement",
  footer_content: "Footer Content",
  size_guide: "Size Guide",
};

export default function ContentPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [deletingContent, setDeletingContent] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("hero_banner");

  // Form states
  const [formKey, setFormKey] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);

  const utils = trpc.useUtils();

  const { data: contentList, isLoading } = trpc.content.adminList.useQuery();
  const { data: contentTypes } = trpc.content.getContentTypes.useQuery();

  const { data: editingContentData } = trpc.content.adminGetById.useQuery(
    { id: editingContent! },
    { enabled: !!editingContent }
  );

  const upsertContent = trpc.content.adminUpsert.useMutation({
    onSuccess: () => {
      toast.success(editingContent ? "Content updated" : "Content created");
      utils.content.adminList.invalidate();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save content");
    },
  });

  const deleteContent = trpc.content.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Content deleted");
      utils.content.adminList.invalidate();
      setDeletingContent(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete content");
    },
  });

  const toggleStatus = trpc.content.adminToggleStatus.useMutation({
    onSuccess: () => {
      toast.success("Content status updated");
      utils.content.adminList.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status");
    },
  });

  const resetForm = () => {
    setIsDialogOpen(false);
    setEditingContent(null);
    setFormKey("");
    setFormTitle("");
    setFormContent("");
    setFormIsActive(true);
    setSelectedType("hero_banner");
  };

  const handleEdit = (contentId: string) => {
    setEditingContent(contentId);
    setIsDialogOpen(true);
  };

  // Update form when editing content data loads
  if (editingContentData && editingContent && isDialogOpen) {
    if (formKey !== editingContentData.key) {
      setFormKey(editingContentData.key);
      setFormTitle(editingContentData.title || "");
      setFormContent(JSON.stringify(editingContentData.content, null, 2));
      setFormIsActive(editingContentData.isActive);
      setSelectedType(editingContentData.key);
    }
  }

  const handleSubmit = () => {
    let parsedContent;
    try {
      parsedContent = formContent ? JSON.parse(formContent) : {};
    } catch {
      toast.error("Invalid JSON content");
      return;
    }

    upsertContent.mutate({
      key: formKey || selectedType,
      title: formTitle || contentTypeLabels[selectedType] || selectedType,
      content: parsedContent,
      isActive: formIsActive,
    });
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  // Get default content template based on type
  const getContentTemplate = (type: string): string => {
    const templates: Record<string, object> = {
      hero_banner: {
        slides: [
          {
            title: "Summer Collection",
            subtitle: "Up to 50% off",
            imageUrl: "https://example.com/banner.jpg",
            linkUrl: "/products",
            linkText: "Shop Now",
          },
        ],
      },
      promo_strip: {
        text: "Free shipping on orders above Rs.999",
        linkUrl: "/products",
        linkText: "Shop Now",
        bgColor: "#000000",
      },
      featured_categories: {
        categories: [
          {
            categoryId: "uuid-here",
            imageUrl: "https://example.com/category.jpg",
            title: "Category Name",
          },
        ],
      },
      announcement: {
        message: "New arrivals are here!",
        type: "info",
        dismissible: true,
      },
      footer_content: {
        about:
          "Your trusted destination for premium fashion and lifestyle products.",
        socialLinks: [
          { platform: "instagram", url: "https://instagram.com/store" },
          { platform: "facebook", url: "https://facebook.com/store" },
        ],
      },
      size_guide: {
        categories: [
          {
            name: "Tops",
            measurementLabels: ["Chest", "Length", "Shoulder"],
            measurements: [
              { size: "S", values: { Chest: "36", Length: "26", Shoulder: "15" } },
              { size: "M", values: { Chest: "38", Length: "27", Shoulder: "16" } },
              { size: "L", values: { Chest: "40", Length: "28", Shoulder: "17" } },
            ],
          },
        ],
      },
    };

    return JSON.stringify(templates[type] || {}, null, 2);
  };

  // Group content by type for the tabs
  const groupedContent = contentList?.reduce(
    (acc, content) => {
      const type = content.key;
      if (!acc[type]) acc[type] = [];
      acc[type].push(content);
      return acc;
    },
    {} as Record<string, typeof contentList>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Content Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage homepage banners, announcements, and other site content
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && resetForm()}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingContent ? "Edit Content" : "Create Content"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!editingContent && (
                <div>
                  <Label>Content Type</Label>
                  <Select
                    value={selectedType}
                    onValueChange={(value) => {
                      setSelectedType(value);
                      setFormKey(value);
                      setFormTitle(contentTypeLabels[value] || value);
                      setFormContent(getContentTemplate(value));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes?.map((type) => (
                        <SelectItem key={type.key} value={type.key}>
                          <div className="flex items-center gap-2">
                            {contentTypeIcons[type.key]}
                            <span>{type.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {contentTypes?.find((t) => t.key === selectedType)
                    ?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {
                        contentTypes.find((t) => t.key === selectedType)
                          ?.description
                      }
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="formKey">Key</Label>
                <Input
                  id="formKey"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="hero_banner"
                  disabled={!!editingContent}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Unique identifier for this content block
                </p>
              </div>

              <div>
                <Label htmlFor="formTitle">Title</Label>
                <Input
                  id="formTitle"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Hero Banner"
                />
              </div>

              <div>
                <Label htmlFor="formContent">Content (JSON)</Label>
                <Textarea
                  id="formContent"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="{}"
                  className="font-mono text-sm min-h-[300px]"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  JSON content for this block. Structure depends on content type.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="formIsActive"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
                <Label htmlFor="formIsActive">Active</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={upsertContent.isPending}
                >
                  {upsertContent.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingContent ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content Types Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {contentTypes?.map((type) => {
          const items = groupedContent?.[type.key] || [];
          const activeItem = items.find((i) => i.isActive);
          return (
            <Card key={type.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {contentTypeIcons[type.key]}
                    <CardTitle className="text-base">{type.name}</CardTitle>
                  </div>
                  <Badge variant={activeItem ? "default" : "secondary"}>
                    {activeItem ? "Active" : "Not Set"}
                  </Badge>
                </div>
                <CardDescription>{type.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {activeItem ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Updated {formatDate(activeItem.updatedAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(activeItem.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedType(type.key);
                      setFormKey(type.key);
                      setFormTitle(type.name);
                      setFormContent(getContentTemplate(type.key));
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Content
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* All Content List */}
      <Card>
        <CardHeader>
          <CardTitle>All Content</CardTitle>
          <CardDescription>
            View and manage all content blocks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !contentList || contentList.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first content block to get started
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {contentList.map((content) => (
                <div
                  key={content.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {contentTypeIcons[content.key] || (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {content.title || content.key}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {content.key}
                        </code>
                        <span className="text-sm text-muted-foreground">
                          Updated {formatDate(content.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={content.isActive ? "default" : "secondary"}
                    >
                      {content.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleStatus.mutate({ id: content.id })}
                      title={content.isActive ? "Deactivate" : "Activate"}
                    >
                      {content.isActive ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(content.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingContent(content.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingContent}
        onOpenChange={(open) => !open && setDeletingContent(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this
              content block.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                deletingContent && deleteContent.mutate({ id: deletingContent })
              }
            >
              {deleteContent.isPending ? (
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
