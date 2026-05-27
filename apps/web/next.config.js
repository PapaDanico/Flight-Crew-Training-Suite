/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@dnca/domain', '@dnca/ontology', '@dnca/prompts', '@dnca/exports'],
  typedRoutes: true,
  // Self-contained .next/standalone bundle for the Docker runtime image —
  // eliminates the need to ship node_modules in prod (infra/terraform).
  output: 'standalone',
  webpack: (config) => {
    // Allow ESM-style `.js` imports that point at `.ts` source in workspace packages.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

module.exports = nextConfig;
