import type { Metadata, Viewport } from "next";
import { MobileNav, SideNav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM de ventas",
  description: "Gestión de leads y objetivos de ventas mensuales",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR">
      <body className="min-h-dvh">
        <div className="md:flex">
          <SideNav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 md:px-8 md:py-8">
            {children}
          </main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
