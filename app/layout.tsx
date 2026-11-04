import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--af-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--af-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--af-mono" });

export const metadata: Metadata = {
  title: "AfyaLink - See a verified doctor today",
  description: "Describe your symptoms, book a verified doctor, pay with M-Pesa and get a digital prescription.",
  // iPhone: "Add to Home Screen" opens AfyaLink full screen, named "AfyaLink".
  // (The icons come from app/icon.svg, app/apple-icon.png and app/favicon.ico.)
  appleWebApp: { capable: true, title: "AfyaLink", statusBarStyle: "default" },
};

// On phones, the browser's address bar takes the page's background colour
// (the --bg token in globals.css, light and dark).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F6F4" },
    { media: "(prefers-color-scheme: dark)", color: "#0C1714" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
