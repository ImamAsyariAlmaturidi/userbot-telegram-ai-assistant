import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

const nextConfig = {
  // Removed rewrites - Next.js handles /api routes directly
  // Rewrites were causing cookie and redirect issues in production
};

export default withNextIntl(nextConfig);
