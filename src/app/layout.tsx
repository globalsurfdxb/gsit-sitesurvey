import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppProvider } from "@/components/AppProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { UiProvider } from "@/components/ui/UiProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Site Survey — GS IT",
  description: "Offline-first site surveys for GS IT departments: ELV, AV, ICT and more.",
  applicationName: "Site Survey",
  appleWebApp: { capable: true, title: "Site Survey", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/192" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8edf5" },
    { media: "(prefers-color-scheme: dark)", color: "#04070e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint so there's no light/dark flash.
const themeScript = `try{var t=localStorage.getItem('gs_theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppProvider>
          <UiProvider>
            <PwaRegister />
            {children}
          </UiProvider>
        </AppProvider>
      </body>
    </html>
  );
}
