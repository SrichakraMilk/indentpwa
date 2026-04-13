import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata = {
  title: 'Indent PWA',
  description: 'Progressive web app for login, dashboard, and indent management.',
  metadataBase: new URL('https://indent.srichakramilk.com'),

  icons: [
    { rel: 'icon', url: '/icons/icon-192.png', sizes: '192x192' },
    { rel: 'icon', url: '/icons/icon-512.png', sizes: '512x512' },
    { rel: 'apple-touch-icon', url: '/icons/icon-180.png', sizes: '180x180' }
  ],

  manifest: '/manifest.json',

  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Indent App'
  }
};

export const viewport = {
  themeColor: '#0e7490',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme Color */}
        <meta name="theme-color" content="#0e7490" />

        {/* iOS Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Indent App" />

        {/* Apple Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />

        {/* Favicon */}
        <link rel="icon" href="/icons/icon-192.png" />
      </head>

      <body>
        <AuthProvider>
          {process.env.NODE_ENV === 'production' ? <ServiceWorkerRegister /> : null}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
