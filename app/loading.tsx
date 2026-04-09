
'use client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function LoadingPage() {
  return (
    <>
      <Header />
      <main className="page-shell">
        <h1 className="page-title">Loading</h1>
        <section className="card loading-card">
          <h1>Loading…</h1>
          <p>Please wait while we prepare your dashboard.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
