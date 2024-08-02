import type { Metadata } from "next";
import { Inter, Poppins, Amatic_SC } from 'next/font/google'
import { Analytics } from "@vercel/analytics/react"
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const poppins = Poppins({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '200', '800', '900'],
})

const amatic_sc = Amatic_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: "Map of events",
  description: "Узнай какие мероприятия рядом с тобой!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Analytics/>
      <body className={` ${poppins.className}`}>{children}</body>
    </html>
  );
}
