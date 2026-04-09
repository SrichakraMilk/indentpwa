import React, { useState, useEffect } from 'react';
import { Category, createIndentApi, fetchCategoriesApi, fetchProductsApi, Product } from '@/lib/api';

interface IndentRow {
  id: string;
  categoryId: string;
  category: string;
  productId: string;
  product: string;
  qty: number;
}


const products: Product[] = [
  { id: 'prod1', name: 'Milk', categoryId: 'cat1' },
  { id: 'prod2', name: 'Curd', categoryId: 'cat1' },
  { id: 'prod3', name: 'Bread', categoryId: 'cat2' },
  { id: 'prod4', name: 'Bun', categoryId: 'cat2' },
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState('');
  const [rows, setRows] = useState<IndentRow[]>([]);
  const [error, setError] = useState<{cat?: boolean; prod?: boolean; qty?: boolean}>({});
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
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);

  const handleAddRow = () => {
    const err = {
      cat: !selectedCategory,
      prod: !selectedProduct,
      qty: !qty || isNaN(Number(qty)) || Number(qty) <= 0,
    };
    setError(err);
    if (err.cat || err.prod || err.qty) return;
    setRows([
      ...rows,
      {
        id: Math.random().toString(36).slice(2),
        categoryId: selectedCategory,
        category: categories.find(c => c._id === selectedCategory)?.name || '',
        productId: selectedProduct,
        product: allProducts.find((p) => p.id === selectedProduct)?.name || '',
        qty: Number(qty),
      },
    ]);
    setQty('');
    setSelectedProduct('');
    setError({});
  };

  const handleDeleteRow = (id: string) => {
    setRows(rows.filter(row => row.id !== id));
  };

  const handleCreate = async () => {
    if (rows.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      await createIndentApi({
        remarks: `Created from app with ${rows.length} item(s)`,
        items: rows.map((row) => ({
          categoryId: row.categoryId,
          categoryName: row.category,
          productId: row.productId,
          productName: row.product,
          qty: row.qty
        }))
      });
      setRows([]);
      setQty('');
      setSelectedCategory('');
      setSelectedProduct('');
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
        <h2 className="indent-modal-title">New Indent</h2>
        <div className="indent-modal-fields-row">
          <label className="indent-modal-label">
            Category
            <select
              value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setSelectedProduct(''); setError(err => ({...err, cat: false})); }}
              className={`indent-modal-control ${error.cat ? 'indent-modal-control-error' : ''}`}
            >
              <option value="">Select</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </label>
          <label className="indent-modal-label">
            Product
            <select
              value={selectedProduct}
              onChange={e => { setSelectedProduct(e.target.value); setError(err => ({...err, prod: false})); }}
              className={`indent-modal-control ${error.prod ? 'indent-modal-control-error' : ''}`}
              disabled={!selectedCategory}
            >
              <option value="">Select</option>
              {filteredProducts.map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
            </select>
          </label>
          <label className="indent-modal-label">
            Qty
            <input
              type="number"
              min="1"
              value={qty}
              onChange={e => { setQty(e.target.value); setError(err => ({...err, qty: false})); }}
              className={`indent-modal-control indent-modal-qty ${error.qty ? 'indent-modal-control-error' : ''}`}
            />
          </label>
        </div>
        <div className="indent-modal-actions-row">
          <button type="button" onClick={handleAddRow} className="indent-modal-add-btn">+ Add
          </button>
        </div>
        <table className="indent-modal-table">
          <thead>
            <tr className="indent-modal-table-header-row">
              <th className="indent-modal-cell-left">Category</th>
              <th className="indent-modal-cell-left">Product</th>
              <th className="indent-modal-cell-right">Qty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td className="indent-modal-cell-left">{row.category}</td>
                <td className="indent-modal-cell-left">{row.product}</td>
                <td className="indent-modal-cell-right">{row.qty}</td>
                <td className="indent-modal-cell-left">
                  <button onClick={() => handleDeleteRow(row.id)} className="indent-modal-delete-btn" title="Delete">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={2} className="indent-modal-total-label">Total</td>
                <td className="indent-modal-total-value">{totalQty}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
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
