"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  FolderPlus,
  Upload,
  Search,
  Grid3X3,
  List,
  MoreVertical,
  Folder,
  Image as ImageIcon,
  Trash2,
  Pencil,
  Move,
  ChevronRight,
  Home,
  X,
  Loader2,
  Download,
  Link as LinkIcon,
  Filter,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "list";
type SortBy = "createdAt" | "name" | "size";
type SortOrder = "asc" | "desc";

export default function MediaLibraryPage() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editAssetOpen, setEditAssetOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [moveFolderOpen, setMoveFolderOpen] = useState(false);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null);
  const [renameFolderOpen, setRenameFolderOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [deleteFolderOpen, setDeleteFolderOpen] = useState(false);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);

  // Queries
  const utils = trpc.useUtils();

  const { data: foldersData, isLoading: foldersLoading } = trpc.media.getFolders.useQuery({
    parentId: currentFolderId,
  });

  const { data: currentFolder } = trpc.media.getFolder.useQuery(
    { id: currentFolderId! },
    { enabled: !!currentFolderId }
  );

  const { data: assetsData, isLoading: assetsLoading } = trpc.media.getAssets.useQuery({
    folderId: currentFolderId,
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
    limit: 50,
  });

  const { data: allFolders } = trpc.media.getFolders.useQuery({});

  const { data: selectedAsset } = trpc.media.getAsset.useQuery(
    { id: selectedAssetId! },
    { enabled: !!selectedAssetId }
  );

  const { data: stats } = trpc.media.getStats.useQuery();

  // Mutations
  const createFolderMutation = trpc.media.createFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder created successfully");
      setCreateFolderOpen(false);
      setNewFolderName("");
      utils.media.getFolders.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const renameFolderMutation = trpc.media.renameFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder renamed successfully");
      setRenameFolderOpen(false);
      setRenameFolderId(null);
      setRenameFolderName("");
      utils.media.getFolders.invalidate();
      utils.media.getFolder.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteFolderMutation = trpc.media.deleteFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder deleted successfully");
      setDeleteFolderOpen(false);
      setDeleteFolderId(null);
      utils.media.getFolders.invalidate();
      utils.media.getAssets.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createAssetMutation = trpc.media.createAsset.useMutation({
    onSuccess: () => {
      utils.media.getAssets.invalidate();
      utils.media.getStats.invalidate();
    },
  });

  const updateAssetMutation = trpc.media.updateAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset updated successfully");
      utils.media.getAssets.invalidate();
      utils.media.getAsset.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAssetMutation = trpc.media.deleteAsset.useMutation({
    onSuccess: () => {
      toast.success("Asset deleted successfully");
      setSelectedAssetId(null);
      setEditAssetOpen(false);
      utils.media.getAssets.invalidate();
      utils.media.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const bulkDeleteMutation = trpc.media.bulkDeleteAssets.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} assets deleted`);
      setSelectedAssets(new Set());
      utils.media.getAssets.invalidate();
      utils.media.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const moveAssetsMutation = trpc.media.moveAssets.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} assets moved`);
      setSelectedAssets(new Set());
      setMoveFolderOpen(false);
      utils.media.getAssets.invalidate();
      utils.media.getFolders.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Handlers
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      setIsUploading(true);
      const uploadedCount = { success: 0, failed: 0 };

      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Upload failed");
          }

          const data = await response.json();

          // Create asset in database
          await createAssetMutation.mutateAsync({
            name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
            fileName: file.name,
            folderId: currentFolderId,
            url: data.url,
            publicId: data.publicId,
            mimeType: file.type,
            format: data.format || file.name.split(".").pop() || "",
            size: file.size,
            width: data.width,
            height: data.height,
            metadata: data,
          });

          uploadedCount.success++;
        } catch {
          uploadedCount.failed++;
        }
      }

      setIsUploading(false);

      if (uploadedCount.success > 0) {
        toast.success(`${uploadedCount.success} files uploaded successfully`);
      }
      if (uploadedCount.failed > 0) {
        toast.error(`${uploadedCount.failed} files failed to upload`);
      }
    },
    [currentFolderId, createAssetMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const toggleAssetSelection = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const selectAllAssets = () => {
    if (assetsData?.assets) {
      setSelectedAssets(new Set(assetsData.assets.map((a) => a.id)));
    }
  };

  const deselectAllAssets = () => {
    setSelectedAssets(new Set());
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const folders = foldersData || [];
  const assets = assetsData?.assets || [];
  const breadcrumbs = currentFolder?.breadcrumbs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground">
            {stats
              ? `${stats.totalAssets} assets, ${stats.totalFolders} folders, ${formatFileSize(stats.totalSize)}`
              : "Loading..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
          <Button asChild>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Upload
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 text-sm">
        <button
          onClick={() => setCurrentFolderId(null)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded hover:bg-accent",
            !currentFolderId && "font-medium"
          )}
        >
          <Home className="h-4 w-4" />
          Media Library
        </button>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <button
              onClick={() => setCurrentFolderId(crumb.id)}
              className={cn(
                "px-2 py-1 rounded hover:bg-accent",
                index === breadcrumbs.length - 1 && "font-medium"
              )}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card/50 backdrop-blur-sm p-4 rounded-lg border border-border/50">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {selectedAssets.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedAssets.size} selected
              </span>
              <Button variant="outline" size="sm" onClick={() => setMoveFolderOpen(true)}>
                <Move className="mr-2 h-4 w-4" />
                Move
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                onClick={() => bulkDeleteMutation.mutate({ ids: Array.from(selectedAssets) })}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllAssets}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          "min-h-[400px] bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-4",
          isUploading && "pointer-events-none opacity-50"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {foldersLoading || assetsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : folders.length === 0 && assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No files or folders</p>
            <p className="text-sm text-muted-foreground">
              Drag and drop files here, or click Upload
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Folders ({folders.length})
                </h3>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                      : "space-y-2"
                  )}
                >
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className={cn(
                        "group relative cursor-pointer rounded-lg border border-border/50 bg-muted/50 hover:bg-accent hover:border-border transition-all",
                        viewMode === "grid" ? "p-4" : "p-3 flex items-center gap-3"
                      )}
                      onClick={() => setCurrentFolderId(folder.id)}
                    >
                      <div
                        className={cn(
                          "flex items-center justify-center",
                          viewMode === "grid" ? "mb-2" : ""
                        )}
                      >
                        <Folder
                          className={cn(
                            "text-foreground",
                            viewMode === "grid" ? "h-12 w-12" : "h-8 w-8"
                          )}
                          fill="currentColor"
                        />
                      </div>
                      <div className={viewMode === "list" ? "flex-1" : "text-center"}>
                        <p className="font-medium text-sm truncate">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.assetCount} asset{folder.assetCount !== 1 ? "s" : ""}
                          {folder.childCount > 0 && `, ${folder.childCount} folder${folder.childCount !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "absolute opacity-0 group-hover:opacity-100 h-7 w-7",
                              viewMode === "grid" ? "top-2 right-2" : "right-2"
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setCurrentFolderId(folder.id)}>
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setRenameFolderId(folder.id);
                              setRenameFolderName(folder.name);
                              setRenameFolderOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              setDeleteFolderId(folder.id);
                              setDeleteFolderOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assets */}
            {assets.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Assets ({assetsData?.pagination.total || 0})
                  </h3>
                  {assets.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={selectAllAssets}>
                      Select All
                    </Button>
                  )}
                </div>
                <div
                  className={cn(
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                      : "space-y-2"
                  )}
                >
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className={cn(
                        "group relative cursor-pointer rounded-lg border border-border/50 transition-all",
                        selectedAssets.has(asset.id)
                          ? "border-primary ring-2 ring-primary/20"
                          : "hover:border-border hover:shadow-sm",
                        viewMode === "grid" ? "p-2" : "p-3 flex items-center gap-3"
                      )}
                      onClick={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                          toggleAssetSelection(asset.id);
                        } else {
                          setSelectedAssetId(asset.id);
                          setEditAssetOpen(true);
                        }
                      }}
                    >
                      <div
                        className={cn(
                          "absolute z-10",
                          viewMode === "grid" ? "top-3 left-3" : "left-3"
                        )}
                      >
                        <Checkbox
                          checked={selectedAssets.has(asset.id)}
                          onCheckedChange={() => toggleAssetSelection(asset.id)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "bg-background",
                            !selectedAssets.has(asset.id) && "opacity-0 group-hover:opacity-100"
                          )}
                        />
                      </div>
                      {viewMode === "grid" ? (
                        <>
                          <div className="aspect-square relative rounded overflow-hidden bg-muted">
                            {asset.mimeType.startsWith("image/") ? (
                              <Image
                                src={asset.url}
                                alt={asset.altText || asset.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium truncate mt-2">{asset.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {asset.width && asset.height
                              ? `${asset.width}×${asset.height} • `
                              : ""}
                            {formatFileSize(asset.size)}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 relative rounded overflow-hidden bg-muted flex-shrink-0">
                            {asset.mimeType.startsWith("image/") ? (
                              <Image
                                src={asset.url}
                                alt={asset.altText || asset.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{asset.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {asset.format.toUpperCase()} •{" "}
                              {asset.width && asset.height
                                ? `${asset.width}×${asset.height} • `
                                : ""}
                              {formatFileSize(asset.size)}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload indicator */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Uploading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your media files.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                createFolderMutation.mutate({
                  name: newFolderName,
                  parentId: currentFolderId,
                })
              }
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rename-folder-name">Folder Name</Label>
              <Input
                id="rename-folder-name"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                placeholder="Enter folder name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                renameFolderId &&
                renameFolderMutation.mutate({
                  id: renameFolderId,
                  name: renameFolderName,
                })
              }
              disabled={!renameFolderName.trim() || renameFolderMutation.isPending}
            >
              {renameFolderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={deleteFolderOpen} onOpenChange={setDeleteFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              What would you like to do with the contents of this folder?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDeleteFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                deleteFolderId &&
                deleteFolderMutation.mutate({
                  id: deleteFolderId,
                  moveContentsTo: null, // Move to root
                })
              }
              disabled={deleteFolderMutation.isPending}
            >
              Move to Root & Delete
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteFolderId &&
                deleteFolderMutation.mutate({
                  id: deleteFolderId,
                  // No moveContentsTo = delete all contents
                })
              }
              disabled={deleteFolderMutation.isPending}
            >
              {deleteFolderMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Assets Dialog */}
      <Dialog open={moveFolderOpen} onOpenChange={setMoveFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Assets</DialogTitle>
            <DialogDescription>
              Select a folder to move {selectedAssets.size} selected assets to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Destination Folder</Label>
              <Select
                value={moveTargetFolderId || "root"}
                onValueChange={(v) => setMoveTargetFolderId(v === "root" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Media Library (Root)</SelectItem>
                  {allFolders?.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                moveAssetsMutation.mutate({
                  ids: Array.from(selectedAssets),
                  folderId: moveTargetFolderId,
                })
              }
              disabled={moveAssetsMutation.isPending}
            >
              {moveAssetsMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Move
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Detail Dialog */}
      <Dialog open={editAssetOpen} onOpenChange={setEditAssetOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Asset Details</DialogTitle>
          </DialogHeader>
          {selectedAsset && (
            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8">
              {/* Preview & Metadata */}
              <div className="space-y-6">
                <div className="aspect-video relative rounded-lg overflow-hidden bg-muted border border-border/50 flex items-center justify-center">
                  {selectedAsset.mimeType.startsWith("image/") ? (
                    <Image
                      src={selectedAsset.url}
                      alt={selectedAsset.altText || selectedAsset.name}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-6 text-sm bg-muted/50 rounded-lg p-4">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Size</span>
                    <p className="font-medium mt-1">{formatFileSize(selectedAsset.size)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Dimensions</span>
                    <p className="font-medium mt-1">
                      {selectedAsset.width && selectedAsset.height
                        ? `${selectedAsset.width}×${selectedAsset.height}`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Format</span>
                    <p className="font-medium mt-1">{selectedAsset.format.toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Date</span>
                    <p className="font-medium mt-1">
                      {new Date(selectedAsset.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="asset-name">File Name</Label>
                  <Input
                    id="asset-name"
                    defaultValue={selectedAsset.name}
                    onBlur={(e) => {
                      if (e.target.value !== selectedAsset.name) {
                        updateAssetMutation.mutate({
                          id: selectedAsset.id,
                          name: e.target.value,
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="asset-alt">Alternative Text</Label>
                  <Input
                    id="asset-alt"
                    defaultValue={selectedAsset.altText || ""}
                    placeholder="Describe the image for accessibility"
                    onBlur={(e) => {
                      if (e.target.value !== (selectedAsset.altText || "")) {
                        updateAssetMutation.mutate({
                          id: selectedAsset.id,
                          altText: e.target.value,
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This text will be displayed if the asset can&apos;t be shown.
                  </p>
                </div>
                <div>
                  <Label htmlFor="asset-caption">Caption</Label>
                  <Textarea
                    id="asset-caption"
                    defaultValue={selectedAsset.caption || ""}
                    placeholder="Optional caption"
                    onBlur={(e) => {
                      if (e.target.value !== (selectedAsset.caption || "")) {
                        updateAssetMutation.mutate({
                          id: selectedAsset.id,
                          caption: e.target.value,
                        });
                      }
                    }}
                  />
                </div>
                <div>
                  <Label>Location</Label>
                  <Select
                    defaultValue={selectedAsset.folderId || "root"}
                    onValueChange={(v) =>
                      updateAssetMutation.mutate({
                        id: selectedAsset.id,
                        folderId: v === "root" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">Media Library (Root)</SelectItem>
                      {allFolders?.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.path}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAsset.url);
                      toast.success("URL copied to clipboard");
                    }}
                  >
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Copy URL
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedAsset.url} download target="_blank" rel="noopener">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteAssetMutation.mutate({ id: selectedAsset.id })}
                    disabled={deleteAssetMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
