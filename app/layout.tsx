import type { Metadata, Viewport } from "next";
import { Inter, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
});

export const metadata: Metadata = {
  title: "Mashwara",
  description: "A real pharmacist behind every counter.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Mashwara" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fefffc",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${nastaliq.variable}`}>
      <body className="min-h-dvh bg-surface text-ink">{children}</body>
    </html>
  );
}
