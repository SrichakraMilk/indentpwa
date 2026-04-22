'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';

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
  description?: string;
}

interface Category {
  _id: string;
  name: string;
}

export default function CatalogPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/products', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        // API may return { products: [...] } or an array directly
        const raw: Product[] = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
          ? data.products
          : [];
        setProducts(raw.filter(p => p.isActive !== false));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  // Group by category
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
        (typeof p.category === 'object' && p.category !== null
          ? p.category.name
          : '') ||
        'Uncategorised';

      if (!map.has(catId)) map.set(catId, { catName, items: [] });
      map.get(catId)!.items.push(p);
    }
    // Sort categories alphabetically
    return Array.from(map.entries()).sort(([, a], [, b]) =>
      a.catName.localeCompare(b.catName)
    );
  }, [products, search]);

  // Open all by default once data loads
  useEffect(() => {
    if (grouped.length > 0 && openCats.size === 0) {
      setOpenCats(new Set(grouped.map(([id]) => id)));
    }
  }, [grouped]);

  const toggleCat = (id: string) => {
    setOpenCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const unitLabel = (p: Product) =>
    typeof p.unit === 'object' && p.unit ? p.unit.name : String(p.unit || '');

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Product Catalog</h1>
            {/* Search */}
            <div style={{ position: 'relative', maxWidth: '280px', width: '100%' }}>
              <input
                type="text"
                placeholder="Search products…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 32px 8px 12px',
                  border: '1px solid #d1d5db', borderRadius: '8px',
                  fontSize: '13px', outline: 'none',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '14px' }}
                >✕</button>
              )}
            </div>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              Loading catalog…
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px 16px', color: '#dc2626', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {!loading && !error && grouped.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>
              {search ? 'No products match your search.' : 'No products available.'}
            </div>
          )}

          {!loading && grouped.map(([catId, { catName, items }]) => {
            const isOpen = openCats.has(catId);
            return (
              <div key={catId} style={{ marginBottom: '14px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Category header */}
                <button
                  onClick={() => toggleCat(catId)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', background: '#f8fafc', border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: '14px', color: '#1e3a8a', textAlign: 'left',
                  }}
                >
                  <span>{catName}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, background: '#e0e7ff', borderRadius: '99px', padding: '2px 8px' }}>
                      {items.length} product{items.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '16px', color: '#6b7280', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▾
                    </span>
                  </span>
                </button>

                {/* Products grid */}
                {isOpen && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1px', background: '#e5e7eb' }}>
                    {items.map(p => (
                      <div
                        key={p._id}
                        style={{ background: '#fff', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}
                      >
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '13px', color: '#111827', lineHeight: 1.3 }}>
                          {p.name}
                        </p>
                        {p.size && (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{p.size}</span>
                        )}
                        {unitLabel(p) && (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{unitLabel(p)}</span>
                        )}
                        {p.code && (
                          <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>{p.code}</span>
                        )}
                        {(p.price != null || p.mrp != null) && (
                          <p style={{ margin: '4px 0 0', fontSize: '13px', fontWeight: 600, color: '#1e40af' }}>
                            ₹{p.price ?? p.mrp}
                          </p>
                        )}
                      </div>
                    ))}
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
