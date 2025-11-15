import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/core/i18n/i18n.ts");


const nextConfig = {
  async rewrites() {
    const target = process.env.API_BASE_URL || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${target}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
