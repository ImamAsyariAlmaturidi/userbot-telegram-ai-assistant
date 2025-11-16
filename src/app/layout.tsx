import type { PropsWithChildren } from "react";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { Inter, Nunito_Sans, Poppins, DM_Sans } from "next/font/google";

import { Root } from "@/components/Root/Root";
import { I18nProvider } from "@/core/i18n/provider";

import "./globals.css";

// Font Inter - UI
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

// Font Nunito Sans - body / content (default font)
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900", "1000"],
  variable: "--font-nunito-sans",
  display: "swap",
  style: ["normal", "italic"],
});

// Font Poppins - title
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

// Font DM Sans - alt heading
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Assistant",
  description: "AI Assistant",
};

export default async function RootLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${nunitoSans.variable} ${poppins.variable} ${dmSans.variable}`}
    >
      <body className="font-sans">
        <I18nProvider>
          <Root>{children}</Root>
        </I18nProvider>
      </body>
    </html>
  );
}
