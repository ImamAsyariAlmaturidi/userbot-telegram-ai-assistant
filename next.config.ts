import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

const nextConfig: NextConfig = {
  // Removed rewrites - Next.js handles /api routes directly
  // Rewrites were causing ENOTFOUND localhost errors
};

export default withNextIntl(nextConfig);
