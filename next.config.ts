import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");

const nextConfig = {
  experimental: {
    // Wajib buat Prisma di serverless/standalone
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default withNextIntl(nextConfig);
