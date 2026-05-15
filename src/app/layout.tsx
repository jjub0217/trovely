import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE_URL = "https://trovely.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "Trovely",
    template: "%s | Trovely",
  },
  description: "인스타그램 게시물과 유튜브 영상을 카테고리, 태그, 메모와 함께 저장하고 검색할 수 있는 개인 웹 서비스",
  metadataBase: new URL(BASE_URL),
  manifest: "/manifest.json",
  verification: {
    google: "QwSeEYXUKCcLgTD8CtBEEpERKpp34sHBD_6r8dvKM2Q",
  },
  openGraph: {
    type: "website",
    siteName: "Trovely",
    title: "Trovely",
    description: "인스타그램 게시물과 유튜브 영상을 카테고리, 태그, 메모와 함께 저장하고 검색할 수 있는 개인 웹 서비스",
    url: BASE_URL,
    locale: "ko_KR",
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary",
    title: "Trovely",
    description: "인스타그램 게시물과 유튜브 영상을 카테고리, 태그, 메모와 함께 저장하고 검색할 수 있는 개인 웹 서비스",
  },
  icons: {
    icon: "/icon-32.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trovely",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="dns-prefetch" href="https://scontent.cdninstagram.com" />
        <link rel="preconnect" href="https://scontent.cdninstagram.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
