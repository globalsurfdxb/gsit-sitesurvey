import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppProvider } from "@/components/AppProvider";
import { Splash } from "@/components/brand/Splash";
import { PwaRegister } from "@/components/PwaRegister";
import { UiProvider } from "@/components/ui/UiProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Site Survey — GS IT",
  description: "Offline-first site surveys for GS IT departments: ELV, AV, ICT and more.",
  applicationName: "Site Survey",
  appleWebApp: { capable: true, title: "Site Survey", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/192", sizes: "192x192", type: "image/png" }], apple: [{ url: "/icons/180", sizes: "180x180", type: "image/png" }] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  // Light by default; the theme script below switches it to the dark colour when the user has chosen dark.
  themeColor: "#e8edf5",
  // The app draws its own light and dark themes. Declaring both tells phone browsers not to apply their
  // automatic "dark mode for websites", which would dim the white logo and the blue accents.
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Applies the saved theme before first paint so there's no light/dark flash. Light unless the user chose dark or "system".
const themeScript = `try{var t=localStorage.getItem('gs_theme');if(t!=='dark'&&t!=='system')t='light';document.documentElement.dataset.theme=t;if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches)){var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#04070e')}}catch(e){document.documentElement.dataset.theme='light'}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <noscript>
          <style>{".splash{display:none}"}</style>
        </noscript>
      </head>
      <body>
        <AppProvider>
          <Splash />
          <UiProvider>
            <PwaRegister />
            {children}
          </UiProvider>
        </AppProvider>
      </body>
    </html>
  );
}
