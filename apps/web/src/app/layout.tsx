import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { AuthProvider } from "@/context/auth-context";
import { AuthModalProvider } from "@/context/auth-modal-context";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BidMarket — Highest bidder wins",
  description:
    "Browse live auctions, place bids, and win the products you love.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} min-h-screen font-sans`}>
        <AuthProvider>
          <AuthModalProvider>
            <div className="flex min-h-screen flex-col bg-background">
              <SiteHeader />
              <main className="flex-1">{children}</main>
              <SiteFooter />
            </div>
          </AuthModalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
