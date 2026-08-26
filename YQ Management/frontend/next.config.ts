import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // @ts-expect-error skipWaiting is commonly used but missing from types
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  /* config options */
  reactStrictMode: true,
  output: 'standalone',
  turbopack: {},

  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SUPER_ADMIN_EMAIL: process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || 'yqbuddysa@gmail.com',
    NEXT_PUBLIC_BUILD_TIMESTAMP: new Date().toISOString(),
    NEXT_PUBLIC_BUILD_COMMIT: (function() {
      try {
        return require('child_process').execSync('git rev-parse --short HEAD').toString().trim();
      } catch (e) {
        return 'unknown';
      }
    })(),
  }
};

export default withPWA(nextConfig);
