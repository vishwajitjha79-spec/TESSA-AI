import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "T.E.S.S.A. - Thoughtful Empathic Sophisticated Synthetic Assistant",
  description: "Your intelligent AI companion with internet search and mood-aware responses",
  manifest: "/manifest.json",
  themeColor: "#00d4ff",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
