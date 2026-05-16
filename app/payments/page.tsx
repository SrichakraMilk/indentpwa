'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import {
  fetchAllAgentsApi,
  fetchAgentPaymentsApi,
  createAgentPaymentApi,
  ListedAgent,
  AgentPaymentRecord,
} from '@/lib/api';

export default function PaymentsPage() {
  const { agent: me, token } = useAuth();

  const roleCode = ((me?.role as any)?.code ?? '').toUpperCase();
  const roleName = ((me?.role as any)?.name ?? '').toUpperCase();
  const isAE =
    roleCode === 'AE' || roleName.includes('ACCOUNTS EXECUTIVE');
  const isAI =
    roleCode === 'AI' || roleName.includes('ACCOUNTS INCHARGE');
  const isAccountsRole = isAE || isAI;

  // ─── Agent selector state ────────────────────────────────────────────────
  const [agentList, setAgentList] = useState<ListedAgent[]>([]);
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // ─── Agent live balance state ────────────────────────────────────────────
  const [agentBalance, setAgentBalance] = useState<{
    creditLimit: number;
    outstanding: number;
    creditBalance: number;
    name: string;
    agentCode?: string;
  } | null>(null);

  // ─── Payment form ────────────────────────────────────────────────────────
  const [payAmount, setPayAmount] = useState('');
  const [payRemarks, setPayRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── Payment history ─────────────────────────────────────────────────────
  const [payments, setPayments] = useState<AgentPaymentRecord[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Load all agents once
  useEffect(() => {
    if (!isAccountsRole || !token) return;
    fetchAllAgentsApi(token).then(setAgentList).catch(console.error);
  }, [isAccountsRole, token]);

  // Load payment history when agent changes
  const loadPayments = useCallback(
    async (agentId?: string) => {
      setLoadingPayments(true);
      try {
        const data = await fetchAgentPaymentsApi(agentId, token);
        setPayments(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingPayments(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (!selectedAgentId) {
      setPayments([]);
      setAgentBalance(null);
      return;
    }
    // derive balance from agentList entry (already fetched via /api/users/agents which includes creditLimit/outstanding)
    const found = agentList.find((a) => a.id === selectedAgentId);
    if (found) {
      const creditLimit = found.creditLimit ?? 0;
      const outstanding = found.outstanding ?? 0;
      setAgentBalance({
        creditLimit,
        outstanding,
        creditBalance: creditLimit - outstanding,
        name: found.displayName,
        agentCode: found.agentCode,
      });
    }
    loadPayments(selectedAgentId);
  }, [selectedAgentId, agentList, loadPayments]);

  // ─── Submit payment ──────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedAgentId) { alert('Please select an agent.'); return; }
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { alert('Please enter a valid positive amount.'); return; }
    setSubmitting(true);
    try {
      const rec = await createAgentPaymentApi(selectedAgentId, amt, payRemarks, token);
      alert(`✅ Payment ${rec.paymentNumber} recorded successfully!`);
      setPayAmount('');
      setPayRemarks('');
      // Refresh balance from payment record
      setAgentBalance((prev) =>
        prev
          ? {
              ...prev,
              outstanding: rec.outstandingAfterPayment,
              creditBalance: prev.creditLimit - rec.outstandingAfterPayment,
            }
          : prev
      );
      await loadPayments(selectedAgentId);
    } catch (e: any) {
      alert(e.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAgents = agentList.filter((a) => {
    if (!agentSearch.trim()) return true;
    const q = agentSearch.toLowerCase();
    return (
      a.displayName.toLowerCase().includes(q) ||
      (a.userid ?? '').toLowerCase().includes(q) ||
      (a.agentCode ?? '').toLowerCase().includes(q)
    );
  });

  const amt = parseFloat(payAmount) || 0;
  const exceedsOutstanding = agentBalance && amt > (agentBalance.outstanding || 0);

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>
          <h1 className="page-title">Payments</h1>

          {!isAccountsRole ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
              <p>Payment records will appear here.</p>
            </div>
          ) : (
            <>
              {/* ── Agent Selector ───────────────────────────── */}
              <div style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
              }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#1e40af', fontWeight: 700 }}>
                  🔍 Select Agent
                </h3>
                <input
                  type="text"
                  placeholder="Search by name, agent code or user ID..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid #bfdbfe',
                    borderRadius: '8px', fontSize: '0.9rem', marginBottom: '10px',
                    boxSizing: 'border-box', outline: 'none'
                  }}
                />
                <select
                  value={selectedAgentId}
                  onChange={(e) => { setSelectedAgentId(e.target.value); setPayAmount(''); setPayRemarks(''); }}
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: selectedAgentId ? '1px solid #22c55e' : '1px solid #bfdbfe',
                    borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box',
                    background: '#f8fafc', cursor: 'pointer'
                  }}
                >
                  <option value="">-- Select an agent --</option>
                  {filteredAgents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName} {a.agentCode ? `(${a.agentCode})` : ''} {a.routeLabel ? `— ${a.routeLabel}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── Agent Balance Card ───────────────────────── */}
              {agentBalance && (
                <>
                  <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px',
                    marginBottom: '20px'
                  }}>
                    {[
                      { label: 'Credit Limit', value: agentBalance.creditLimit, color: '#1e40af', bg: '#eff6ff' },
                      { label: 'Outstanding', value: agentBalance.outstanding, color: '#dc2626', bg: '#fef2f2' },
                      { label: 'Available Balance', value: agentBalance.creditBalance, color: agentBalance.creditBalance >= 0 ? '#15803d' : '#dc2626', bg: agentBalance.creditBalance >= 0 ? '#f0fdf4' : '#fef2f2' },
                    ].map((card) => (
                      <div key={card.label} style={{
                        background: card.bg, border: `1px solid ${card.color}30`,
                        borderRadius: '12px', padding: '16px', textAlign: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', fontWeight: 600 }}>
                          {card.label}
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: card.color }}>
                          ₹{card.value.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Payment Form ─────────────────────────── */}
                  <div style={{
                    background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
                    padding: '20px', marginBottom: '24px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                  }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                      💳 Record Payment — {agentBalance.name} {agentBalance.agentCode ? `(${agentBalance.agentCode})` : ''}
                    </h3>

                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Payable Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="Enter amount..."
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 14px', border: `1px solid ${exceedsOutstanding ? '#fca5a5' : '#cbd5e1'}`,
                        borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box',
                        background: exceedsOutstanding ? '#fef2f2' : '#fff', marginBottom: '10px'
                      }}
                    />

                    {exceedsOutstanding && (
                      <div style={{
                        padding: '8px 12px', background: '#fef2f2', border: '1px solid #fca5a5',
                        borderRadius: '8px', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '10px'
                      }}>
                        ⚠️ Amount exceeds outstanding balance (₹{agentBalance.outstanding.toFixed(2)})
                      </div>
                    )}

                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      Remarks / Reference
                    </label>
                    <textarea
                      placeholder="Cheque number, NEFT ref, or any note..."
                      value={payRemarks}
                      onChange={(e) => setPayRemarks(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1',
                        borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box',
                        resize: 'vertical', marginBottom: '14px'
                      }}
                    />

                    {/* Summary preview */}
                    {amt > 0 && agentBalance && (
                      <div style={{
                        padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: '8px', fontSize: '0.85rem', color: '#166534', marginBottom: '14px'
                      }}>
                        <strong>Preview:</strong> Outstanding will reduce from{' '}
                        <strong>₹{agentBalance.outstanding.toFixed(2)}</strong> → <strong>₹{Math.max(0, agentBalance.outstanding - amt).toFixed(2)}</strong>
                      </div>
                    )}

                    <button
                      onClick={handleSubmit}
                      disabled={submitting || !payAmount || amt <= 0}
                      style={{
                        width: '100%', padding: '12px', background: submitting ? '#94a3b8' : '#1e40af',
                        color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem',
                        fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      {submitting ? 'Recording...' : '🧾 Raise Invoice & Record Payment'}
                    </button>
                  </div>
                </>
              )}

              {/* ── Payment History ──────────────────────────── */}
              {selectedAgentId && (
                <div style={{
                  background: '#fff', border: '1px solid #e2e8f0',
                  borderRadius: '12px', padding: '20px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                  <h3 style={{ margin: '0 0 14px', fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>
                    📋 Payment History
                  </h3>

                  {loadingPayments ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading...</p>
                  ) : payments.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>No payments recorded yet for this agent.</p>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                            {['Pay #', 'Date', 'Amount', 'Outstanding Before', 'Outstanding After', 'Remarks', 'Status'].map((h) => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {payments.map((p, i) => (
                            <tr key={p._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                              <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1e40af' }}>{p.paymentNumber}</td>
                              <td style={{ padding: '10px 12px', color: '#475569', whiteSpace: 'nowrap' }}>
                                {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#15803d' }}>₹{p.amount.toFixed(2)}</td>
                              <td style={{ padding: '10px 12px', color: '#dc2626' }}>₹{p.outstandingAtPayment.toFixed(2)}</td>
                              <td style={{ padding: '10px 12px', color: '#16a34a' }}>₹{p.outstandingAfterPayment.toFixed(2)}</td>
                              <td style={{ padding: '10px 12px', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.remarks || '—'}
                              </td>
                              <td style={{ padding: '10px 12px' }}>
                                <span style={{
                                  padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600,
                                  background: p.status === 'Confirmed' ? '#dcfce7' : '#fee2e2',
                                  color: p.status === 'Confirmed' ? '#166534' : '#dc2626'
                                }}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 700 }}>
                            <td colSpan={2} style={{ padding: '10px 12px', color: '#334155' }}>Total Paid</td>
                            <td style={{ padding: '10px 12px', color: '#15803d' }}>
                              ₹{payments.filter(p => p.status === 'Confirmed').reduce((s, p) => s + p.amount, 0).toFixed(2)}
                            </td>
                            <td colSpan={4} />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
