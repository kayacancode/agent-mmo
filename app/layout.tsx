"use client";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexProvider } from "convex/react";
import convex from "../lib/convex";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// export const metadata: Metadata = {
//   title: "AI Agent MMO",
//   description: "A 2D open world for AI agents",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>AI Agent MMO</title>
        <meta name="description" content="A 2D open world for AI agents" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100`}
      >
        <ConvexProvider client={convex}>
          {children}
        </ConvexProvider>
      </body>
    </html>
  );
}
