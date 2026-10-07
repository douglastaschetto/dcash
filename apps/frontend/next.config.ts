import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production';
const apiOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').origin; } catch { return 'http://localhost:3001'; }
})();

/**
 * Content-Security-Policy. Next.js needs inline scripts (theme bootstrap,
 * hydration), so the main protection here is `connect-src`: even if a
 * script ever ran, it could only talk to our own API — never ship the
 * session token to an outside server. Plus no plugins, no <base> hijack,
 * no framing and forms only to us.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:" + (isDev ? ' http:' : ''),
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin}${isDev ? ' ws: http://localhost:*' : ''}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  `form-action 'self' ${apiOrigin}`,
  "frame-ancestors 'none'",
].join('; ');

/** Baseline security headers for every page (no framing, no MIME sniffing, minimal referrer, no device APIs). */
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
