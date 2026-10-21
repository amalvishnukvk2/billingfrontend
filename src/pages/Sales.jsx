import { useState, useEffect, useCallback } from 'react';
import { Eye, XCircle, RefreshCw, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { saleAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import InvoicePreview from '../features/billing/InvoicePreview';
import { formatCurrency, formatDateTime, getPaymentStatusLabel } from '../utils/formatters';
import useAuthStore from '../store/authStore';

export const Sales = () => {
  const { user } = useAuthStore();
  const canManage = ['admin', 'manager'].includes(user?.role);

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [viewSale, setViewSale] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelReason, setShowCancelReason] = useState(false);

  const [returnSale, setReturnSale] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [returnMethod, setReturnMethod] = useState('cash');
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await saleAPI.getAll({ search, paymentStatus: paymentFilter, startDate, endDate, page, limit });
      setSales(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); }
  }, [search, paymentFilter, startDate, endDate, page]);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { setPage(1); }, [search, paymentFilter, startDate, endDate]);

  const handleViewSale = async (sale) => {
    try {
      const res = await saleAPI.getOne(sale._id);
      setViewSale(res.data.data);
    } catch { toast.error('Failed to load sale details'); }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return toast.error('Cancellation reason required');
    setCancelling(true);
    try {
      await saleAPI.cancel(cancelTarget._id, { reason: cancelReason });
      toast.success('Sale cancelled');
      setCancelTarget(null);
      setShowCancelReason(false);
      setCancelReason('');
      fetchSales();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to cancel'); }
    finally { setCancelling(false); }
  };

  const openReturn = (sale) => {
    setReturnSale(sale);
    setReturnItems(sale.items?.filter((i) => i.quantity - i.returnedQuantity > 0).map((i) => ({
      productId: i.product?._id || i.product,
      productName: i.productName,
      maxQty: i.quantity - i.returnedQuantity,
      quantity: 0,
      restockItem: true,
    })) || []);
  };

  const handleReturn = async () => {
    const itemsToReturn = returnItems.filter((i) => i.quantity > 0);
    if (!itemsToReturn.length) return toast.error('Select items to return');
    if (!returnReason.trim()) return toast.error('Return reason required');

    setReturning(true);
    try {
      await saleAPI.processReturn(returnSale._id, { items: itemsToReturn, refundMethod: returnMethod, reason: returnReason });
      toast.success('Return processed successfully');
      setReturnSale(null);
      fetchSales();
    } catch (err) { toast.error(err.response?.data?.message || 'Return failed'); }
    finally { setReturning(false); }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Sales & Returns ({total})</h1>
        <button onClick={fetchSales} className="btn-outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder="Search invoice, customer..." className="flex-1 min-w-48" />
        <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="input w-36">
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input w-36" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input w-36" />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? <div className="py-20"><LoadingSpinner size="lg" /></div> : sales.length === 0 ? <EmptyState title="No sales found" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">Invoice</th>
                    <th className="th">Customer</th>
                    <th className="th">Cashier</th>
                    <th className="th">Items</th>
                    <th className="th">Total</th>
                    <th className="th">Payment</th>
                    <th className="th">Status</th>
                    <th className="th">Date</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sales.map((sale) => {
                    const { label, class: cls } = getPaymentStatusLabel(sale.paymentStatus);
                    return (
                      <tr key={sale._id} className="table-row-hover">
                        <td className="td font-mono text-teal-600 font-medium">{sale.invoiceNumber}</td>
                        <td className="td">{sale.customerName}</td>
                        <td className="td text-gray-500">{sale.cashier?.name}</td>
                        <td className="td">{sale.items?.length}</td>
                        <td className="td font-bold">{formatCurrency(sale.grandTotal)}</td>
                        <td className="td">
                          {sale.amountDue > 0 && <span className="text-xs text-red-500">Due: {formatCurrency(sale.amountDue)}</span>}
                        </td>
                        <td className="td"><span className={cls}>{label}</span></td>
                        <td className="td text-xs text-gray-400">{formatDateTime(sale.createdAt)}</td>
                        <td className="td">
                          <div className="flex gap-1">
                            <button onClick={() => handleViewSale(sale)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye className="h-4 w-4" /></button>
                            {canManage && sale.status === 'completed' && (
                              <>
                                <button onClick={() => openReturn(sale)} className="p-1.5 rounded hover:bg-yellow-50 text-yellow-600" title="Process Return">
                                  <RefreshCw className="h-4 w-4" />
                                </button>
                                <button onClick={() => { setCancelTarget(sale); setShowCancelReason(true); }} className="p-1.5 rounded hover:bg-red-50 text-red-500"><XCircle className="h-4 w-4" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
          </>
        )}
      </div>

      {/* Invoice Preview Modal */}
      <Modal isOpen={!!viewSale} onClose={() => setViewSale(null)} title="Invoice Details" size="md"
        footer={<>
          <button onClick={() => setViewSale(null)} className="btn-secondary">Close</button>
          <button onClick={() => window.print()} className="btn-outline"><Printer className="h-4 w-4" /> Print</button>
        </>}
      >
        {viewSale && <InvoicePreview sale={viewSale} />}
      </Modal>

      {/* Cancel Reason */}
      <Modal isOpen={showCancelReason} onClose={() => { setShowCancelReason(false); setCancelTarget(null); }} title="Cancel Sale" size="sm"
        footer={<>
          <button onClick={() => { setShowCancelReason(false); setCancelTarget(null); }} className="btn-secondary">Back</button>
          <button onClick={handleCancel} className="btn-danger" disabled={cancelling}>
            {cancelling && <LoadingSpinner size="sm" />} Cancel Sale
          </button>
        </>}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Cancelling sale <strong>{cancelTarget?.invoiceNumber}</strong> will restore all stock.</p>
          <div>
            <label className="label">Reason for cancellation *</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="input resize-none" rows={3} />
          </div>
        </div>
      </Modal>

      {/* Return Modal */}
      <Modal isOpen={!!returnSale} onClose={() => setReturnSale(null)} title={`Process Return — ${returnSale?.invoiceNumber}`} size="md"
        footer={<>
          <button onClick={() => setReturnSale(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleReturn} className="btn-primary" disabled={returning}>
            {returning && <LoadingSpinner size="sm" />} Process Return
          </button>
        </>}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {returnItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.productName}</p>
                  <p className="text-xs text-gray-400">Max returnable: {item.maxQty}</p>
                </div>
                <input
                  type="number"
                  min={0}
                  max={item.maxQty}
                  value={item.quantity}
                  onChange={(e) => setReturnItems((prev) => prev.map((i, j) => j === idx ? { ...i, quantity: Number(e.target.value) } : i))}
                  className="input w-20 text-center"
                />
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={item.restockItem}
                    onChange={(e) => setReturnItems((prev) => prev.map((i, j) => j === idx ? { ...i, restockItem: e.target.checked } : i))}
                  /> Restock
                </label>
              </div>
            ))}
          </div>
          <div>
            <label className="label">Refund Method</label>
            <select value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)} className="input">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="credit_note">Credit Note</option>
            </select>
          </div>
          <div>
            <label className="label">Reason *</label>
            <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="input" placeholder="Reason for return..." />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Sales;
