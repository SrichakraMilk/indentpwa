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
  const { token, agent } = useAuth();

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

  const sizeOptions = Array.from(
    new Set(
      filteredProductsInCategory
        .filter((p) => p.name === selectedProduct)
        .map((p) => (p.size ?? '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);

  const handleAddRow = () => {
    const err = {
      cat: !selectedCategory,
      prod: !selectedProduct,
      size: !selectedSize,
      unit: !selectedUnit,
      qty: !qty || isNaN(Number(qty)) || Number(qty) <= 0,
    };
    setError(err);
    if (err.cat || err.prod || err.size || err.unit || err.qty) return;

    const resolvedProduct = filteredProductsInCategory.find(
      (p) => p.name === selectedProduct && (p.size ?? '').trim() === selectedSize
    );
    if (!resolvedProduct) return;

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
        unitId: selectedUnit,
        unitName: units.find(u => u._id === selectedUnit)?.name || ''
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
        unit: row.unitId || undefined
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
        <div className="indent-modal-header">
          <h2 className="indent-modal-title">Create Indent</h2>
          <p className="indent-modal-subtitle">Select category, product, size, and quantity, then add to cart.</p>
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
                setSelectedProduct(e.target.value);
                setSelectedSize('');
                setError(err => ({...err, prod: false}));
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

          <label className="indent-modal-label">
            Size
            <select
              value={selectedSize}
              onChange={e => { setSelectedSize(e.target.value); setError(err => ({...err, size: false})); }}
              className={`indent-modal-control ${error.size ? 'indent-modal-control-error' : ''}`}
              disabled={!selectedProduct}
            >
              <option value="">Select size</option>
              {sizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <label className="indent-modal-label">
            Unit
            <select
              value={selectedUnit}
              onChange={e => { setSelectedUnit(e.target.value); setError(err => ({...err, unit: false})); }}
              className={`indent-modal-control ${error.unit ? 'indent-modal-control-error' : ''}`}
            >
              <option value="">Select unit</option>
              {units.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </label>

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
          <span className="indent-modal-summary">Items: {rows.length} | Total Qty: {totalQty}</span>
        </div>

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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id}>
                  <td className="indent-modal-cell-left">{row.category}</td>
                  <td className="indent-modal-cell-left">{row.product}</td>
                  <td className="indent-modal-cell-left">{row.size}</td>
                  <td className="indent-modal-cell-left">{row.unitName}</td>
                  <td className="indent-modal-cell-right">{row.qty}</td>
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
              ))}
            </tbody>
          </table>
        )}
        <div className="indent-modal-footer-actions">
          <button
            onClick={handleCreate}
            disabled={rows.length === 0 || submitting}
            className="indent-modal-create-btn"
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
          <button onClick={onClose} className="indent-modal-close-btn">Close</button>
        </div>
      </div>
    </div>
  );
}
