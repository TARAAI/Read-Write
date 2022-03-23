/** @type {import('next').NextConfig} */
const nextConfig = {
  ignoreBuildErrors: false,
  reactStrictMode: true,
  webpack: (config, options) => {
    config.watchOptions = {
      aggregateTimeout: 5,
      ignored: ['**/.git/**', '**/.next/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
