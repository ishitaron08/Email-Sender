/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Proxy API calls to the backend during development
        source: "/api/backend/:path*",
        destination: "http://localhost:4000/api/:path*",
      },
      {
        source: "/auth/:path*",
        destination: "http://localhost:4000/auth/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
