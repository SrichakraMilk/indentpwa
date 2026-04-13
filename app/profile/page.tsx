'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchCurrentAgent, AgentDetails } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function ProfilePage() {
  const { token } = useAuth();
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        const response = await fetchCurrentAgent(token);
        if (active) {
          setProfile(response.user);
          setAgent(response.agent ?? null);
        }
      } catch (err) {
        if (active) {
          setError('Unable to load profile.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [token]);

  return (
    <ProtectedPage>
      <div className="dashboard-container">
      <Header />
      <main className="page-shell">
        <p className="module-back-nav">
          <Link href="/dashboard">← Dashboard</Link>
        </p>
        <h1 className="page-title">Profile</h1>
        <section className="card profile-card">
          <header className="profile-header">
            <div className="profile-avatar">
              {(agent ? `${agent.fname} ${agent.lname}` : profile?.name)
                ?.split(' ')
                .map((part) => part[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <h2>{agent ? `${agent.fname} ${agent.lname}` : profile?.name ?? 'Profile'}</h2>
              <p className="profile-subtitle">Agent profile</p>
            </div>
          </header>

          {loading ? (
            <p>Loading profile…</p>
          ) : error ? (
            <p className="form-error">{error}</p>
          ) : (
            <div className="profile-details">
              <div className="profile-row">
                <span>Agent ID</span>
                <strong>{agent?.userid ?? agent?.userId ?? 'Unknown'}</strong>
              </div>
              <div className="profile-row">
                <span>Name</span>
                <strong>{agent ? `${agent.fname} ${agent.lname}` : profile?.name ?? 'Unknown'}</strong>
              </div>
              <div className="profile-row">
                <span>Email</span>
                <strong>{agent?.email ?? profile?.email ?? 'Not provided'}</strong>
              </div>
              <div className="profile-row">
                <span>Mobile</span>
                <strong>{agent?.mobile ?? 'Not provided'}</strong>
              </div>
              <div className="profile-row">
                <span>Agent Code</span>
                <strong>{agent?.agentCode ?? 'Not available'}</strong>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
      </div>
    </ProtectedPage>
  );
}
