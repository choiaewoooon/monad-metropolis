import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["400", "500", "600"] });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Kirogi — sent abroad, spent as intended",
  description:
    "International remittance with earmarked spending on Monad. Each dollar can only be spent on what it was sent for, and shops are paid, final, in about two seconds.",
};

export const viewport: Viewport = { themeColor: "#08090c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`}>
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
