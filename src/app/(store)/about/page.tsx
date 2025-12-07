import { Metadata } from "next";
import { Heart, Truck, Shield, Award } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about our story, mission, and commitment to quality fashion.",
};

const features = [
  {
    icon: Heart,
    title: "Passion for Fashion",
    description: "We curate the finest selection of fashion pieces with love and attention to detail.",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    description: "Free shipping on orders above ₹999. We deliver across India within 3-7 business days.",
  },
  {
    icon: Shield,
    title: "Quality Assured",
    description: "Every product goes through strict quality checks before reaching you.",
  },
  {
    icon: Award,
    title: "Premium Brands",
    description: "We partner with premium brands to bring you the best in fashion.",
  },
];

const stats = [
  { value: "10K+", label: "Happy Customers" },
  { value: "500+", label: "Products" },
  { value: "50+", label: "Brands" },
  { value: "4.8", label: "Average Rating" },
];

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gray-100 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Story</h1>
            <p className="text-lg text-muted-foreground">
              Founded with a passion for fashion and a commitment to quality, we&apos;ve been
              helping people express their unique style since day one.
            </p>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                We believe that great fashion should be accessible to everyone. Our mission
                is to bring you carefully curated, high-quality fashion pieces at fair prices.
              </p>
              <p className="text-muted-foreground mb-4">
                Every item in our collection is selected with care, ensuring it meets our
                standards for quality, style, and value. We work directly with trusted
                manufacturers and brands to bring you the best.
              </p>
              <p className="text-muted-foreground">
                More than just a store, we&apos;re a community of fashion enthusiasts who
                believe that what you wear should make you feel confident and comfortable.
              </p>
            </div>
            <div className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
              <div className="w-full h-full flex items-center justify-center text-6xl text-gray-400">
                STORE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-black text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Values</h2>
            <div className="space-y-6 text-left">
              <div>
                <h3 className="font-semibold text-lg mb-2">Customer First</h3>
                <p className="text-muted-foreground">
                  Your satisfaction is our top priority. We go above and beyond to ensure
                  you have a great shopping experience.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Quality Over Quantity</h3>
                <p className="text-muted-foreground">
                  We&apos;d rather have fewer, better products than overwhelm you with mediocre options.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Transparency</h3>
                <p className="text-muted-foreground">
                  No hidden fees, no surprises. What you see is what you get, and we&apos;re always
                  honest about our products.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Sustainability</h3>
                <p className="text-muted-foreground">
                  We&apos;re committed to reducing our environmental impact through responsible
                  sourcing and eco-friendly packaging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
