import type { Metadata } from "next";
import { AppBottomNav } from "@/components/app-bottom-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "阳明心学交易系统｜交易人格测评与知行训练",
  description:
    "东方哲学、AI 与交易行为训练结合的阳明心学交易系统。不荐股、不喊单、不承诺收益。",
  icons: {
    icon: "/brand/yangming-c16.svg",
    shortcut: "/brand/yangming-c16.svg",
    apple: "/brand/yangming-c16.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className="dark h-full antialiased"
      data-scroll-behavior="smooth"
    >
      <body className="font-function min-h-full flex flex-col">
        {children}
        <AppBottomNav />
      </body>
    </html>
  );
}
