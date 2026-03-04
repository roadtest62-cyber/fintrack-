import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Quản Lý Tính Tiền - Hệ thống quản lý giá tiền ấn phẩm",
  description: "Hệ thống quản lý tính tiền ấn phẩm, theo dõi đơn giá, số lượng và thanh toán.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${inter.variable}`} style={{ fontFamily: "var(--font-inter), 'Segoe UI', Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
