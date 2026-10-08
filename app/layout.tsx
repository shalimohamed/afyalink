import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--af-display" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--af-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--af-mono" });

export const metadata: Metadata = {
  title: "AfyaLink — See a verified doctor today",
  description: "Describe your symptoms, book a verified doctor, pay with M-Pesa and get a digital prescription.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
