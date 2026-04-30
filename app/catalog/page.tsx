'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { fetchAgentPriceChartApi } from '@/lib/api';

interface Product {
  _id: string;
  name: string;
  code?: string;
  sku?: string;
  price?: number;
  mrp?: number;
  size?: string;
  unit?: { name: string; code?: string } | string;
  category?: { _id: string; name: string } | string;
  categoryName?: string;
  isActive?: boolean;
}

export default function CatalogPage() {
  const { token, agent } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  const agentId = agent?.id ?? agent?._id ?? agent?.userId;

  // ── Load products + agent price chart in parallel ─────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

        const [prodRes] = await Promise.all([
          fetch('/api/products', { headers, cache: 'no-store' }),
        ]);

        if (!prodRes.ok) throw new Error(`HTTP ${prodRes.status}`);
        const prodData = await prodRes.json();
        const raw: Product[] = Array.isArray(prodData)
          ? prodData
          : Array.isArray(prodData.products)
          ? prodData.products
          : [];
        setProducts(raw.filter(p => p.isActive !== false));

        // Fetch price chart (non-fatal — catalog still works without it)
        if (agentId && token) {
          try {
            const map = await fetchAgentPriceChartApi(agentId, token);
            setPriceMap(map);
          } catch {
            // price chart unavailable; continue with base prices
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, agentId]);

  // ── Group by category ─────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? products.filter(p =>
          [p.name, p.code, p.sku, p.size, p.categoryName,
           typeof p.category === 'object' ? p.category?.name : p.category]
            .some(v => v && String(v).toLowerCase().includes(q))
        )
      : products;

    const map = new Map<string, { catName: string; items: Product[] }>();
    for (const p of filtered) {
      const catId =
        typeof p.category === 'object' && p.category !== null
          ? p.category._id
          : String(p.category || 'uncategorised');
      const catName =
        p.categoryName ||
        (typeof p.category === 'object' && p.category !== null ? p.category.name : '') ||
        'Uncategorised';

      if (!map.has(catId)) map.set(catId, { catName, items: [] });
      map.get(catId)!.items.push(p);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => a.catName.localeCompare(b.catName));
  }, [products, search]);

  // Open all by default after load
  useEffect(() => {
    if (grouped.length > 0 && openCats.size === 0) {
      setOpenCats(new Set(grouped.map(([id]) => id)));
    }
  }, [grouped]);

  const toggleCat = (id: string) =>
    setOpenCats(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const unitLabel = (p: Product) =>
    typeof p.unit === 'object' && p.unit ? p.unit.name : String(p.unit || '');

  const hasOverrides = priceMap.size > 0;

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h1 className="page-title" style={{ margin: 0 }}>Product Catalog</h1>
              {hasOverrides && (
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>
                  ✓ Showing your custom prices
                </p>
              )}
            </div>
            <div style={{ position: 'relative', maxWidth: '280px', width: '100%' }}>
              <input
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', padding: '8px 32px 8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
              )}
            </div>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>Loading catalog…</div>}
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', marginBottom: '16px' }}>{error}</div>}
          {!loading && !error && grouped.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              {search ? 'No products match your search.' : 'No products available.'}
            </div>
          )}

          {!loading && grouped.map(([catId, { catName, items }]) => {
            const isOpen = openCats.has(catId);
            return (
              <div key={catId} style={{ marginBottom: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                <button
                  onClick={() => toggleCat(catId)}
                  style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', color: '#1e3a8a', textAlign: 'left' }}
                >
                  <span>{catName}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, background: '#e0e7ff', borderRadius: '99px', padding: '2px 8px' }}>
                      {items.length} product{items.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '16px', color: '#6b7280', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
                  </span>
                </button>

                {isOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1px', background: '#e5e7eb' }}>
                    {items.map(p => {
                      const pid = p._id;
                      const basePrice = p.price ?? p.mrp;
                      const agentPrice = priceMap.get(pid);
                      const showAgentPrice = agentPrice != null;
                      return (
                        <div key={pid} style={{ background: showAgentPrice ? '#f0fdf4' : '#fff', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#111827', lineHeight: 1.3 }}>{p.name}</p>
                          {p.size && <span style={{ fontSize: '11px', color: '#6b7280' }}>{p.size}</span>}
                          {unitLabel(p) && <span style={{ fontSize: '11px', color: '#6b7280' }}>{unitLabel(p)}</span>}
                          {p.code && <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{p.code}</span>}

                          {/* Price display */}
                          {showAgentPrice ? (
                            <div style={{ marginTop: '4px' }}>
                              <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#15803d' }}>
                                ₹{agentPrice.toFixed(2)}
                              </p>
                              {basePrice != null && (
                                <p style={{ margin: 0, fontSize: '11px', color: '#9ca3af', textDecoration: 'line-through' }}>
                                  ₹{basePrice.toFixed(2)}
                                </p>
                              )}
                            </div>
                          ) : basePrice != null ? (
                            <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                              ₹{basePrice.toFixed(2)}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
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
