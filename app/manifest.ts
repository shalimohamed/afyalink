import type { MetadataRoute } from "next";

// The web app manifest: what a phone needs to install AfyaLink like an app
// (its name, icon, colours and first page). Next.js serves it at
// /manifest.webmanifest and links it from every page. No offline mode: a
// video consultation needs the internet anyway, and keeping medical pages
// stored on a shared phone would be a privacy risk.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AfyaLink",
    short_name: "AfyaLink",
    description: "See a verified doctor by video, pay with M-Pesa and get a digital prescription.",
    // Logged-in users are sent from / to their own dashboard (proxy.ts).
    start_url: "/",
    scope: "/",
    display: "standalone", // opens in its own window, without the browser's address bar
    background_color: "#F3F6F4", // --bg, shown while the app starts
    theme_color: "#0E7A5C", // --accent
    lang: "en-KE",
    categories: ["health", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Edge to edge, for phones that cut the icon into their own shape.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
