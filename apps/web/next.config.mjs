import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Pin file tracing to the monorepo root so Next doesn't latch onto an
  // unrelated parent lockfile when scanning for the workspace root.
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  // Workspace packages — Next compiles them through SWC.
  transpilePackages: ['@futurenostics/types', '@futurenostics/config'],
};

export default nextConfig;
