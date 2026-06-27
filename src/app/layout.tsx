import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Shoe Mafia - Premium Footwear Store",
    template: "%s | Shoe Mafia",
  },
  description:
    "Shop the latest collection of premium shoes at Shoe Mafia. Men's, Women's, Kids, Sports shoes and more at best prices.",
  keywords: ["shoes", "footwear", "sneakers", "sandals", "boots", "Shoe Mafia"],
  openGraph: {
    title: "Shoe Mafia - Premium Footwear Store",
    description: "Shop the latest collection of premium shoes at best prices.",
    type: "website",
    locale: "en_IN",
    siteName: "Shoe Mafia",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
