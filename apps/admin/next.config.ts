import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { useTypeScriptCli: false },
  reactCompiler: true,
  transpilePackages: ["@seasonalnet/shell"],
};

export default nextConfig;
