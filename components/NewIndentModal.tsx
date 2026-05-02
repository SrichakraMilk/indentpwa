import React, { useState, useEffect } from 'react';
import { Category, createIndentApi, fetchAgentPriceChartApi, fetchProductCategoriesApi, fetchProductsApi, fetchUnitsApi, IndentItem, Product, resubmitIndentApi, Unit } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface IndentRow {
  id: string;
  categoryId: string;
  category: string;
  productId: string;
  product: string;
  size: string;
  qty: number;
  unitId: string;
  unitName: string;
  price?: number;
  qtyPerUnit?: number;   // from packingConfig — for breakdown display
  baseUnit?: string;     // from packingConfig — e.g. "Packet"
}

export interface IndentEditData {
  id: string;
  items: IndentItem[];
  remarks?: string;
}


const products: Product[] = [
  { id: 'prod1', name: 'Milk', categoryId: 'cat1', size: '1 L' },
  { id: 'prod2', name: 'Curd', categoryId: 'cat1', size: '500 ml' },
  { id: 'prod3', name: 'Bread', categoryId: 'cat2', size: '1 unit' },
  { id: 'prod4', name: 'Bun', categoryId: 'cat2', size: '1 unit' },
];


export default function NewIndentModal({
  open,
  onClose,
  onCreated,
  initialData
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
  initialData?: IndentEditData;
}) {
  const { token, agent, refreshAgent } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [qty, setQty] = useState('');
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState<{cat?: boolean; prod?: boolean; size?: boolean; qty?: boolean; unit?: boolean}>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    refreshAgent?.();


    let cancelled = false;
    async function load() {
      // Resolve agent MongoDB _id for price chart lookup
      const agentId = agent?._id ?? agent?.id ?? agent?.userId;

      const settled = await Promise.allSettled([
        fetchProductCategoriesApi(),
        fetchProductsApi(),
        fetchUnitsApi(),
        agentId && token ? fetchAgentPriceChartApi(agentId, token) : Promise.resolve(new Map<string, number>())
      ]);
      if (cancelled) return;

      const catResult  = settled[0];
      const prodResult = settled[1];
      const unitResult = settled[2];
      const priceResult = settled[3];

      if (catResult.status === 'fulfilled') {
        setCategories(catResult.value);
      } else {
        console.error('Product categories fetch failed:', catResult.reason);
        setCategories([]);
      }

      if (prodResult.status === 'fulfilled') {
        const list = prodResult.value;
        setAllProducts(list.length ? list : products);
      } else {
        console.error('Products fetch failed:', prodResult.reason);
        setAllProducts(products);
      }

      if (unitResult.status === 'fulfilled') {
        setUnits(unitResult.value);
      } else {
        console.error('Units fetch failed:', unitResult.reason);
        setUnits([]);
      }

      if (priceResult.status === 'fulfilled') {
        setPriceMap(priceResult.value as Map<string, number>);
      } else {
        console.warn('Agent price chart fetch failed:', priceResult.reason);
        setPriceMap(new Map());
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, agent, token]);

  useEffect(() => {
    if (!open) return;

    if (initialData) {
      setRemarks(initialData.remarks || '');
      const mappedRows: IndentRow[] = (initialData.items || []).map((item, idx) => ({
        id: `edit-${idx}-${Date.now()}`,
        categoryId: item.categoryId || '',
        category: item.categoryName || 'Category',
        productId: item.productId || '',
        product: item.productName || 'Product',
        size: item.size || '',
        qty: item.quantity ?? item.qty ?? 0,
        unitId: item.unitId || '',
        unitName: item.unitName || 'Unit'
      }));
      setRows(mappedRows);
    } else {
      setRows([]);
      setRemarks('');
      setSelectedCategory('');
      setSelectedProduct('');
      setSelectedSize('');
      setSelectedUnit('');
    }
  }, [open, initialData, setRemarks, setRows, setSelectedCategory, setSelectedProduct, setSelectedSize, setSelectedUnit]);

  // Only show products where the agent has a custom price > 1
  const filteredProducts = (allProducts || []).filter((p) => {
    if (!p) return false;
    const agentPrice = priceMap.get(p.id);
    return agentPrice != null && agentPrice > 1;
  });

  // Categories that have at least one eligible product
  const eligibleCategoryIds = new Set(filteredProducts.map((p) => p.categoryId));

  // Products in the selected category that are eligible
  const filteredProductsInCategory = filteredProducts.filter((p) => p.categoryId === selectedCategory);

  const uniqueProductNames = Array.from(
    new Set(filteredProductsInCategory.map((p) => (p.name || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  // Helper: get agent price for a given product name (first match in filteredProductsInCategory)
  const getAgentPriceForName = (name: string): number | undefined => {
    const match = filteredProductsInCategory.find((p) => p.name === name);
    return match ? priceMap.get(match.id) : undefined;
  };

  // Helper: get packingConfig for currently selected product+size
  const getPackingConfig = (productName: string, size: string) => {
    const match = filteredProductsInCategory.find(
      p => p.name === productName && (p.size ?? '').trim() === size
    );
    return match?.packingConfig ?? null;
  };

  const sizeOptions = Array.from(
    new Set(
      filteredProductsInCategory
        .filter((p) => p.name === selectedProduct)
        .map((p) => (p.size ?? '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  // Packing hint string for the currently selected product+size
  const currentPackingConfig = selectedProduct && selectedSize
    ? getPackingConfig(selectedProduct, selectedSize)
    : null;
  const packingHint = currentPackingConfig?.conversionLabel
    || (currentPackingConfig?.qtyPerUnit && currentPackingConfig?.baseUnit
        ? `1 ${currentPackingConfig?.sellingUnit?.name ?? 'unit'} = ${currentPackingConfig.qtyPerUnit} ${currentPackingConfig.baseUnit}`
        : null);

  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.qty * (row.qtyPerUnit ?? 1) * (row.price ?? 0), 0);

  const creditLimit = agent?.creditLimit || 0;
  const outstanding = agent?.outstanding || 0;
  const creditBalance = agent?.creditBalance ?? (creditLimit - outstanding);
  const exceedsCredit = totalAmount > creditBalance;

  const handleAddRow = () => {
    const err = {
      cat: !selectedCategory,
      prod: !selectedProduct,
      unit: !selectedUnit,
      qty: !qty || isNaN(Number(qty)) || Number(qty) <= 0,
    };
    setError(err);
    if (err.cat || err.prod || err.unit || err.qty) return;

    const resolvedProduct = filteredProductsInCategory.find(
      (p) => p.name === selectedProduct && (p.size ?? '').trim() === selectedSize
    );
    if (!resolvedProduct) return;

    // Auto-detect selling unit from packingConfig
    const pc = resolvedProduct.packingConfig;
    const autoUnitId = pc?.sellingUnit?._id ?? selectedUnit;
    const autoUnitName = pc?.sellingUnit?.name ?? units.find(u => u._id === selectedUnit)?.name ?? '';

    setRows([
      ...rows,
      {
        id: Math.random().toString(36).slice(2),
        categoryId: selectedCategory,
        category: categories.find(c => c._id === selectedCategory)?.name || '',
        productId: resolvedProduct.id,
        product: resolvedProduct.name,
        size: selectedSize,
        qty: Number(qty),
        unitId: autoUnitId,
        unitName: autoUnitName,
        price: priceMap.get(resolvedProduct.id),
        qtyPerUnit: pc?.qtyPerUnit,
        baseUnit: pc?.baseUnit,
      },
    ]);
    setQty('');
    setSelectedProduct('');
    setSelectedSize('');
    setSelectedUnit('');
    setError({});
  };

  const handleDeleteRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleCreate = async () => {
    if (rows.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const resolveId = (value: unknown): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          const obj = value as { _id?: string; id?: string; userId?: string; userid?: string };
          return obj._id ?? obj.id ?? obj.userId ?? obj.userid;
        }
        return undefined;
      };

      const items = rows.map((row) => ({
        category: row.categoryId,
        product: row.productId,
        quantity: row.qty,
        size: row.size.trim() || undefined,
        unit: row.unitId || undefined,
        price: row.price || 0,
        qtyPerUnit: row.qtyPerUnit || 1,
        amount: row.qty * (row.qtyPerUnit || 1) * (row.price || 0)
      }));

      if (initialData) {
        await resubmitIndentApi(initialData.id, items, remarks || 'Resubmitted', token);
      } else {
        await createIndentApi({
          route: resolveId(agent?.route),
          plant: resolveId(agent?.plant),
          department: resolveId(agent?.department),
          branch: resolveId(agent?.branch),
          remarks: remarks || `Created from app with ${rows.length} item(s)`,
          agent: resolveId(agent?._id) ?? resolveId(agent?.id) ?? agent?.userId ?? agent?.userid,
          executive: resolveId(agent?.branch?.executive),
          branchManager: resolveId(agent?.branch?.branchManager),
          areaManager: resolveId(agent?.branch?.areaManager),
          gmSales: resolveId(agent?.gmSales),
          items
        }, token);
      }
      setRows([]);
      setRemarks('');
      setQty('');
      setSelectedCategory('');
      setSelectedProduct('');
      setSelectedSize('');
      setSelectedUnit('');
      onCreated?.();
      onClose();
    } catch (e) {
      console.error('Failed to create indent:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="indent-modal-overlay">
      <div className="indent-modal-card">
        <div className="indent-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 className="indent-modal-title">Create Indent</h2>
            <p className="indent-modal-subtitle">Select category, product, size, and quantity, then add to cart.</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer', 
              color: '#64748b', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '32px', 
              height: '32px',
              padding: 0
            }}
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem', fontSize: '0.9rem' }}>
          <div><span style={{ color: '#64748b' }}>Credit Limit:</span> <strong style={{ color: '#0f172a' }}>₹{creditLimit.toFixed(2)}</strong></div>
          <div><span style={{ color: '#64748b' }}>Outstanding:</span> <strong style={{ color: '#ef4444' }}>₹{outstanding.toFixed(2)}</strong></div>
          <div><span style={{ color: '#64748b' }}>Available Balance:</span> <strong style={{ color: creditBalance < 0 ? '#ef4444' : '#15803d' }}>₹{creditBalance.toFixed(2)}</strong></div>
        </div>

        <div className="indent-modal-grid">
          <label className="indent-modal-label">
            Category
            <select
              value={selectedCategory}
              onChange={e => {
                setSelectedCategory(e.target.value);
                setSelectedProduct('');
                setSelectedSize('');
                setError(err => ({...err, cat: false}));
              }}
              className={`indent-modal-control ${error.cat ? 'indent-modal-control-error' : ''}`}
            >
              <option value="">Select category</option>
              {categories
                .filter(cat => eligibleCategoryIds.has(cat._id))
                .map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </label>

          <label className="indent-modal-label">
            Product
            <select
              value={selectedProduct}
              onChange={e => {
                const newProduct = e.target.value;
                setSelectedProduct(newProduct);
                setError(err => ({...err, prod: false}));
                
                // Auto-select size and unit if there's exactly 1 size option
                const sizesForNewProduct = Array.from(
                  new Set(
                    filteredProductsInCategory
                      .filter((p) => p.name === newProduct)
                      .map((p) => (p.size ?? '').trim())
                      .filter(Boolean)
                  )
                ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

                if (sizesForNewProduct.length === 1) {
                  const autoSize = sizesForNewProduct[0];
                  setSelectedSize(autoSize);
                  const pc = getPackingConfig(newProduct, autoSize);
                  if (pc?.sellingUnit?._id) {
                    setSelectedUnit(pc.sellingUnit._id);
                  } else {
                    setSelectedUnit('');
                  }
                } else if (sizesForNewProduct.length === 0) {
                  setSelectedSize('');
                  const pc = getPackingConfig(newProduct, '');
                  if (pc?.sellingUnit?._id) {
                    setSelectedUnit(pc.sellingUnit._id);
                  } else {
                    setSelectedUnit('');
                  }
                } else {
                  setSelectedSize('');
                  setSelectedUnit('');
                }
              }}
              className={`indent-modal-control ${error.prod ? 'indent-modal-control-error' : ''}`}
              disabled={!selectedCategory}
            >
              <option value="">Select product</option>
              {uniqueProductNames.map((productName) => {
                const ap = getAgentPriceForName(productName);
                return (
                  <option key={productName} value={productName}>
                    {productName}{ap != null ? ` — ₹${ap.toFixed(2)}` : ''}
                  </option>
                );
              })}
            </select>
          </label>

          {selectedProduct && (
            <div style={{ gridColumn: '1 / -1', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', gap: '2rem', fontSize: '0.9rem', color: '#334155' }}>
              <div><span style={{ color: '#64748b' }}>Size:</span> <strong style={{ color: '#0f172a' }}>{selectedSize || 'N/A'}</strong></div>
              <div><span style={{ color: '#64748b' }}>Unit:</span> <strong style={{ color: '#0f172a' }}>{selectedUnit ? units.find(u => u._id === selectedUnit)?.name : 'N/A'}</strong></div>
            </div>
          )}

          <label className="indent-modal-label">
            Qty
            <input
              type="number"
              min="0"
              step="any"
              value={qty}
              onChange={e => { setQty(e.target.value); setError(err => ({...err, qty: false})); }}
              className={`indent-modal-control ${error.qty ? 'indent-modal-control-error' : ''}`}
            />
            {packingHint && (
              <span style={{ fontSize: '11px', color: '#6366f1', marginTop: '2px', display: 'block' }}>
                📦 {packingHint}
                {qty && Number(qty) > 0 && currentPackingConfig?.qtyPerUnit
                  ? ` → ${Number(qty)} × ${currentPackingConfig.qtyPerUnit} = ${(Number(qty) * currentPackingConfig.qtyPerUnit).toFixed(currentPackingConfig.qtyPerUnit % 1 === 0 ? 0 : 2)} ${currentPackingConfig.baseUnit ?? ''}`
                  : ''}
              </span>
            )}
            {selectedProduct && qty && Number(qty) > 0 && getAgentPriceForName(selectedProduct) != null && (
              <span style={{ fontSize: '12px', color: '#15803d', marginTop: '2px', display: 'block', fontWeight: 600 }}>
                💵 Line Total: ₹{(Number(qty) * (currentPackingConfig?.qtyPerUnit ?? 1) * (getAgentPriceForName(selectedProduct) ?? 0)).toFixed(2)}
              </span>
            )}
          </label>
        </div>

        {/* Remarks */}
        <div className="mt-4 px-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Note</label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
            rows={2}
            placeholder="Add any specific instructions or notes..."
          />
        </div>

        {/* Summary */}
        <div className="mt-6 px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
          <button type="button" onClick={handleAddRow} className="indent-modal-add-btn">
            Add Item
          </button>
          <span className="indent-modal-summary">
            Items: {rows.length} | Qty: {totalQty}
            {totalAmount > 0 && (
              <strong style={{ marginLeft: '10px', color: '#15803d' }}>
                | Total: ₹{totalAmount.toFixed(2)}
              </strong>
            )}
          </span>
        </div>

        {exceedsCredit && rows.length > 0 && (
          <div style={{ padding: '10px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Indent value (₹{totalAmount.toFixed(2)}) exceeds your available Credit Balance (₹{creditBalance.toFixed(2)}). Please reduce your order quantity or contact administration.
          </div>
        )}

        {rows.length === 0 ? (
          <div className="indent-modal-empty">No items added yet.</div>
        ) : (
          <table className="indent-modal-table">
            <thead>
              <tr className="indent-modal-table-header-row">
                <th className="indent-modal-cell-left">Category</th>
                <th className="indent-modal-cell-left">Product</th>
                <th className="indent-modal-cell-left">Size</th>
                <th className="indent-modal-cell-left">Unit</th>
                <th className="indent-modal-cell-right">Qty</th>
                <th className="indent-modal-cell-right">Price</th>
                <th className="indent-modal-cell-right">Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const lineTotal = row.qty * (row.qtyPerUnit ?? 1) * (row.price ?? 0);
                return (
                  <tr key={row.id}>
                    <td className="indent-modal-cell-left">{row.category}</td>
                    <td className="indent-modal-cell-left">{row.product}</td>
                    <td className="indent-modal-cell-left">{row.size}</td>
                    <td className="indent-modal-cell-left">{row.unitName}</td>
                    <td className="indent-modal-cell-right">
                      {row.qty}
                      {row.qtyPerUnit && row.baseUnit && (
                        <div style={{ fontSize: '10px', color: '#6366f1', marginTop: '1px' }}>
                          = {(row.qty * row.qtyPerUnit).toFixed(row.qtyPerUnit % 1 === 0 ? 0 : 2)} {row.baseUnit}
                        </div>
                      )}
                    </td>
                    <td className="indent-modal-cell-right" style={{ color: '#1e40af' }}>
                      {row.price != null ? (
                        row.qtyPerUnit && row.qtyPerUnit > 1 ? (
                          <div style={{ lineHeight: '1.2' }}>
                            <span style={{ fontSize: '0.85em', color: '#64748b' }}>₹{row.price.toFixed(2)} × {row.qtyPerUnit}</span>
                            <br />
                            <span>= ₹{(row.price * row.qtyPerUnit).toFixed(2)}</span>
                          </div>
                        ) : (
                          `₹${row.price.toFixed(2)}`
                        )
                      ) : '—'}
                    </td>
                    <td className="indent-modal-cell-right" style={{ fontWeight: 600, color: '#15803d' }}>
                      {row.price != null ? `₹${lineTotal.toFixed(2)}` : '—'}
                    </td>
                    <td className="indent-modal-cell-left">
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        className="indent-modal-delete-btn"
                        title="Delete"
                        aria-label="Delete item"
                      >
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #cbd5e1', color: '#0f172a' }}>
                <td colSpan={4} className="indent-modal-cell-right" style={{ padding: '12px 8px' }}>Grand Total:</td>
                <td className="indent-modal-cell-right" style={{ padding: '12px 8px' }}>{totalQty}</td>
                <td className="indent-modal-cell-right" style={{ padding: '12px 8px' }}></td>
                <td className="indent-modal-cell-right" style={{ color: '#15803d', padding: '12px 8px' }}>
                  ₹{totalAmount.toFixed(2)}
                </td>
                <td style={{ padding: '12px 8px' }}></td>
              </tr>
            </tfoot>
          </table>
        )}
        <div className="indent-modal-footer-actions">
          <button
            onClick={handleCreate}
            disabled={rows.length === 0 || submitting || exceedsCredit}
            className="indent-modal-create-btn"
            style={exceedsCredit ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            {submitting ? 'Creating...' : initialData ? 'Update Indent' : 'Create Indent'}
          </button>
          <button onClick={onClose} className="indent-modal-close-btn">Close</button>
        </div>
      </div>
    </div>
  );
}
