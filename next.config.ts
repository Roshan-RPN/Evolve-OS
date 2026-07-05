import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder. A stray package-lock.json sits in the
  // parent directory (a separate project), which otherwise makes Turbopack infer
  // the wrong root and print a warning on every dev start.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
