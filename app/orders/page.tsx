'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';

// ── Types ─────────────────────────────────────────────────────────────────────
interface DcItem {
  _id?: string;
  product?: { name?: string; code?: string } | string;
  productName?: string;
  category?: { name?: string } | string;
  categoryName?: string;
  quantity?: number;
  size?: string;
  unit?: { name?: string } | string;
  unitName?: string;
}

interface DeliveryChallan {
  _id: string;
  dcNumber: string;
  dcDate?: string;
  createdAt?: string;
  status?: string;
  remarks?: string;
  indent?: { _id?: string; indentNumber?: string } | string;
  items?: DcItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const statusColor: Record<string, string> = {
  dispatched: '#16a34a',
  delivered:  '#15803d',
  approved:   '#1d4ed8',
  'security check': '#f59e0b',
  'in progress': '#0891b2',
  draft: '#6b7280',
};

function statusBadge(s?: string) {
  const label = s || 'Draft';
  const bg = statusColor[label.toLowerCase()] ?? '#6b7280';
  return (
    <span style={{ background: bg, color: '#fff', borderRadius: '99px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function itemProductName(item: DcItem): string {
  if (item.productName) return item.productName;
  if (typeof item.product === 'object' && item.product) return item.product.name ?? '—';
  return String(item.product || '—');
}

function itemUnit(item: DcItem): string {
  if (item.unitName) return item.unitName;
  if (typeof item.unit === 'object' && item.unit) return item.unit.name ?? '';
  return String(item.unit || '');
}

function dcIndentNumber(dc: DeliveryChallan): string {
  if (!dc.indent) return '—';
  if (typeof dc.indent === 'object') return dc.indent.indentNumber ?? '—';
  return '—';
}

function fmtDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const { token, agent } = useAuth();
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const agentId = agent?.id ?? agent?._id ?? agent?.userId;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (agentId) params.set('agent', agentId);
      const res = await fetch(`/api/delivery-challans?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw: DeliveryChallan[] = Array.isArray(data)
        ? data
        : Array.isArray(data.challans)
        ? data.challans
        : Array.isArray(data.deliveryChallans)
        ? data.deliveryChallans
        : [];
      // Sort newest first
      raw.sort((a, b) => new Date(b.dcDate ?? b.createdAt ?? 0).getTime() - new Date(a.dcDate ?? a.createdAt ?? 0).getTime());
      setChallans(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [token, agentId]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Orders</h1>
            <button
              onClick={load}
              style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
            >
              ↻ Refresh
            </button>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading orders…</div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {!loading && !error && challans.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              <p style={{ fontSize: '40px', margin: '0 0 12px' }}>📦</p>
              <p style={{ margin: 0, fontWeight: 600 }}>No fulfilled orders yet</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Your dispatched orders will appear here.</p>
            </div>
          )}

          {!loading && challans.map(dc => {
            const isOpen = expanded.has(dc._id);
            return (
              <div
                key={dc._id}
                style={{ border: '1px solid #e5e7eb', borderRadius: '12px', marginBottom: '12px', overflow: 'hidden', background: '#fff' }}
              >
                {/* Header row */}
                <button
                  onClick={() => toggle(dc._id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '15px', color: '#1e3a8a' }}>DC#{dc.dcNumber}</span>
                      {statusBadge(dc.status)}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>📋 Indent: {dcIndentNumber(dc)}</span>
                      <span>📅 {fmtDate(dc.dcDate ?? dc.createdAt)}</span>
                      {dc.items && <span>🛒 {dc.items.length} item{dc.items.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '18px', color: '#9ca3af', flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                </button>

                {/* Expanded items */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f3f4f6', padding: '12px 16px', background: '#f9fafb' }}>
                    {dc.remarks && (
                      <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                        Remarks: {dc.remarks}
                      </p>
                    )}
                    {dc.items && dc.items.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase' }}>Product</th>
                            <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase' }}>Qty</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase' }}>Unit</th>
                            <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, color: '#374151', fontSize: '11px', textTransform: 'uppercase' }}>Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dc.items.map((item, i) => (
                            <tr key={item._id ?? i} style={{ borderBottom: i < dc.items!.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                              <td style={{ padding: '7px 8px', fontWeight: 600 }}>{itemProductName(item)}</td>
                              <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 700, color: '#1e40af' }}>{item.quantity ?? '—'}</td>
                              <td style={{ padding: '7px 8px', color: '#6b7280' }}>{itemUnit(item)}</td>
                              <td style={{ padding: '7px 8px', color: '#6b7280' }}>{item.size ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>No item details available.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
