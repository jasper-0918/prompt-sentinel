import type { NextConfig } from "next";

// Static export for GitHub Pages. The demo runs fully in the browser, so it needs
// no server. Served at https://jasper-0918.github.io/prompt-sentinel/
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/prompt-sentinel",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
