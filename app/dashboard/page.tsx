'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';

import { fetchCurrentAgent, AgentDetails, fetchIndentsApi, IndentRecord } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';


export default function DashboardPage() {
  const { token } = useAuth();

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);

  // 🔷 Load Indent Stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const indents: IndentRecord[] = await fetchIndentsApi();

        const counts = {
          pending: 0,
          approved: 0,
          rejected: 0,
          total: indents.length,
        };

        indents.forEach((i) => {
          const s = i.status?.toLowerCase();
          if (s === 'pending') counts.pending++;
          else if (s === 'approved') counts.approved++;
          else if (s === 'rejected') counts.rejected++;
        });

        setStats(counts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // 🔷 Load Profile
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const response = await fetchCurrentAgent(token);
        setProfile(response.user);
        setAgent(response.agent ?? null);
      } catch (err) {
        console.error('Failed to load dashboard data');
      }
    })();
  }, [token]);

  
  return (
    <ProtectedPage>
      <div className="dashboard-container">

        {/* 🔷 Header */}
        <Header />
        <main className="page-shell">
          <h1 className="page-title">Dashboard</h1>

        {/* 🔷 Welcome Card */}
        <div className="welcome-card">
          {loading ? (
            <>
              <div className="skeleton title"></div>
              <div className="skeleton line"></div>
              <div className="skeleton line"></div>
              <div className="skeleton line"></div>
            </>
          ) : (
            <>
              <h3>
                Welcome {agent ? agent.fname : profile?.name?.split(' ')[0] || 'User'}
              </h3>
              <p>Credit Limit : ₹ {agent?.creditLimit ?? '0'}</p>
              <p>Outstanding : ₹ {agent?.outstanding ?? '0'}</p>
              <p>Credit Balance : ₹ {agent?.balance ?? '0'}</p>
            </>
          )}
        </div>

        {/* 🔷 Grid */}
        <div className="menu-grid">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div className="menu-card" key={i}>
                  <div className="skeleton icon"></div>
                  <div className="skeleton text"></div>
                  <div className="skeleton badge"></div>
                </div>
              ))
            : (
              <>
                <Link href="/indents?status=pending" className="menu-card">
                  <img src="/icons/indent.png" />
                  <p>Indent</p>
                  <span>{stats.pending}</span>
                </Link>

                <div className="menu-card">
                  <img src="/icons/payment.png" />
                  <p>Payments</p>
                </div>

                <div className="menu-card">
                  <img src="/icons/invoice.png" />
                  <p>Invoice</p>
                </div>

                <div className="menu-card">
                  <img src="/icons/orders.png" />
                  <p>Orders</p>
                </div>

                <div className="menu-card">
                  <img src="/icons/catalog.png" />
                  <p>Catalog</p>
                </div>

                <div className="menu-card">
                  <img src="/icons/help.png" />
                  <p>Help</p>
                </div>
              </>
            )}
        </div>

        </main>
        <Footer />

      </div>
    </ProtectedPage>
  );
}