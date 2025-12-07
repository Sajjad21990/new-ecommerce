import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";

const footerLinks = {
  menu: [
    { name: "Home", href: "/" },
    { name: "New Arrivals", href: "/categories/new-arrivals" },
    { name: "Categories", href: "/categories" },
    { name: "Sales", href: "/sales" },
    { name: "Brands", href: "/brands" },
    { name: "About Us", href: "/about" },
  ],
  information: [
    { name: "Terms & Conditions", href: "/terms" },
    { name: "FAQ", href: "/faq" },
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Delivery & Returns", href: "/shipping" },
  ],
  work: {
    hours: [
      { day: "Monday - Friday", time: "9AM - 10PM" },
      { day: "Saturday", time: "9AM - 10PM" },
      { day: "Sunday", time: "Closed" },
    ],
  },
};

export function Footer() {
  return (
    <footer className="bg-white border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="text-xl font-bold tracking-tight">
              STORE
            </Link>
            <p className="mt-4 text-sm text-gray-600">
              Premium fashion and lifestyle products. Discover the latest trends.
            </p>
            <div className="flex items-center gap-4 mt-6">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600"
              >
                <Youtube className="h-5 w-5" />
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-600">
              <a href="tel:+911234567890" className="hover:text-gray-900">
                +91 123 456 7890
              </a>
            </p>
          </div>

          {/* Menu */}
          <div>
            <h3 className="font-semibold mb-4">Menu</h3>
            <ul className="space-y-2">
              {footerLinks.menu.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-semibold mb-4">Information</h3>
            <ul className="space-y-2">
              {footerLinks.information.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Work Hours */}
          <div>
            <h3 className="font-semibold mb-4">Work Hours</h3>
            <ul className="space-y-2">
              {footerLinks.work.hours.map((item) => (
                <li key={item.day} className="text-sm">
                  <span className="text-gray-600">{item.day}</span>
                  <br />
                  <span className="font-medium">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Newsletter</h3>
            <p className="text-sm text-gray-600 mb-4">
              Subscribe to get the latest news, promotions and updates.
            </p>
            <form className="space-y-2">
              <Input
                type="email"
                placeholder="Enter your email"
                className="w-full"
              />
              <Button type="submit" className="w-full">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} Store. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <img
                src="/payment/visa.svg"
                alt="Visa"
                className="h-6 opacity-50"
              />
              <img
                src="/payment/mastercard.svg"
                alt="Mastercard"
                className="h-6 opacity-50"
              />
              <img
                src="/payment/upi.svg"
                alt="UPI"
                className="h-6 opacity-50"
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
