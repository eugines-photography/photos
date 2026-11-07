import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stillframe — A photographic journal",
  description: "A little space for the way you see the world. Collect your photographs, add tags, and revisit the moments that matter.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
