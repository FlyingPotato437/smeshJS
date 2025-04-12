/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  // Handle Leaflet CSS natively with Next.js
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;