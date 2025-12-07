import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read our terms and conditions for using our website and services.",
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1>Terms & Conditions</h1>
        <p className="lead">
          Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to Store. These Terms and Conditions govern your use of our website and the
          purchase of products from us. By accessing our website or placing an order, you agree
          to be bound by these terms.
        </p>

        <h2>2. Use of Website</h2>
        <p>You agree to use this website only for lawful purposes and in a way that does not:</p>
        <ul>
          <li>Infringe the rights of others</li>
          <li>Restrict or inhibit anyone else&apos;s use of the website</li>
          <li>Violate any applicable laws or regulations</li>
        </ul>

        <h2>3. Products and Pricing</h2>
        <p>
          We make every effort to display accurate product information and pricing. However,
          errors may occur. We reserve the right to correct any errors and to change or update
          information at any time without prior notice.
        </p>
        <p>
          All prices are displayed in Indian Rupees (INR) and are inclusive of applicable taxes
          unless otherwise stated.
        </p>

        <h2>4. Orders and Payment</h2>
        <p>
          When you place an order, you are making an offer to purchase the products. We reserve
          the right to accept or decline your order for any reason, including but not limited to:
        </p>
        <ul>
          <li>Product availability</li>
          <li>Errors in product or pricing information</li>
          <li>Suspected fraudulent activity</li>
        </ul>
        <p>
          Payment must be made at the time of order through our accepted payment methods
          (credit/debit cards, UPI, net banking, or cash on delivery where available).
        </p>

        <h2>5. Shipping and Delivery</h2>
        <p>
          Please refer to our <a href="/shipping">Shipping & Returns</a> page for detailed
          information about delivery times, charges, and policies.
        </p>

        <h2>6. Returns and Refunds</h2>
        <p>
          We offer a 7-day return policy for most items. Please refer to our{" "}
          <a href="/shipping">Shipping & Returns</a> page for complete details on our return
          and refund policies.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          All content on this website, including text, graphics, logos, images, and software,
          is the property of Store and is protected by copyright and other intellectual property
          laws. You may not reproduce, distribute, or use any content without our written permission.
        </p>

        <h2>8. User Accounts</h2>
        <p>
          When you create an account, you are responsible for maintaining the confidentiality
          of your account information and password. You agree to notify us immediately of any
          unauthorized use of your account.
        </p>

        <h2>9. Privacy</h2>
        <p>
          Your privacy is important to us. Please review our <a href="/privacy">Privacy Policy</a>{" "}
          to understand how we collect, use, and protect your personal information.
        </p>

        <h2>10. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Store shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of your use of
          our website or products.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms and Conditions are governed by and construed in accordance with the laws
          of India. Any disputes arising from these terms shall be subject to the exclusive
          jurisdiction of the courts in Mumbai, Maharashtra.
        </p>

        <h2>12. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms and Conditions at any time. Changes will
          be effective immediately upon posting on this page. Your continued use of the website
          after any changes indicates your acceptance of the new terms.
        </p>

        <h2>13. Contact Us</h2>
        <p>
          If you have any questions about these Terms and Conditions, please{" "}
          <a href="/contact">contact us</a>.
        </p>
      </div>
    </div>
  );
}
