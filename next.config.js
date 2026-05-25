/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb", // NatHERS PDFs can be up to ~10MB
    },
  },
};

module.exports = nextConfig;
