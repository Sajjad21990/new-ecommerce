import { Metadata } from "next";
import { Truck, Clock, RefreshCw, MapPin } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: "Learn about our shipping policies, delivery times, and return process.",
};

const shippingInfo = [
  {
    icon: Truck,
    title: "Free Shipping",
    description: "Free standard shipping on all orders above ₹999",
  },
  {
    icon: Clock,
    title: "Delivery Time",
    description: "3-7 business days for standard delivery",
  },
  {
    icon: RefreshCw,
    title: "Easy Returns",
    description: "7-day hassle-free return policy",
  },
  {
    icon: MapPin,
    title: "Pan India",
    description: "We deliver to all major cities across India",
  },
];

export default function ShippingPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Shipping & Returns</h1>
        <p className="text-center text-muted-foreground mb-12">
          Everything you need to know about shipping and returns
        </p>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {shippingInfo.map((info) => (
            <div key={info.title} className="text-center p-6 border rounded-lg">
              <info.icon className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">{info.title}</h3>
              <p className="text-sm text-muted-foreground">{info.description}</p>
            </div>
          ))}
        </div>

        {/* Shipping Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Shipping Policy</h2>
          <div className="prose prose-gray max-w-none">
            <h3 className="text-lg font-semibold mt-6 mb-3">Delivery Charges</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Orders above ₹999: <strong>Free Shipping</strong></li>
              <li>Orders below ₹999: ₹49 flat rate shipping</li>
              <li>Cash on Delivery: Additional ₹20 handling charge</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Estimated Delivery Time</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Metro cities (Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad): 3-5 business days</li>
              <li>Other major cities: 5-7 business days</li>
              <li>Remote areas: 7-10 business days</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Order Tracking</h3>
            <p className="text-muted-foreground">
              Once your order is shipped, you will receive a tracking number via email and SMS.
              You can track your order status in your account under &quot;My Orders&quot;.
            </p>
          </div>
        </section>

        {/* Returns Policy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Returns & Exchange Policy</h2>
          <div className="prose prose-gray max-w-none">
            <h3 className="text-lg font-semibold mt-6 mb-3">7-Day Return Policy</h3>
            <p className="text-muted-foreground mb-4">
              We offer a 7-day return policy from the date of delivery. Items must be unused,
              unwashed, and in their original packaging with all tags attached.
            </p>

            <h3 className="text-lg font-semibold mt-6 mb-3">How to Return</h3>
            <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
              <li>Log in to your account and go to &quot;My Orders&quot;</li>
              <li>Select the order and click &quot;Return Item&quot;</li>
              <li>Choose the reason for return</li>
              <li>Schedule a pickup or drop off at the nearest courier partner</li>
              <li>Once we receive and verify the item, refund will be processed within 5-7 business days</li>
            </ol>

            <h3 className="text-lg font-semibold mt-6 mb-3">Non-Returnable Items</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Innerwear and lingerie (for hygiene reasons)</li>
              <li>Swimwear</li>
              <li>Items marked as &quot;Final Sale&quot; or &quot;Non-Returnable&quot;</li>
              <li>Customized or personalized items</li>
            </ul>

            <h3 className="text-lg font-semibold mt-6 mb-3">Refund Process</h3>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Refunds are processed to the original payment method</li>
              <li>Credit/Debit card refunds: 5-7 business days</li>
              <li>UPI refunds: 2-3 business days</li>
              <li>Cash on Delivery orders: Refund via bank transfer (please provide bank details)</li>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Can I change my shipping address after placing an order?</AccordionTrigger>
              <AccordionContent>
                You can change your shipping address within 2 hours of placing the order by contacting
                our customer support. Once the order is shipped, the address cannot be changed.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Do you ship internationally?</AccordionTrigger>
              <AccordionContent>
                Currently, we only ship within India. We&apos;re working on expanding to international
                shipping soon. Stay tuned for updates!
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>What if I receive a damaged or wrong item?</AccordionTrigger>
              <AccordionContent>
                If you receive a damaged or incorrect item, please contact us within 48 hours of
                delivery with photos of the item. We&apos;ll arrange a replacement or full refund at no
                extra cost.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>Can I exchange an item for a different size?</AccordionTrigger>
              <AccordionContent>
                Yes! You can exchange items for a different size within 7 days of delivery. Simply
                initiate a return and place a new order for the desired size. We&apos;ll process your
                refund once we receive the original item.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
