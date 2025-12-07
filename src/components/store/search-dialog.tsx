"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Search, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = trpc.product.search.useQuery(
    { query: debouncedQuery, limit: 6 },
    { enabled: debouncedQuery.length >= 2 }
  );

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onOpenChange(false);
      setQuery("");
    }
  }, [query, router, onOpenChange]);

  const handleProductClick = useCallback(() => {
    onOpenChange(false);
    setQuery("");
  }, [onOpenChange]);

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products..."
            className="h-14 pl-12 pr-12 text-lg border-0 border-b rounded-none focus-visible:ring-0"
            autoFocus
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setQuery("")}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </form>

        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && debouncedQuery.length >= 2 && results?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No products found for &quot;{debouncedQuery}&quot;
              </p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-muted-foreground px-2 py-2">
                Products
              </p>
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={handleProductClick}
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="relative w-12 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                    {product.images?.[0]?.url ? (
                      <Image
                        src={product.images[0].url}
                        alt={product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.salePrice
                        ? formatPrice(product.salePrice)
                        : formatPrice(product.basePrice)}
                    </p>
                  </div>
                </Link>
              ))}
              {query.trim() && (
                <button
                  onClick={handleSearch}
                  className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm text-primary"
                >
                  View all results for &quot;{query}&quot;
                </button>
              )}
            </div>
          )}

          {debouncedQuery.length < 2 && query.length > 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">
                Type at least 2 characters to search
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
