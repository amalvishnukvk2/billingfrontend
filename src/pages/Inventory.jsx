import { useState, useEffect, useCallback } from 'react';
import { ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { inventoryAPI, categoryAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import StockBadge from '../components/StockBadge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState('inventory');
  const [showAdjust, setShowAdjust] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustData, setAdjustData] = useState({ type: 'purchase', quantity: 1, reason: '' });
  const [adjustLoading, setAdjustLoading] = useState(false);
  const limit = 20;

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.getAll({ search, category, page, limit });
      setProducts(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  }, [search, category, page]);

  const fetchMovements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inventoryAPI.getMovements({ page, limit: 30 });
      setMovements(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { } finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    categoryAPI.getAll().then((r) => setCategories(r.data.data));
  }, []);

  useEffect(() => {
    if (tab === 'inventory') fetchInventory();
    else fetchMovements();
  }, [tab, fetchInventory, fetchMovements]);

  useEffect(() => { setPage(1); }, [search, category, tab]);

  const handleAdjust = async () => {
    if (!selectedProduct || !adjustData.reason) return toast.error('Reason is required');
    setAdjustLoading(true);
    try {
      await inventoryAPI.adjust({ productId: selectedProduct._id, ...adjustData });
      toast.success('Stock adjusted successfully');
      setShowAdjust(false);
      fetchInventory();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to adjust stock'); }
    finally { setAdjustLoading(false); }
  };

  const typeColors = { purchase: 'badge-green', sale: 'badge-red', adjustment: 'badge-blue', return: 'badge-yellow', damage: 'badge-red', opening: 'badge-gray' };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Inventory & Stock</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['inventory', 'movements'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'inventory' ? 'Stock Levels' : 'Movement History'}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <>
          <div className="card p-4 flex flex-wrap gap-3">
            <SearchBar value={search} onChange={setSearch} placeholder="Search products..." className="flex-1 min-w-48" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-44">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <div className="card overflow-hidden">
            {loading ? <div className="py-20"><LoadingSpinner size="lg" /></div> : products.length === 0 ? <EmptyState title="No products found" /> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="th">Product</th>
                        <th className="th">SKU</th>
                        <th className="th">Category</th>
                        <th className="th">Current Stock</th>
                        <th className="th">Min Level</th>
                        <th className="th">Value</th>
                        <th className="th">Status</th>
                        <th className="th">Adjust</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {products.map((p) => (
                        <tr key={p._id} className="table-row-hover">
                          <td className="td font-medium">{p.name}</td>
                          <td className="td font-mono text-xs">{p.sku}</td>
                          <td className="td">{p.category?.name || '-'}</td>
                          <td className="td font-bold text-lg">{p.stock}</td>
                          <td className="td text-gray-400">{p.minStockLevel}</td>
                          <td className="td">{formatCurrency(p.stock * p.purchasePrice)}</td>
                          <td className="td"><StockBadge stock={p.stock} minStock={p.minStockLevel} /></td>
                          <td className="td">
                            <button
                              onClick={() => { setSelectedProduct(p); setShowAdjust(true); setAdjustData({ type: 'purchase', quantity: 1, reason: '' }); }}
                              className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-600 transition-colors"
                            >
                              <ArrowUpDown className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
              </>
            )}
          </div>
        </>
      )}

      {tab === 'movements' && (
        <div className="card overflow-hidden">
          {loading ? <div className="py-20"><LoadingSpinner size="lg" /></div> : movements.length === 0 ? <EmptyState title="No movements found" /> : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="th">Date</th>
                      <th className="th">Product</th>
                      <th className="th">Type</th>
                      <th className="th">Qty Change</th>
                      <th className="th">Before</th>
                      <th className="th">After</th>
                      <th className="th">Reason</th>
                      <th className="th">By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {movements.map((m) => (
                      <tr key={m._id} className="table-row-hover">
                        <td className="td text-xs text-gray-500">{formatDateTime(m.createdAt)}</td>
                        <td className="td font-medium text-sm">{m.product?.name}</td>
                        <td className="td"><span className={typeColors[m.type] || 'badge-gray'}>{m.type}</span></td>
                        <td className={`td font-bold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </td>
                        <td className="td text-gray-400">{m.quantityBefore}</td>
                        <td className="td font-medium">{m.quantityAfter}</td>
                        <td className="td text-gray-500">{m.reason || '-'}</td>
                        <td className="td text-gray-500">{m.performedBy?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} totalPages={totalPages} total={total} limit={30} onPage={setPage} />
            </>
          )}
        </div>
      )}

      {/* Adjust Modal */}
      <Modal
        isOpen={showAdjust}
        onClose={() => setShowAdjust(false)}
        title={`Adjust Stock — ${selectedProduct?.name}`}
        size="sm"
        footer={
          <>
            <button onClick={() => setShowAdjust(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAdjust} className="btn-primary" disabled={adjustLoading}>
              {adjustLoading && <LoadingSpinner size="sm" />} Adjust Stock
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
            <span className="text-sm text-gray-600">Current Stock</span>
            <span className="font-bold text-gray-900">{selectedProduct?.stock} {selectedProduct?.unit}</span>
          </div>
          <div>
            <label className="label">Movement Type</label>
            <select value={adjustData.type} onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })} className="input">
              <option value="purchase">Purchase (Add Stock)</option>
              <option value="adjustment">Adjustment (Add)</option>
              <option value="damage">Damage (Remove)</option>
              <option value="return">Return (Add)</option>
            </select>
          </div>
          <div>
            <label className="label">Quantity</label>
            <input type="number" min={1} value={adjustData.quantity} onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Reason *</label>
            <input value={adjustData.reason} onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })} className="input" placeholder="Reason for adjustment" />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Inventory;
