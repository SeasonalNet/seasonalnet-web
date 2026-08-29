import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  output: 'standalone',
  experimental: { useTypeScriptCli: false },
  reactCompiler: true,
  transpilePackages: ['@seasonalnet/shell'],
  async redirects() {
    return [
      {
        source: '/docs/network',
        destination: '/docs/topology',
        permanent: false,
      },
      {
        source: '/docs/network/:path*',
        destination: '/docs/topology/:path*',
        permanent: false,
      },
    ];
  },
};

const withMDX = createMDX();

export default withMDX(config);
