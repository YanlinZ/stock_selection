import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "stock_selection",
  description: "Personal market decision dashboard foundation"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">{children}</body>
    </html>
  );
}
