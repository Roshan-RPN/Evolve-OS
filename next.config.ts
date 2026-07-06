import type { NextConfig } from "next";
import path from "path";

// Content-Security-Policy. 'unsafe-inline'/'unsafe-eval' on scripts are needed
// by Next's runtime + dev refresh; the app renders no user HTML
// (no dangerouslySetInnerHTML), so XSS surface is small. connect-src allows the
// Supabase host so the browser client works; everything else is same-origin.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://generativelanguage.googleapis.com https://api.openai.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this folder. A stray package-lock.json sits in the
  // parent directory (a separate project), which otherwise makes Turbopack infer
  // the wrong root and print a warning on every dev start.
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
