import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // La lista de precios en Excel puede pesar varios MB.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
