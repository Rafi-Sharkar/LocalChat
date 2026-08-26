/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // Allows seamless LAN access during development without origin warnings
    allowedDevOrigins: [
      "localhost:3000",
      "localhost:3030",
      "10.10.24.90:3000",
      "10.10.24.90:3030",
    ],
  },
};

export default nextConfig;
