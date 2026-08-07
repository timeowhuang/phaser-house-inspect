import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "house",
  description: "使用 Phaser 构建的互动房间与 3D 道具检视体验。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
