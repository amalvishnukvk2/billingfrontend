import { useEffect, useState } from 'react';
import {
  Package, AlertTriangle,
  RefreshCw, IndianRupee, Receipt,
} from 'lucide-react';
import { reportAPI, productAPI } from '../services/api';
import DashboardCard from '../components/DashboardCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatDateTime, getPaymentStatusLabel } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import StockBadge from '../components/StockBadge';

const filters = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: 'week' },
  { label: 'Last 30 Days', value: 'month' },
];

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('today');
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, lowRes] = await Promise.all([
        reportAPI.getDashboard({ filter }),
        productAPI.getLowStock(),
      ]);
      setData(dashRes.data.data);
      setLowStockProducts(lowRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  const d = data || {};

  return (
    <div className="space-y-6">
      {/* Filter + Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f.value ? 'bg-teal-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={fetchData} className="btn-outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* KPI Cards — all in one row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Sales"
          value={formatCurrency(d.sales?.total)}
          subtitle={`${d.sales?.count || 0} bills`}
          icon={IndianRupee}
          color="teal"
        />
        <DashboardCard
          title="Total Products"
          value={d.products?.total || 0}
          subtitle="Active products"
          icon={Package}
          color="blue"
          onClick={() => navigate('/products')}
        />
        <DashboardCard
          title="Low Stock"
          value={d.products?.lowStock || 0}
          subtitle="Need restocking"
          icon={AlertTriangle}
          color="yellow"
          onClick={() => navigate('/inventory')}
        />
        <DashboardCard
          title="Out of Stock"
          value={d.products?.outOfStock || 0}
          subtitle="Zero inventory"
          icon={Package}
          color="red"
          onClick={() => navigate('/inventory')}
        />
      </div>

      {/* Top Products */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Top Products</h3>
        {d.topProducts?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {d.topProducts.slice(0, 8).map((p, i) => (
              <div key={p._id} className="flex items-center gap-3 py-2.5">
                <span className="w-5 text-xs text-gray-400 font-medium text-right shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.productName}</p>
                  <p className="text-xs text-gray-400">{p.totalQty} units sold</p>
                </div>
                <span className="text-sm font-semibold text-teal-700 shrink-0">₹{p.totalRevenue?.toFixed(0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-gray-400 text-sm">No sales data for this period</div>
        )}
      </div>



      {/* Recent Transactions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="th">Invoice</th>
                <th className="th">Customer</th>
                <th className="th">Cashier</th>
                <th className="th">Amount</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {d.recentSales?.length > 0 ? (
                d.recentSales.map((sale) => {
                  const { label, class: cls } = getPaymentStatusLabel(sale.paymentStatus);
                  return (
                    <tr key={sale._id} className="table-row-hover">
                      <td className="td font-mono text-teal-600">{sale.invoiceNumber}</td>
                      <td className="td">{sale.customerName}</td>
                      <td className="td">{sale.cashier?.name}</td>
                      <td className="td font-semibold">{formatCurrency(sale.grandTotal)}</td>
                      <td className="td"><span className={cls}>{label}</span></td>
                      <td className="td text-gray-500">{formatDateTime(sale.createdAt)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400 text-sm">No recent transactions</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock / Out of Stock Warning Table */}
      {lowStockProducts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Stock Alerts ({lowStockProducts.length})
            </h3>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs text-teal-600 hover:underline font-medium"
            >
              Manage Inventory →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="th">Product</th>
                  <th className="th">SKU</th>
                  <th className="th">Category</th>
                  <th className="th">Current Stock</th>
                  <th className="th">Min Level</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStockProducts.slice(0, 10).map((p) => (
                  <tr key={p._id} className="table-row-hover">
                    <td className="td font-medium text-gray-900">{p.name}</td>
                    <td className="td font-mono text-xs text-gray-500">{p.sku}</td>
                    <td className="td text-gray-500">{p.category?.name || '-'}</td>
                    <td className={`td font-bold ${p.stock <= 0 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {p.stock} {p.unit}
                    </td>
                    <td className="td text-gray-400">{p.minStockLevel}</td>
                    <td className="td">
                      <StockBadge stock={p.stock} minStock={p.minStockLevel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
