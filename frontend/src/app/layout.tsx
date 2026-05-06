import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POS",
  description: "Sistema de Punto de Venta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
