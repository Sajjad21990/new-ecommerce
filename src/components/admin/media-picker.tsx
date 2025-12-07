"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Search,
  Upload,
  Folder,
  Image as ImageIcon,
  ChevronRight,
  Home,
  Loader2,
  X,
  Check,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  mimeType: string;
  size: number;
}

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (assets: MediaAsset[]) => void;
  multiple?: boolean;
  accept?: string; // e.g., "image/*"
  selectedIds?: string[];
}

export function MediaPicker({
  open,
  onOpenChange,
  onSelect,
  multiple = false,
  selectedIds = [],
}: MediaPickerProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssets, setSelectedAssets] = useState<Map<string, MediaAsset>>(
    new Map()
  );
  const [isUploading, setIsUploading] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: foldersData, isLoading: foldersLoading } = trpc.media.getFolders.useQuery(
    { parentId: currentFolderId },
    { enabled: open }
  );

  const { data: currentFolder } = trpc.media.getFolder.useQuery(
    { id: currentFolderId! },
    { enabled: open && !!currentFolderId }
  );

  const { data: assetsData, isLoading: assetsLoading } = trpc.media.getAssets.useQuery(
    {
      folderId: currentFolderId,
      search: searchQuery || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
    },
    { enabled: open }
  );

  const createAssetMutation = trpc.media.createAsset.useMutation({
    onSuccess: () => {
      utils.media.getAssets.invalidate();
    },
  });

  // Initialize selected assets from selectedIds
  const initializeSelected = useCallback(() => {
    if (selectedIds.length > 0 && assetsData?.assets) {
      const newSelected = new Map<string, MediaAsset>();
      assetsData.assets.forEach((asset) => {
        if (selectedIds.includes(asset.id)) {
          newSelected.set(asset.id, {
            id: asset.id,
            name: asset.name,
            url: asset.url,
            altText: asset.altText,
            width: asset.width,
            height: asset.height,
            mimeType: asset.mimeType,
            size: asset.size,
          });
        }
      });
      setSelectedAssets(newSelected);
    }
  }, [selectedIds, assetsData?.assets]);

  // File upload handler
  const handleFileUpload = useCallback(
    async (files: FileList) => {
      setIsUploading(true);
      const uploadedAssets: MediaAsset[] = [];

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
          const asset = await createAssetMutation.mutateAsync({
            name: file.name.replace(/\.[^/.]+$/, ""),
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

          if (asset) {
            uploadedAssets.push({
              id: asset.id,
              name: asset.name,
              url: asset.url,
              altText: asset.altText,
              width: asset.width,
              height: asset.height,
              mimeType: asset.mimeType,
              size: asset.size,
            });
          }
        } catch (error) {
          console.error("Upload error:", error);
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      setIsUploading(false);

      if (uploadedAssets.length > 0) {
        toast.success(`${uploadedAssets.length} files uploaded`);
        // Auto-select uploaded assets
        if (multiple) {
          const newSelected = new Map(selectedAssets);
          uploadedAssets.forEach((asset) => newSelected.set(asset.id, asset));
          setSelectedAssets(newSelected);
        } else {
          // Single select - select the first uploaded
          const newSelected = new Map<string, MediaAsset>();
          newSelected.set(uploadedAssets[0].id, uploadedAssets[0]);
          setSelectedAssets(newSelected);
        }
      }
    },
    [currentFolderId, createAssetMutation, multiple, selectedAssets]
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

  const toggleAssetSelection = (asset: MediaAsset) => {
    const newSelected = new Map(selectedAssets);
    if (newSelected.has(asset.id)) {
      newSelected.delete(asset.id);
    } else {
      if (!multiple) {
        newSelected.clear();
      }
      newSelected.set(asset.id, asset);
    }
    setSelectedAssets(newSelected);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedAssets.values()));
    onOpenChange(false);
    setSelectedAssets(new Map());
    setCurrentFolderId(null);
    setSearchQuery("");
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedAssets(new Map());
    setCurrentFolderId(null);
    setSearchQuery("");
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Select Media</DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                  <input
                    type="file"
                    multiple={multiple}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  />
                </label>
              </Button>
            </div>
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm mt-2">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100",
                !currentFolderId && "font-medium"
              )}
            >
              <Home className="h-4 w-4" />
              Media Library
            </button>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <button
                  onClick={() => setCurrentFolderId(crumb.id)}
                  className={cn(
                    "px-2 py-1 rounded hover:bg-gray-100",
                    index === breadcrumbs.length - 1 && "font-medium"
                  )}
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>

        {/* Content */}
        <div
          className="flex-1 overflow-auto p-4"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {foldersLoading || assetsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : folders.length === 0 && assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ImageIcon className="h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">No files or folders</p>
              <p className="text-sm text-gray-400">
                Drag and drop files here, or click Upload
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Folders */}
              {folders.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Folders</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="group cursor-pointer rounded-lg border bg-gray-50 p-3 hover:bg-gray-100 hover:border-gray-300 transition-all"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <div className="flex items-center justify-center mb-2">
                          <Folder className="h-10 w-10 text-gray-700" fill="currentColor" />
                        </div>
                        <p className="font-medium text-xs truncate text-center">
                          {folder.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assets */}
              {assets.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Assets</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {assets.map((asset) => {
                      const isSelected = selectedAssets.has(asset.id);
                      return (
                        <div
                          key={asset.id}
                          className={cn(
                            "group relative cursor-pointer rounded-lg border p-2 transition-all",
                            isSelected
                              ? "border-black ring-2 ring-black/20"
                              : "hover:border-gray-300 hover:shadow-sm"
                          )}
                          onClick={() =>
                            toggleAssetSelection({
                              id: asset.id,
                              name: asset.name,
                              url: asset.url,
                              altText: asset.altText,
                              width: asset.width,
                              height: asset.height,
                              mimeType: asset.mimeType,
                              size: asset.size,
                            })
                          }
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 z-10 bg-black text-white rounded-full p-1">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="aspect-square relative rounded overflow-hidden bg-gray-100">
                            {asset.mimeType.startsWith("image/") ? (
                              <Image
                                src={asset.url}
                                alt={asset.altText || asset.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <ImageIcon className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs font-medium truncate mt-2">{asset.name}</p>
                          <p className="text-xs text-gray-400">
                            {formatFileSize(asset.size)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload indicator */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
              <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Uploading...</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-500">
              {selectedAssets.size > 0
                ? `${selectedAssets.size} selected`
                : "No items selected"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={selectedAssets.size === 0}>
                {multiple ? `Select (${selectedAssets.size})` : "Select"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline Media Input component for forms
interface MediaInputProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  className?: string;
}

export function MediaInput({
  value,
  onChange,
  multiple = false,
  placeholder = "Select image",
  className,
}: MediaInputProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const values = Array.isArray(value) ? value : value ? [value] : [];

  const handleSelect = (assets: MediaAsset[]) => {
    if (multiple) {
      onChange(assets.map((a) => a.url));
    } else {
      onChange(assets[0]?.url || "");
    }
  };

  const removeImage = (url: string) => {
    if (multiple) {
      onChange(values.filter((v) => v !== url));
    } else {
      onChange("");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((url, index) => (
            <div
              key={index}
              className="relative group w-20 h-20 rounded-lg border overflow-hidden"
            >
              <Image src={url} alt="" fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
        <ImageIcon className="mr-2 h-4 w-4" />
        {values.length > 0 ? (multiple ? "Add More" : "Change Image") : placeholder}
      </Button>
      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleSelect}
        multiple={multiple}
      />
    </div>
  );
}
