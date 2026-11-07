import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

// Static security headers. Anything that needs a per-request nonce
// (CSP) is set in src/proxy.ts, as in the finance app.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

// Tailwind 4 runs through PostCSS (postcss.config.mjs), as in the finance app.
const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
});
