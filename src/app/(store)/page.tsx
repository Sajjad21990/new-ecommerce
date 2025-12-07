import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gray-100">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-3 py-1 text-xs font-medium bg-black text-white rounded-full mb-4">
                New Collection 2024
              </span>
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-6">
                Discover Your
                <br />
                <span className="text-gray-600">Perfect Style</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md">
                Explore our curated collection of premium fashion and lifestyle products.
                Up to 60% off on selected items.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" asChild>
                  <Link href="/categories/new-arrivals">
                    Shop Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/categories">
                    Browse Categories
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative aspect-[4/5] bg-gray-200 rounded-lg overflow-hidden">
              {/* Hero image placeholder */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <span className="text-sm">Hero Image</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="border-y bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div>
              <p className="font-medium">Free Shipping</p>
              <p className="text-sm text-gray-600">On orders over ₹999</p>
            </div>
            <div>
              <p className="font-medium">Easy Returns</p>
              <p className="text-sm text-gray-600">30 days return policy</p>
            </div>
            <div>
              <p className="font-medium">Secure Payment</p>
              <p className="text-sm text-gray-600">100% secure checkout</p>
            </div>
            <div>
              <p className="font-medium">24/7 Support</p>
              <p className="text-sm text-gray-600">Dedicated support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <Link href="/categories" className="text-sm font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Tops", "Bottoms", "Dresses", "Accessories"].map((category) => (
              <Link
                key={category}
                href={`/categories/${category.toLowerCase()}`}
                className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                <div className="absolute inset-0 flex items-end p-4">
                  <span className="text-white font-medium">{category}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Link href="/products" className="text-sm font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Placeholder product cards */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="group">
                <div className="relative aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden mb-3">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <span className="text-sm">Product {i + 1}</span>
                  </div>
                  {i === 0 && (
                    <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-red-500 text-white rounded">
                      -30%
                    </span>
                  )}
                  {i === 1 && (
                    <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-black text-white rounded">
                      New
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-sm group-hover:text-gray-600">
                  Product Name
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-semibold">₹1,299</span>
                  {i === 0 && (
                    <span className="text-sm text-gray-500 line-through">₹1,899</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">New Arrivals</h2>
            <Link href="/categories/new-arrivals" className="text-sm font-medium hover:underline">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Placeholder product cards */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="group">
                <div className="relative aspect-[3/4] bg-gray-200 rounded-lg overflow-hidden mb-3">
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                    <span className="text-sm">New Arrival {i + 1}</span>
                  </div>
                  <span className="absolute top-2 left-2 px-2 py-1 text-xs font-medium bg-black text-white rounded">
                    New
                  </span>
                </div>
                <h3 className="font-medium text-sm group-hover:text-gray-600">
                  New Product Name
                </h3>
                <div className="mt-1">
                  <span className="font-semibold">₹2,499</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Join Our Newsletter</h2>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            Subscribe to get special offers, free giveaways, and once-in-a-lifetime deals.
          </p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:border-white"
            />
            <Button variant="secondary" size="lg">
              Subscribe
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
