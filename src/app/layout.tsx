import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/AppProvider";
import { Header } from "@/components/Header";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELV Site Survey — GS IT",
  description: "Offline-first ELV pre-sale site survey for field engineers.",
  applicationName: "Site Survey",
  appleWebApp: { capable: true, title: "Site Survey", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/192", apple: "/icons/192" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0f1f3d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <PwaRegister />
          <Header />
          <main className="main">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
