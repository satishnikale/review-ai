import type { Metadata } from "next";
// @ts-ignore: allow CSS side-effect import without type declarations
import "./globals.css";

export const metadata: Metadata = {
  title: "ReviewAI",
  description: "AI-powered GitHub PR reviews",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}