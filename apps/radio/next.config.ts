import { versionConfig } from "../../tools/version-config.mjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...versionConfig(),
  output: "standalone",
  experimental: { useTypeScriptCli: false },
  reactCompiler: true,
  transpilePackages: ["@seasonalnet/shell"],
};

export default nextConfig;
