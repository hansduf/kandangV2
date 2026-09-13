import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KandangKu - Catatan Kandang Ayam Petelur',
  description: 'PWA Pencatatan Produksi Telur, Obat, Vaksin, dan Kematian Kandang Ayam Petelur',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KandangKu',
  },
};

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { ProfileProvider } from '@/context/ProfileContext';
import { ProfileSwitcherModal } from '@/components/ProfileSwitcherModal';
import { SyncProvider } from '@/context/SyncContext';
import { SyncStatusModal } from '@/components/SyncStatusModal';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen font-sans selection:bg-emerald-600 selection:text-white">
        <ProfileProvider>
          <SyncProvider>
            {children}
            <ProfileSwitcherModal />
            <SyncStatusModal />
          </SyncProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
