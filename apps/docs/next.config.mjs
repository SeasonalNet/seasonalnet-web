import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactCompiler: true,
  transpilePackages: ['@seasonalnet/shell'],
};

const withMDX = createMDX();

export default withMDX(config);
