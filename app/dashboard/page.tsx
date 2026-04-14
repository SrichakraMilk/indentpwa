'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';

import { fetchCurrentAgent, AgentDetails, fetchIndentsApi, IndentRecord } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function roleLabel(agent: AgentDetails | null): string {
  const role =
    agent?.role && typeof agent.role === 'object'
      ? (agent.role as { name?: string; code?: string })
      : undefined;
  return (role?.name ?? role?.code ?? '').trim();
}

function isAgentRole(agent: AgentDetails | null): boolean {
  const label = roleLabel(agent);
  return label === 'Agent' || label === 'AGT';
}

/** Full name from API (agent profile or session user). */
function welcomeNameFromDb(agent: AgentDetails | null, profile: { name: string; email: string } | null): string {
  const fromAgent = `${agent?.fname ?? ''} ${agent?.lname ?? ''}`.trim();
  if (fromAgent) return fromAgent;
  const fromUser = profile?.name?.trim();
  if (fromUser) return fromUser;
  return 'User';
}

export default function DashboardPage() {
  const { token } = useAuth();

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
  });

  const [loading, setLoading] = useState(true);
  const [profileReady, setProfileReady] = useState(false);
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);

  // 🔷 Load Indent Stats (Synchronized with Role-based Visibility)
  useEffect(() => {
    if (!profileReady) return;

    const loadStats = async () => {
      try {
        const indents: IndentRecord[] = await fetchIndentsApi();
        const roleCode = (agent?.role as { code?: string })?.code?.toUpperCase();

        const counts = {
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
        };

        const roleCodeStr = (agent?.role as { code?: string })?.code?.toUpperCase() || "";
        const myRoles = (roleCodeStr === 'BM' || roleCodeStr === 'ABM') ? ['BM', 'ABM'] : [roleCodeStr];

        indents.forEach((i) => {
          const s = (i.status || '').toLowerCase();
          const currentStep = (i.currentStep || 'SE').toUpperCase();
          
          const IApproved = i.approvalLog?.some(log => 
            myRoles.includes(log.role.toUpperCase()) && log.status === 'Approved'
          );
          const IRejected = i.approvalLog?.some(log => 
            myRoles.includes(log.role.toUpperCase()) && log.status === 'Rejected'
          );

          // 1. Pending: Is it MY turn?
          if (s === 'pending' && myRoles.includes(currentStep)) {
            counts.pending++;
          }
          
          // 2. Approved: Global approval OR I specifically approved it
          if (s === 'approved' || (s === 'pending' && IApproved)) {
            counts.approved++;
          }
          
          // 3. Rejected: Global rejection OR I specifically rejected it
          if (s === 'rejected' || (s === 'pending' && IRejected)) {
            counts.rejected++;
          }
        });
        
        counts.total = counts.pending + counts.approved + counts.rejected;
        setStats(counts);
      } catch (err) {
        console.error('Stats loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [profileReady, agent]);

  // 🔷 Load profile / agent (needed for welcome + role)
  useEffect(() => {
    if (!token) {
      setProfileReady(false);
      setAgent(null);
      setProfile(null);
      return;
    }

    setProfileReady(false);
    (async () => {
      try {
        const response = await fetchCurrentAgent(token);
        setProfile(response.user);
        setAgent(response.agent ?? null);
      } catch (err) {
        console.error('Failed to load dashboard data');
      } finally {
        setProfileReady(true);
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

        {!profileReady ? (
          <div className="welcome-card">
            <div className="skeleton title"></div>
            <div className="skeleton line"></div>
            <div className="skeleton line"></div>
            <div className="skeleton line"></div>
          </div>
        ) : isAgentRole(agent) ? (
          <div className="welcome-card">
            <h3>Welcome {welcomeNameFromDb(agent, profile)}</h3>
            <p>Credit Limit : ₹ {agent?.creditLimit ?? '0'}</p>
            <p>Outstanding : ₹ {agent?.outstanding ?? '0'}</p>
            <p>Credit Balance : ₹ {agent?.balance ?? '0'}</p>
          </div>
        ) : (
          <h2 className="dashboard-welcome-heading">Welcome {welcomeNameFromDb(agent, profile)}</h2>
        )}

        {/* Menu: agents keep legacy tiles; other roles get Routes / Agents / Indents / Payments / Invoice / Catalog */}
        <div className="menu-grid">
          {!profileReady || loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div className="menu-card" key={i}>
                  <div className="skeleton icon"></div>
                  <div className="skeleton text"></div>
                  <div className="skeleton badge"></div>
                </div>
              ))
            : isAgentRole(agent)
              ? (
                  <>
                    <Link href="/indent" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        📋
                      </span>
                      <p>Indent</p>
                      <span>{stats.pending}</span>
                    </Link>
                    <Link href="/payments" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        💳
                      </span>
                      <p>Payments</p>
                    </Link>
                    <Link href="/invoice" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        🧾
                      </span>
                      <p>Invoice</p>
                    </Link>
                    <Link href="/orders" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        📦
                      </span>
                      <p>Orders</p>
                    </Link>
                    <Link href="/catalog" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        📚
                      </span>
                      <p>Catalog</p>
                    </Link>
                    <Link href="/help" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        ❓
                      </span>
                      <p>Help</p>
                    </Link>
                  </>
                )
              : (
                  <>
                    <Link href="/routes" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        🗺️
                      </span>
                      <p>Routes</p>
                    </Link>
                    <Link href="/agents" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        👥
                      </span>
                      <p>Agents</p>
                    </Link>
                    <Link href="/indent" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        📋
                      </span>
                      <p>Indents</p>
                      <span>{stats.pending}</span>
                    </Link>
                    <Link href="/payments" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        💳
                      </span>
                      <p>Payments</p>
                    </Link>
                    <Link href="/invoice" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        🧾
                      </span>
                      <p>Invoice</p>
                    </Link>
                    <Link href="/catalog" className="menu-card">
                      <span className="menu-card-icon" aria-hidden>
                        📚
                      </span>
                      <p>Catalog</p>
                    </Link>
                    {(() => {
                      const code = (agent?.role as { code?: string })?.code?.toUpperCase() || "";
                      const isAccounts = code === 'AE' || code === 'AI';
                      const isLogistics = code === 'DS' || code === 'SEC' || code === 'SUP';
                      if (isAccounts || isLogistics) {
                        return (
                          <Link href="/delivery-challan" className="menu-card">
                            <span className="menu-card-icon" aria-hidden>
                              🚚
                            </span>
                            <p>Delivery Challan</p>
                          </Link>
                        );
                      }
                      return null;
                    })()}
                  </>
                )}
        </div>

        </main>
        <Footer />

      </div>
    </ProtectedPage>
  );
}