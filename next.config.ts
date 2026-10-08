import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Room for a doctor's 4 MB licence upload (the default limit is 1 MB).
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
