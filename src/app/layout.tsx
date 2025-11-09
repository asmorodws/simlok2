// src/app/layout.tsx
import { Outfit } from "next/font/google";
import "./globals.css";

import AppProviders from "@/providers/AppProvider"; // provider tunggal
import "../../public/favicon.ico"

const outfit = Outfit({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={outfit.className} suppressHydrationWarning={true}>
        <AppProviders>{children}</AppProviders>
        <div id="datepicker-portal"></div>
      </body>
    </html>
  );
}