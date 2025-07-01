import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NotificationProvider from './components/NotificationProvider'
import { UserProvider } from './contexts/UserContext'
import PWAScript from './components/PWAScript'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'RoomBook - 회의실 예약 시스템',
  description: '간편하고 빠른 회의실 예약 서비스',
  keywords: ['회의실', '예약', '미팅룸', '모바일'],
  authors: [{ name: 'RoomBook Team' }],
  creator: 'RoomBook',
  publisher: 'RoomBook',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // PWA 메타데이터
  manifest: '/manifest.json',
  // 모바일 최적화 메타데이터
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  // iOS 메타데이터
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RoomBook',
    startupImage: '/icons/apple-startup.png',
  },
  // 소셜 미디어 메타데이터
  openGraph: {
    type: 'website',
    siteName: 'RoomBook',
    title: 'RoomBook - 회의실 예약 시스템',
    description: '간편하고 빠른 회의실 예약 서비스',
    url: 'https://roombook.vercel.app',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RoomBook 회의실 예약 시스템',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RoomBook - 회의실 예약 시스템',
    description: '간편하고 빠른 회의실 예약 서비스',
    images: ['/og-image.png'],
  },
  // 테마 색상
  themeColor: '#3b82f6',
  // 앱 아이콘
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-icon-180.png', sizes: '180x180' },
    ],
    shortcut: '/icons/shortcut-icon.png',
  },
  // 추가 메타태그
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'RoomBook',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#3b82f6',
    'HandheldFriendly': 'true',
    'MobileOptimized': 'width',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className={`${inter.className} antialiased`}>
        {/* 앱 컨테이너 */}
        <div id="app-root" className="min-h-screen bg-gray-50">
          <UserProvider>
            <NotificationProvider>
              {/* Safe Area 최상단 */}
              <div className="safe-area-top" />
              
              {/* 메인 콘텐츠 */}
              <main className="relative">
                {children}
              </main>
              
              {/* Safe Area 최하단 */}
              <div className="safe-area-bottom" />
            </NotificationProvider>
          </UserProvider>
        </div>
        
        {/* PWA 스크립트 */}
        <PWAScript />
      </body>
    </html>
  )
} 