import Header from '@/components/Header';
import Footer from '@/components/Footer';
'use client';

export default function LoadingPage() {
  return (
    <>
      <Header title="Loading" />
      <main className="page-shell">
        <section className="card loading-card">
          <h1>Loading…</h1>
          <p>Please wait while we prepare your dashboard.</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
