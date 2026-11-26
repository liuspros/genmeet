import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Pwa from "@/components/Pwa";
import Splash from "@/components/Splash";
import { MetaProvider } from "@/lib/meta";

const font = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "GenMeet", description: "Class groups, schedules and Google Meet in one place.",
  manifest: "/manifest.webmanifest", icons: { icon: "/icon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = { themeColor: "#FFFFFF", width: "device-width", initialScale: 1, viewportFit: "cover", maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className={font.className}><MetaProvider>{children}<Nav /></MetaProvider><Pwa /><Splash /></body></html>
  );
}
