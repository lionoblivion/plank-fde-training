import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { config } from "@/lib/config";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: {
    default: "WorkBot",
    template: "%s · WorkBot",
  },
  description:
    "WorkBot is an enterprise workflow platform that helps operations, finance, and support teams run work across the systems they already use.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
