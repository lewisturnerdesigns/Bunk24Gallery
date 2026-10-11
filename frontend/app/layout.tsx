import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bunk24 Gallery",
  description: "A Next.js and FastAPI starter application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
