import type { Metadata } from "next";
import { IBM_Plex_Mono, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "VarFoot",
    template: "%s · VarFoot",
  },
  description: "A soccer-specific PWA that turns assessment results into a varsity training roadmap.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/varfoot-mark.svg",
    apple: "/varfoot-mark.svg",
  },
};

export const viewport = {
  themeColor: "#171814",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
