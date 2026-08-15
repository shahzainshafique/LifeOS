import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Hide the dev activity badge (the bottom-left "Rendering" indicator).
  devIndicators: false,
};

export default nextConfig;
