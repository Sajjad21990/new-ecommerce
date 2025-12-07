import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto prose prose-gray">
        <h1>Privacy Policy</h1>
        <p className="lead">
          Last updated: {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </p>

        <p>
          At Store, we are committed to protecting your privacy. This Privacy Policy explains
          how we collect, use, disclose, and safeguard your information when you visit our
          website or make a purchase.
        </p>

        <h2>1. Information We Collect</h2>
        <h3>Personal Information</h3>
        <p>We may collect personal information that you voluntarily provide, including:</p>
        <ul>
          <li>Name and contact information (email, phone number, address)</li>
          <li>Payment information (credit card details, UPI ID)</li>
          <li>Account credentials (email and password)</li>
          <li>Order history and preferences</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <p>When you visit our website, we automatically collect certain information, including:</p>
        <ul>
          <li>IP address and browser type</li>
          <li>Device information</li>
          <li>Pages visited and time spent</li>
          <li>Referring website</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Process and fulfill your orders</li>
          <li>Send order confirmations and shipping updates</li>
          <li>Provide customer support</li>
          <li>Send promotional emails (with your consent)</li>
          <li>Improve our website and services</li>
          <li>Detect and prevent fraud</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>We may share your information with:</p>
        <ul>
          <li>
            <strong>Service Providers:</strong> Third parties who help us operate our business
            (payment processors, shipping companies, email service providers)
          </li>
          <li>
            <strong>Legal Requirements:</strong> When required by law or to protect our rights
          </li>
          <li>
            <strong>Business Transfers:</strong> In connection with a merger, acquisition, or
            sale of assets
          </li>
        </ul>
        <p>
          We do not sell your personal information to third parties for their marketing purposes.
        </p>

        <h2>4. Payment Security</h2>
        <p>
          All payment transactions are processed through secure payment gateways (Razorpay).
          We do not store your complete credit card or debit card details on our servers.
          Payment information is encrypted using industry-standard SSL technology.
        </p>

        <h2>5. Cookies</h2>
        <p>
          We use cookies and similar technologies to enhance your browsing experience,
          analyze website traffic, and personalize content. You can control cookies through
          your browser settings, but disabling cookies may affect website functionality.
        </p>

        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal information we hold about you</li>
          <li>Request correction of inaccurate information</li>
          <li>Request deletion of your personal information</li>
          <li>Opt-out of marketing communications</li>
          <li>Withdraw consent where applicable</li>
        </ul>
        <p>
          To exercise these rights, please <a href="/contact">contact us</a>.
        </p>

        <h2>7. Data Retention</h2>
        <p>
          We retain your personal information for as long as necessary to fulfill the purposes
          for which it was collected, comply with legal obligations, resolve disputes, and
          enforce our agreements.
        </p>

        <h2>8. Children&apos;s Privacy</h2>
        <p>
          Our website is not intended for children under 18 years of age. We do not knowingly
          collect personal information from children. If you believe we have collected
          information from a child, please contact us immediately.
        </p>

        <h2>9. Third-Party Links</h2>
        <p>
          Our website may contain links to third-party websites. We are not responsible for
          the privacy practices of these websites. We encourage you to read the privacy
          policies of any third-party sites you visit.
        </p>

        <h2>10. Security</h2>
        <p>
          We implement appropriate technical and organizational measures to protect your
          personal information against unauthorized access, alteration, disclosure, or
          destruction. However, no method of transmission over the Internet is 100% secure.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Changes will be posted on
          this page with an updated revision date. Your continued use of our website after
          any changes indicates your acceptance of the updated policy.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy or our data practices, please{" "}
          <a href="/contact">contact us</a>:
        </p>
        <ul>
          <li>Email: privacy@store.com</li>
          <li>Phone: +91 123 456 7890</li>
          <li>Address: 123 Fashion Street, Mumbai, Maharashtra 400001, India</li>
        </ul>
      </div>
    </div>
  );
}
