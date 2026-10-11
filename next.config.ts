import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server send its JavaScript to our ngrok address too, so the
  // app works when opened from a phone through the tunnel. (Development only:
  // the deployed app on Vercel doesn't need this.)
  allowedDevOrigins: ["partition-grout-surreal.ngrok-free.dev"],
  experimental: {
    serverActions: {
      // Room for a doctor's 4 MB licence upload (the default limit is 1 MB).
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
