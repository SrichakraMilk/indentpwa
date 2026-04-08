import './globals.css';
import AuthProvider from '@/components/AuthProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export const metadata = {
  title: 'Indent PWA',
  description: 'Progressive web app for login, dashboard, and indent management.',
  icons: [
    { rel: 'icon', url: '/icons/icon-192.svg', sizes: '192x192' },
    { rel: 'apple-touch-icon', url: '/icons/icon-512.svg', sizes: '512x512' }
  ],
  metadataBase: new URL('https://example.com')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {process.env.NODE_ENV === 'production' ? <ServiceWorkerRegister /> : null}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
