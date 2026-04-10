import React, { useState, useEffect } from 'react';
import { Category, createIndentApi, fetchCategoriesApi, fetchProductsApi, Product } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface IndentRow {
  id: string;
  categoryId: string;
  category: string;
  productId: string;
  product: string;
  size: string;
  qty: number;
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
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { token, agent } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState('');
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [error, setError] = useState<{cat?: boolean; prod?: boolean; size?: boolean; qty?: boolean}>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const [categoryData, productData] = await Promise.all([fetchCategoriesApi(), fetchProductsApi()]);
        setCategories(categoryData);
        setAllProducts(productData.length ? productData : products);
      } catch (e) {
        setCategories([]);
        setAllProducts(products);
      }
    }
    fetchCategories();
  }, []);

  const filteredProducts = allProducts.filter((p) => p.categoryId === selectedCategory);
  const uniqueProductNames = Array.from(new Set(filteredProducts.map((p) => p.name))).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  const sizeOptions = Array.from(
    new Set(
      filteredProducts
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
      qty: !qty || isNaN(Number(qty)) || Number(qty) <= 0,
    };
    setError(err);
    if (err.cat || err.prod || err.size || err.qty) return;

    const resolvedProduct = filteredProducts.find(
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
      },
    ]);
    setQty('');
    setSelectedProduct('');
    setSelectedSize('');
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

      await createIndentApi({
        route: resolveId(agent?.route),
        plant: resolveId(agent?.plant),
        department: resolveId(agent?.department),
        remarks: `Created from app with ${rows.length} item(s)`,
        agent: resolveId(agent?._id) ?? resolveId(agent?.id) ?? agent?.userId ?? agent?.userid,
        executive: resolveId(agent?.executive),
        branchManager: resolveId(agent?.branchManager),
        areaManager: resolveId(agent?.areaManager),
        gmSales: resolveId(agent?.gmSales),
        items: rows.map((row) => ({
          category: row.categoryId,
          product: row.productId,
          quantity: row.qty,
          size: row.size.trim() || undefined
        }))
      }, token);
      setRows([]);
      setQty('');
      setSelectedCategory('');
      setSelectedProduct('');
      setSelectedSize('');
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
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
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
              {uniqueProductNames.map((productName) => (
                <option key={productName} value={productName}>{productName}</option>
              ))}
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
            Qty
            <input
              type="number"
              min="1"
              value={qty}
              onChange={e => { setQty(e.target.value); setError(err => ({...err, qty: false})); }}
              className={`indent-modal-control ${error.qty ? 'indent-modal-control-error' : ''}`}
            />
          </label>
        </div>

        <div className="indent-modal-actions-row">
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
