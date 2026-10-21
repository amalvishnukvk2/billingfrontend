import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, Upload, Download, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { productAPI, categoryAPI, exportAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import StockBadge from '../components/StockBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import ProductModal from '../features/products/ProductModal';
import useAuthStore from '../store/authStore';
import { getProductImageUrl } from '../utils/config';

export const Products = () => {
  const { user } = useAuthStore();
  const canEdit = ['admin', 'manager'].includes(user?.role);
  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productAPI.getAll({ search, category: categoryFilter, stockStatus: stockFilter, page, limit });
      setProducts(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search, categoryFilter, stockFilter, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { categoryAPI.getAll().then((r) => setCategories(r.data.data)); }, []);
  useEffect(() => { setPage(1); }, [search, categoryFilter, stockFilter]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productAPI.delete(deleteTarget._id);
      toast.success('Product deactivated');
      setDeleteTarget(null);
      fetchProducts();
    } catch { toast.error('Failed to delete product'); }
    finally { setDeleting(false); }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const res = await productAPI.exportCSV();
      exportAPI.downloadBlob(res.data, 'products-export.csv');
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) return toast.error('Please select a CSV file');
    setImporting(true);
    try {
      const res = await productAPI.importCSV(file);
      const { created, skipped, errors } = res.data;
      toast.success(`Imported: ${created} created, ${skipped} skipped`);
      if (errors?.length) {
        console.warn('Import errors:', errors);
        toast.error(`${errors.length} row(s) had errors. Check console.`);
      }
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Products ({total})</h1>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} disabled={exporting} className="btn-outline text-sm">
              {exporting ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
              Export CSV
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="btn-outline text-sm"
            >
              {importing ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />
            <button
              onClick={() => { setEditProduct(null); setShowModal(true); }}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" /> Add Product
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, SKU, barcode..."
            className="flex-1 min-w-48"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input w-44"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Stock</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* CSV template hint */}
      {canEdit && (
        <div className="flex items-start gap-2 px-1 text-xs text-gray-400">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-yellow-400 shrink-0" />
          CSV import columns: SKU, Name, Barcode, Category, Brand, Description, Purchase Price, Selling Price, Tax Rate %, Stock, Min Stock Level, Unit, Supplier
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" /></div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No products found"
            message="Try adjusting your filters or add a new product."
            action={canEdit && (
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus className="h-4 w-4" /> Add Product
              </button>
            )}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th w-10 text-center">#</th>
                    <th className="th">Product</th>
                    <th className="th">SKU</th>
                    <th className="th">Category</th>
                    <th className="th">Purchase</th>
                    <th className="th">Selling</th>
                    <th className="th">Tax</th>
                    <th className="th">Stock</th>
                    <th className="th">Status</th>
                    {canEdit && <th className="th">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((p, index) => (
                    <tr key={p._id} className="table-row-hover">
                      <td className="td text-center text-xs font-medium text-gray-400 w-10">
                        {(page - 1) * limit + index + 1}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          {p.image ? (
                            <img
                              src={getProductImageUrl(p.image)}
                              alt={p.name}
                              className="h-9 w-9 rounded-lg object-cover border border-gray-200 shrink-0"
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center text-teal-700 text-sm font-bold shrink-0">
                              {p.name[0]}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{p.name}</p>
                            {p.brand && <p className="text-xs text-gray-400">{p.brand}</p>}
                            {p.barcode && <p className="text-xs text-gray-300 font-mono">{p.barcode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="td font-mono text-xs text-gray-600">{p.sku}</td>
                      <td className="td text-sm">{p.category?.name || '-'}</td>
                      <td className="td text-sm">{formatCurrency(p.purchasePrice)}</td>
                      <td className="td font-semibold text-sm">{formatCurrency(p.sellingPrice)}</td>
                      <td className="td text-sm text-gray-500">{p.taxRate}%</td>
                      <td className="td">
                        <span className={`font-bold text-sm ${p.stock <= 0 ? 'text-red-600' : p.stock <= p.minStockLevel ? 'text-yellow-600' : 'text-gray-900'}`}>
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="td">
                        <StockBadge stock={p.stock} minStock={p.minStockLevel} />
                      </td>
                      {canEdit && (
                        <td className="td">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => { setEditProduct(p); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                              title="Deactivate"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
          </>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={editProduct}
          categories={categories}
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); fetchProducts(); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Deactivate Product"
        message={`Are you sure you want to deactivate "${deleteTarget?.name}"? It will be hidden from POS and listings.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
};

export default Products;
