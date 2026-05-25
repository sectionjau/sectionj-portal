import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Section J — Client Portal",
  description: "Project dashboards for Section J clients.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen bg-white text-sj-fg antialiased">{children}</body>
    </html>
  );
}
