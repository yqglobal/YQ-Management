import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // @ts-expect-error skipWaiting is commonly used but missing from types
  skipWaiting: true,
  workboxOptions: {
    exclude: [
      /dynamic-css-manifest\.json$/,
      /build-manifest\.json$/,
      /prerender-manifest\.json$/,
      /react-loadable-manifest\.json$/,
      /routes-manifest\.json$/
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options */
  reactStrictMode: true,
  output: 'standalone',
  turbopack: {},

  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
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

export default withSentryConfig(
  withPWA(nextConfig),
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options
    silent: true,
    org: "your-sentry-org",
    project: "your-sentry-project",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
    widenClientFileUpload: true,
    transpileClientSDK: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);
