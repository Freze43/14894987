import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Auto Video Clipper — Turn Long Videos into Viral Clips",
  description:
    "Automatically transform your long-form podcasts and streams into dozens of vertical short clips with dynamic subtitles and auto-reframing — in minutes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-900 text-slate-200 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
