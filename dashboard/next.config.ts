import type { NextConfig } from "next";
import path from "path";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: "",
  },
  sassOptions: {
    includePaths: [path.join(__dirname, "node_modules")],
  },
};

export default nextConfig;
