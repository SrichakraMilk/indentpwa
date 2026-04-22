'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { fetchCurrentAgent, changePasswordApi, AgentDetails } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

// ── Change Password Form ───────────────────────────────────────────────────────
function ChangePasswordForm({ token }: { token: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setSuccess('');
    if (next !== confirm) { setErr('New passwords do not match.'); return; }
    if (next.length < 6)  { setErr('New password must be at least 6 characters.'); return; }
    setSaving(true);
    try {
      const result = await changePasswordApi(current, next, token);
      setSuccess(result.message);
      reset();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
  };
  const eyeBtn: React.CSSProperties = {
    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px',
  };

  return (
    <section style={{ marginTop: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ background: '#f8fafc', padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#374151' }}>🔒 Change Password</h2>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Current password */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
            Current Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showCurrent ? 'text' : 'password'}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              style={fieldStyle}
              placeholder="Enter current password"
            />
            <button type="button" style={eyeBtn} onClick={() => setShowCurrent(p => !p)}>
              {showCurrent ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
            New Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showNew ? 'text' : 'password'}
              value={next}
              onChange={e => setNext(e.target.value)}
              required
              style={fieldStyle}
              placeholder="Min. 6 characters"
            />
            <button type="button" style={eyeBtn} onClick={() => setShowNew(p => !p)}>
              {showNew ? '🙈' : '👁️'}
            </button>
          </div>
          {/* Strength indicator */}
          {next.length > 0 && (
            <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', background: next.length >= i * 4 ? (next.length >= 10 ? '#16a34a' : '#f59e0b') : '#e5e7eb' }} />
              ))}
              <span style={{ fontSize: '10px', color: '#6b7280', alignSelf: 'center', marginLeft: '4px' }}>
                {next.length < 6 ? 'Weak' : next.length < 10 ? 'Medium' : 'Strong'}
              </span>
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            style={{ ...fieldStyle, borderColor: confirm && confirm !== next ? '#ef4444' : '#d1d5db' }}
            placeholder="Repeat new password"
          />
          {confirm && confirm !== next && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#ef4444' }}>Passwords do not match</p>
          )}
        </div>

        {err     && <p style={{ margin: 0, fontSize: '13px', color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '8px 12px' }}>{err}</p>}
        {success && <p style={{ margin: 0, fontSize: '13px', color: '#16a34a', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 12px' }}>{success}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{ padding: '10px', background: saving ? '#94a3b8' : '#1e3a8a', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}
        >
          {saving ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </section>
  );
}

// ── Profile Page ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { token } = useAuth();
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const response = await fetchCurrentAgent(token);
        if (active) { setProfile(response.user); setAgent(response.agent ?? null); }
      } catch {
        if (active) setError('Unable to load profile.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
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
                  .map(part => part[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <h2>{agent ? `${agent.fname} ${agent.lname}` : profile?.name ?? 'Profile'}</h2>
                <p className="profile-subtitle">Profile</p>
              </div>
            </header>

            {loading ? (
              <p>Loading profile…</p>
            ) : error ? (
              <p className="form-error">{error}</p>
            ) : (
              <div className="profile-details">
                <div className="profile-row">
                  <span>User ID</span>
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
                {agent?.agentCode && (
                  <div className="profile-row">
                    <span>Agent Code</span>
                    <strong>{agent.agentCode}</strong>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Change Password */}
          {token && <ChangePasswordForm token={token} />}
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
