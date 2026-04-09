
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ErrorPage({ error }: { error: Error }) {
  const router = useRouter();

  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <>
      <Header />
      <main className="page-shell">
        <h1 className="page-title">Error</h1>
        <section className="card error-card">
          <h1>Something went wrong</h1>
          <p>There was an issue loading this page. Please refresh or try again later.</p>
          <button type="button" onClick={() => router.refresh()}>
            Refresh page
          </button>
        </section>
      </main>
      <Footer />
    </>
  );
}
