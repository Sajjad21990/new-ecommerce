"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { X, SlidersHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  hex?: string; // For color filters
}

interface ProductFiltersProps {
  brands?: FilterOption[];
  categories?: FilterOption[];
  sizes?: FilterOption[];
  colors?: FilterOption[];
  minPrice?: number;
  maxPrice?: number;
  className?: string;
}

export function ProductFilters({
  brands = [],
  categories = [],
  sizes = [],
  colors = [],
  minPrice = 0,
  maxPrice = 10000,
  className,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current filter values from URL
  const currentBrands = searchParams.get("brands")?.split(",").filter(Boolean) || [];
  const currentCategories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const currentSizes = searchParams.get("sizes")?.split(",").filter(Boolean) || [];
  const currentColors = searchParams.get("colors")?.split(",").filter(Boolean) || [];
  const currentMinPrice = Number(searchParams.get("minPrice")) || minPrice;
  const currentMaxPrice = Number(searchParams.get("maxPrice")) || maxPrice;

  const [priceRange, setPriceRange] = useState([currentMinPrice, currentMaxPrice]);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setPriceRange([currentMinPrice, currentMaxPrice]);
  }, [currentMinPrice, currentMaxPrice]);

  const updateFilters = (key: string, values: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    if (values.length > 0) {
      params.set(key, values.join(","));
    } else {
      params.delete(key);
    }
    params.set("page", "1"); // Reset to first page
    router.push(`?${params.toString()}`);
  };

  const updatePriceRange = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (priceRange[0] > minPrice) {
      params.set("minPrice", priceRange[0].toString());
    } else {
      params.delete("minPrice");
    }
    if (priceRange[1] < maxPrice) {
      params.set("maxPrice", priceRange[1].toString());
    } else {
      params.delete("maxPrice");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const toggleFilter = (key: string, value: string, current: string[]) => {
    const newValues = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilters(key, newValues);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    const sort = searchParams.get("sort");
    if (sort) params.set("sort", sort);
    router.push(`?${params.toString()}`);
  };

  const activeFilterCount =
    currentBrands.length +
    currentCategories.length +
    currentSizes.length +
    currentColors.length +
    (currentMinPrice > minPrice ? 1 : 0) +
    (currentMaxPrice < maxPrice ? 1 : 0);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Active Filters */}
      {activeFilterCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Active Filters</span>
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentBrands.map((brand) => (
              <Badge key={brand} variant="secondary" className="gap-1">
                {brands.find((b) => b.value === brand)?.label || brand}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleFilter("brands", brand, currentBrands)}
                />
              </Badge>
            ))}
            {currentCategories.map((cat) => (
              <Badge key={cat} variant="secondary" className="gap-1">
                {categories.find((c) => c.value === cat)?.label || cat}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleFilter("categories", cat, currentCategories)}
                />
              </Badge>
            ))}
            {currentSizes.map((size) => (
              <Badge key={size} variant="secondary" className="gap-1">
                {size}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleFilter("sizes", size, currentSizes)}
                />
              </Badge>
            ))}
            {currentColors.map((color) => (
              <Badge key={color} variant="secondary" className="gap-1">
                {colors.find((c) => c.value === color)?.label || color}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleFilter("colors", color, currentColors)}
                />
              </Badge>
            ))}
            {(currentMinPrice > minPrice || currentMaxPrice < maxPrice) && (
              <Badge variant="secondary" className="gap-1">
                {formatPrice(currentMinPrice)} - {formatPrice(currentMaxPrice)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setPriceRange([minPrice, maxPrice]);
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("minPrice");
                    params.delete("maxPrice");
                    router.push(`?${params.toString()}`);
                  }}
                />
              </Badge>
            )}
          </div>
        </div>
      )}

      <Accordion type="multiple" defaultValue={["price", "categories", "brands", "sizes", "colors"]}>
        {/* Price Range */}
        <AccordionItem value="price">
          <AccordionTrigger>Price Range</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
              <Slider
                value={priceRange}
                onValueChange={setPriceRange}
                min={minPrice}
                max={maxPrice}
                step={100}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="h-8 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" onClick={updatePriceRange} className="w-full">
                Apply
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Categories */}
        {categories.length > 0 && (
          <AccordionItem value="categories">
            <AccordionTrigger>Categories</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.value}`}
                      checked={currentCategories.includes(category.value)}
                      onCheckedChange={() =>
                        toggleFilter("categories", category.value, currentCategories)
                      }
                    />
                    <Label
                      htmlFor={`category-${category.value}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {category.label}
                    </Label>
                    {category.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({category.count})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Brands */}
        {brands.length > 0 && (
          <AccordionItem value="brands">
            <AccordionTrigger>Brands</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {brands.map((brand) => (
                  <div key={brand.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`brand-${brand.value}`}
                      checked={currentBrands.includes(brand.value)}
                      onCheckedChange={() =>
                        toggleFilter("brands", brand.value, currentBrands)
                      }
                    />
                    <Label
                      htmlFor={`brand-${brand.value}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {brand.label}
                    </Label>
                    {brand.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({brand.count})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Sizes */}
        {sizes.length > 0 && (
          <AccordionItem value="sizes">
            <AccordionTrigger>Sizes</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <Button
                    key={size.value}
                    variant={currentSizes.includes(size.value) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFilter("sizes", size.value, currentSizes)}
                    className="min-w-[40px]"
                  >
                    {size.label}
                  </Button>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Colors */}
        {colors.length > 0 && (
          <AccordionItem value="colors">
            <AccordionTrigger>Colors</AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => toggleFilter("colors", color.value, currentColors)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      currentColors.includes(color.value)
                        ? "ring-2 ring-offset-2 ring-black"
                        : ""
                    )}
                    style={{ backgroundColor: color.hex || color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );

  return (
    <>
      {/* Desktop Filters */}
      <div className={cn("hidden lg:block", className)}>
        <FilterContent />
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
