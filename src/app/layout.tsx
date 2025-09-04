// src/app/layout.tsx
import { Outfit } from "next/font/google";
import "./globals.css";
import AppProviders from "@/providers/AppProvider"; // provider tunggal

const outfit = Outfit({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={outfit.className} suppressHydrationWarning={true}>
        <AppProviders>{children}</AppProviders>
        <div id="datepicker-portal"></div>
      </body>
    </html>
  );
}