import { Header } from "@/components/store/header";
import { Footer } from "@/components/store/footer";
import { SessionProvider } from "next-auth/react";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/json-ld";
import { ComparisonBar } from "@/components/store/comparison-bar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <ComparisonBar />
      </div>
    </SessionProvider>
  );
}
