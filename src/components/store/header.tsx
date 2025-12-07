"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  ChevronDown,
  Phone,
  Truck,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { SearchDialog } from "@/components/store/search-dialog";
import { CartDrawer } from "@/components/store/cart-drawer";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlist";

// Placeholder categories - will be fetched from API
const categories = [
  {
    name: "New Arrivals",
    slug: "new-arrivals",
    children: [],
  },
  {
    name: "Categories",
    slug: "categories",
    children: [
      { name: "Tops", slug: "tops", children: ["Long Sleeve Tees", "Short Sleeve Tees", "Tank Tops", "Sweaters"] },
      { name: "Bottoms", slug: "bottoms", children: ["Leggings", "Sweat Pants", "Harem Pants"] },
      { name: "Sports Bras", slug: "sports-bras", children: [] },
      { name: "Swim Wear", slug: "swim-wear", children: [] },
    ],
  },
  {
    name: "Sales",
    slug: "sales",
    children: [],
  },
  {
    name: "Brands",
    slug: "brands",
    children: [],
  },
];

export function Header() {
  const { data: session, status } = useSession();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { getItemCount, openCart } = useCartStore();
  const { getItemCount: getWishlistCount } = useWishlistStore();
  const cartCount = getItemCount();
  const wishlistCount = getWishlistCount();

  return (
    <header className="sticky top-0 z-50 bg-white border-b">
      {/* Top Bar */}
      <div className="border-b bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-10 text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <a href="tel:+911234567890" className="flex items-center gap-1 hover:text-gray-900">
                <Phone className="h-3.5 w-3.5" />
                <span>+91 123 456 7890</span>
              </a>
              <Link href="/shipping" className="hidden sm:flex items-center gap-1 hover:text-gray-900">
                <Truck className="h-3.5 w-3.5" />
                <span>Shipping & Returns</span>
              </Link>
              <Link href="/terms" className="hidden md:flex items-center gap-1 hover:text-gray-900">
                <FileText className="h-3.5 w-3.5" />
                <span>Terms</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {status === "authenticated" ? (
                <span className="text-gray-900">Hi, {session.user.name?.split(" ")[0]}</span>
              ) : (
                <Link href="/login" className="hover:text-gray-900">
                  Sign In or Register
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Toggle */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <nav className="flex flex-col gap-4 mt-8">
                {categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/categories/${category.slug}`}
                    className="text-lg font-medium hover:text-gray-600"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
                <hr className="my-4" />
                <Link href="/about" className="hover:text-gray-600">About Us</Link>
                <Link href="/contact" className="hover:text-gray-600">Contact Us</Link>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="text-xl font-bold tracking-tight">
            STORE
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {categories.map((category) => (
              <div
                key={category.slug}
                className="relative"
                onMouseEnter={() => setActiveCategory(category.slug)}
                onMouseLeave={() => setActiveCategory(null)}
              >
                <Link
                  href={`/categories/${category.slug}`}
                  className={cn(
                    "flex items-center gap-1 py-5 text-sm font-medium hover:text-gray-600 transition-colors",
                    activeCategory === category.slug && "text-gray-600"
                  )}
                >
                  {category.name}
                  {category.children.length > 0 && (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </Link>

                {/* Mega Menu Dropdown */}
                {category.children.length > 0 && activeCategory === category.slug && (
                  <div className="absolute top-full left-0 w-[500px] bg-white border shadow-lg rounded-b-lg p-6">
                    <div className="grid grid-cols-3 gap-8">
                      {category.children.map((child) => (
                        <div key={child.slug}>
                          <Link
                            href={`/categories/${child.slug}`}
                            className="font-medium hover:text-gray-600 block mb-2"
                          >
                            {child.name}
                          </Link>
                          {child.children && child.children.length > 0 && (
                            <ul className="space-y-1.5">
                              {child.children.map((subChild) => (
                                <li key={subChild}>
                                  <Link
                                    href={`/categories/${child.slug}/${subChild.toLowerCase().replace(/ /g, "-")}`}
                                    className="text-sm text-gray-600 hover:text-gray-900"
                                  >
                                    {subChild}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Link href="/about" className="py-5 text-sm font-medium hover:text-gray-600">
              About Us
            </Link>
            <Link href="/contact" className="py-5 text-sm font-medium hover:text-gray-600">
              Contact Us
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Wishlist */}
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-black text-white text-xs rounded-full flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={openCart}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-black text-white text-xs rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {status === "authenticated" ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/account">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/account/orders">My Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/wishlist">Wishlist</Link>
                    </DropdownMenuItem>
                    {session.user.role === "admin" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href="/admin">Admin Panel</Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()}>
                      Sign Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login">Sign In</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register">Create Account</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Search Dialog */}
      <SearchDialog open={isSearchOpen} onOpenChange={setIsSearchOpen} />

      {/* Cart Drawer */}
      <CartDrawer />
    </header>
  );
}
