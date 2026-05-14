import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Lab | DevFlow",
  description: "Practice live coding, English reasoning, and interview performance.",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
