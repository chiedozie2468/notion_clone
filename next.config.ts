import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // BlockNote (Phase 3) does not support React 19 Strict Mode yet.
  reactStrictMode: false,
};

export default nextConfig;
