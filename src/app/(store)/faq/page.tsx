import { Metadata } from "next";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about shopping, orders, shipping, and more.",
};

const faqCategories = [
  {
    title: "Orders & Payment",
    questions: [
      {
        q: "How do I place an order?",
        a: "Simply browse our products, add items to your cart, and proceed to checkout. You can checkout as a guest or create an account for a faster experience on future orders.",
      },
      {
        q: "What payment methods do you accept?",
        a: "We accept all major credit cards, debit cards, UPI (Google Pay, PhonePe, Paytm), net banking, and Cash on Delivery (COD) for eligible orders.",
      },
      {
        q: "Is Cash on Delivery available?",
        a: "Yes, COD is available for orders up to ₹10,000 in most serviceable areas. There's an additional ₹20 handling charge for COD orders.",
      },
      {
        q: "Can I modify or cancel my order?",
        a: "You can modify or cancel your order within 2 hours of placing it by contacting our customer support. Once the order is shipped, it cannot be cancelled, but you can return it after delivery.",
      },
      {
        q: "Why was my order cancelled?",
        a: "Orders may be cancelled due to product unavailability, payment issues, or suspected fraudulent activity. If your order is cancelled, you'll receive a full refund within 5-7 business days.",
      },
    ],
  },
  {
    title: "Shipping & Delivery",
    questions: [
      {
        q: "What are the shipping charges?",
        a: "Shipping is free on all orders above ₹999. For orders below ₹999, a flat shipping fee of ₹49 applies.",
      },
      {
        q: "How long does delivery take?",
        a: "Standard delivery takes 3-5 business days for metro cities and 5-7 business days for other locations. Remote areas may take up to 10 business days.",
      },
      {
        q: "How can I track my order?",
        a: "Once your order is shipped, you'll receive a tracking number via email and SMS. You can also track your order in the 'My Orders' section of your account.",
      },
      {
        q: "Do you deliver internationally?",
        a: "Currently, we only deliver within India. We're working on international shipping and will announce it soon!",
      },
    ],
  },
  {
    title: "Returns & Refunds",
    questions: [
      {
        q: "What is your return policy?",
        a: "We offer a 7-day return policy from the date of delivery. Items must be unused, unwashed, and in original packaging with tags attached.",
      },
      {
        q: "How do I return an item?",
        a: "Log in to your account, go to 'My Orders', select the order, and click 'Return Item'. Choose your reason and schedule a pickup. We'll process your refund once we receive the item.",
      },
      {
        q: "When will I receive my refund?",
        a: "Refunds are processed within 5-7 business days after we receive and verify the returned item. The time to reflect in your account depends on your bank/payment method.",
      },
      {
        q: "Can I exchange an item?",
        a: "Yes! For size exchanges, initiate a return for the original item and place a new order for the desired size. We'll refund you once we receive the original item.",
      },
      {
        q: "What items cannot be returned?",
        a: "Innerwear, lingerie, swimwear, items marked as 'Final Sale', and customized products cannot be returned for hygiene and other reasons.",
      },
    ],
  },
  {
    title: "Products & Sizing",
    questions: [
      {
        q: "How do I find my size?",
        a: "Each product page has a size guide with detailed measurements. We recommend measuring yourself and comparing with our size chart for the best fit.",
      },
      {
        q: "Are the product colors accurate?",
        a: "We make every effort to display colors as accurately as possible. However, actual colors may vary slightly due to monitor settings and lighting conditions during photography.",
      },
      {
        q: "Do you restock sold-out items?",
        a: "Popular items are often restocked. You can click 'Notify Me' on sold-out products to receive an email when they're back in stock.",
      },
      {
        q: "Are your products authentic?",
        a: "Yes! We only sell 100% authentic products sourced directly from brands or authorized distributors. All items come with original tags and packaging.",
      },
    ],
  },
  {
    title: "Account & Security",
    questions: [
      {
        q: "How do I create an account?",
        a: "Click on the user icon and select 'Create Account'. You can also create an account during checkout.",
      },
      {
        q: "I forgot my password. How do I reset it?",
        a: "Click 'Forgot Password' on the login page and enter your email. We'll send you a link to reset your password.",
      },
      {
        q: "Is my payment information secure?",
        a: "Absolutely! All payments are processed through secure payment gateways with industry-standard SSL encryption. We do not store your complete card details.",
      },
      {
        q: "How do I unsubscribe from emails?",
        a: "You can unsubscribe by clicking the 'Unsubscribe' link at the bottom of any promotional email, or by updating your preferences in your account settings.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-4">Frequently Asked Questions</h1>
        <p className="text-center text-muted-foreground mb-12">
          Find answers to common questions about our products and services
        </p>

        <div className="space-y-8">
          {faqCategories.map((category) => (
            <div key={category.title}>
              <h2 className="text-xl font-semibold mb-4">{category.title}</h2>
              <Accordion type="single" collapsible className="w-full">
                {category.questions.map((item, index) => (
                  <AccordionItem key={index} value={`${category.title}-${index}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent>{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 text-center p-8 bg-gray-50 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
          <p className="text-muted-foreground mb-6">
            Can&apos;t find the answer you&apos;re looking for? Our customer support team is here to help.
          </p>
          <Button asChild size="lg">
            <Link href="/contact">Contact Us</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
