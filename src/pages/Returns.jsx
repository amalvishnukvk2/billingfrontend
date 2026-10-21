import { useState, useEffect, useCallback } from 'react';
import { returnAPI } from '../services/api';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { RefreshCw } from 'lucide-react';

export const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const limit = 20;

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await returnAPI.getAll({ page, limit, startDate, endDate });
      setReturns(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { } finally { setLoading(false); }
  }, [page, startDate, endDate]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const typeColors = { full: 'badge-red', partial: 'badge-yellow', exchange: 'badge-blue' };
  const methodColors = { cash: 'badge-green', upi: 'badge-blue', card: 'badge-blue', bank_transfer: 'badge-gray', credit_note: 'badge-purple' };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Return History ({total})</h1>
        <button onClick={fetchReturns} className="btn-outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <label className="text-sm text-gray-600 font-medium">Date range:</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input w-36" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input w-36" />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="py-20"><LoadingSpinner size="lg" /></div>
        ) : returns.length === 0 ? (
          <EmptyState title="No returns found" message="Processed returns will appear here." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">Return No.</th>
                    <th className="th">Invoice</th>
                    <th className="th">Customer</th>
                    <th className="th">Items</th>
                    <th className="th">Refund Amount</th>
                    <th className="th">Method</th>
                    <th className="th">Type</th>
                    <th className="th">Reason</th>
                    <th className="th">Processed By</th>
                    <th className="th">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {returns.map((r) => (
                    <tr key={r._id} className="table-row-hover">
                      <td className="td font-mono text-teal-600 font-medium">{r.returnNumber}</td>
                      <td className="td font-mono text-xs text-gray-500">{r.invoiceNumber}</td>
                      <td className="td">{r.customer?.name || 'Walk-in'}</td>
                      <td className="td">{r.items?.length}</td>
                      <td className="td font-bold text-red-600">{formatCurrency(r.totalRefundAmount)}</td>
                      <td className="td"><span className={methodColors[r.refundMethod] || 'badge-gray'}>{r.refundMethod?.replace('_', ' ')}</span></td>
                      <td className="td"><span className={typeColors[r.type] || 'badge-gray'}>{r.type}</span></td>
                      <td className="td text-gray-500 max-w-xs truncate">{r.reason}</td>
                      <td className="td text-gray-400">{r.processedBy?.name}</td>
                      <td className="td text-xs text-gray-400">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
};

export default Returns;
