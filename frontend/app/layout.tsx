import type { Metadata } from "next";
import { Syne, Space_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";

const syne = Syne({ subsets: ["latin"], variable: "--font-sans", weight: ["400","500","600","700","800"] });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400","700"] });

export const metadata: Metadata = {
  title: "CyberShield — Threat Monitor",
  description: "Real-time cybersecurity threat monitoring platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${spaceMono.variable}`}>
      <body>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#0c1218",
                color: "#e8f0f8",
                border: "1px solid #1a2530",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
