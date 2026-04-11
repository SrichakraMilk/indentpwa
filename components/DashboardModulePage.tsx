'use client';

import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function DashboardModulePage({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>
          <h1 className="page-title">{title}</h1>
          {description ? <p className="module-description">{description}</p> : null}
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
