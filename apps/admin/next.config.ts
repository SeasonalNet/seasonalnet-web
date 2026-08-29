import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: { useTypeScriptCli: false },
  reactCompiler: true,
  transpilePackages: ["@seasonalnet/shell"],
};

export default nextConfig;
