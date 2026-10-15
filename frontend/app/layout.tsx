import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "BUNK24 — Art by TURNER", template: "%s | BUNK24" },
  description: "Original artwork and thoughtfully made fine art prints by TURNER. Independent art studio based in Atlanta, Georgia.",
  applicationName: "BUNK24",
  openGraph: {
    title: "BUNK24 — Art by TURNER",
    description: "Art with a pulse. Original work and thoughtfully made prints by TURNER.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
