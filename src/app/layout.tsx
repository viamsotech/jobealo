import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jobealo - Crea tu CV profesional gratis",
  description: "Construye tu currículum perfecto con nuestro generador de CV gratuito. Plantillas profesionales, fácil de usar, y descarga instantánea.",
  icons: {
    icon: "/images/jobealo.svg",
    shortcut: "/images/jobealo.svg",
    apple: "/images/jobealo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
