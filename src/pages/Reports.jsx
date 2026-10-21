import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { reportAPI, exportAPI } from '../services/api';
import { LoadingSpinner } from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { formatCurrency, exportToCSV } from '../utils/formatters';
import { Download, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'sales',                label: 'Sales' },
  { id: 'profit',               label: 'Profit & Loss' },
  { id: 'products',             label: 'Product-wise' },
  { id: 'inventory',            label: 'Inventory' },
  { id: 'cashiers',             label: 'Cashiers' },
  { id: 'customer_outstanding', label: 'Customer Outstanding' },
];

const PIE_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#ec4899'];

const noDateTabs = ['inventory', 'customer_outstanding'];

export const Reports = () => {
  const [tab, setTab] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const buildParams = () =>
    startDate && endDate ? { startDate, endDate } : { filter };

  const fetchData = async (activeTab = tab) => {
    setLoading(true);
    setData(null);
    const params = buildParams();
    try {
      let res;
      switch (activeTab) {
        case 'sales': res = await reportAPI.getSales(params); break;
        case 'profit': res = await reportAPI.getProfit(params); break;
        case 'products': res = await reportAPI.getProducts(params); break;
        case 'inventory': res = await reportAPI.getInventory(); break;
        case 'cashiers': res = await reportAPI.getCashiers(params); break;
        case 'customer_outstanding': res = await reportAPI.getCustomerOutstanding(); break;
        default: res = null;
      }
      setData(res?.data || null);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(tab); }, [tab, filter, startDate, endDate]);

  const handleDownloadSalesCSV = async () => {
    try {
      const res = await exportAPI.salesBlob(buildParams());
      exportAPI.downloadBlob(res.data, 'sales-report.csv');
      toast.success('Downloaded');
    } catch { toast.error('Export failed'); }
  };

  const handleDownloadInventoryCSV = async () => {
    try {
      const res = await exportAPI.inventoryBlob();
      exportAPI.downloadBlob(res.data, 'inventory-report.csv');
      toast.success('Downloaded');
    } catch { toast.error('Export failed'); }
  };

  /* ─── Summary card helper ─── */
  const SummaryCard = ({ label, value, color = 'text-gray-900' }) => (
    <div className="card p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );

  /* ─── SALES TAB ─── */
  const renderSales = () => {
    const rows = data?.data || [];
    const s = data?.summary || {};

    /* Custom tooltip shown on bar hover */
    const SalesTooltip = ({ active, payload }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0]?.payload;
      return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-sm min-w-[200px]">
          <p className="font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">
            📅 {d._id}
          </p>
          <div className="space-y-1.5">
            <div className="flex justify-between gap-6">
              <span className="text-gray-500">Bills Raised</span>
              <span className="font-semibold text-blue-600">{d.billCount}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-gray-500">Gross Sales</span>
              <span className="font-semibold text-teal-600">{formatCurrency(d.grossSales)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-gray-500">Discount</span>
              <span className="font-semibold text-yellow-600">-{formatCurrency(d.totalDiscount)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-gray-500">Tax (GST)</span>
              <span className="font-semibold text-purple-600">{formatCurrency(d.totalTax)}</span>
            </div>
            <div className="flex justify-between gap-6 pt-2 border-t border-gray-100">
              <span className="text-gray-700 font-medium">Net Sales</span>
              <span className="font-bold text-gray-900">
                {formatCurrency((d.grossSales || 0) - (d.totalDiscount || 0))}
              </span>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="space-y-5">
        {/* Summary KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard label="Gross Sales"     value={formatCurrency(s.total)}    color="text-teal-600" />
          <SummaryCard label="Bills Raised"    value={s.count ?? 0}               color="text-blue-600" />
          <SummaryCard label="Total Discount"  value={formatCurrency(s.discount)} color="text-yellow-600" />
          <SummaryCard label="Tax Collected"   value={formatCurrency(s.tax)}      color="text-purple-600" />
        </div>

        {rows.length > 0 ? (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Daily Sales</h3>
              <button className="btn-outline text-sm" onClick={handleDownloadSalesCSV}>
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={rows}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                barCategoryGap="35%"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="_id"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
                  width={48}
                />
                <Tooltip
                  content={<SalesTooltip />}
                  cursor={{ fill: 'rgba(13,148,136,0.08)', radius: 6 }}
                />
                <Bar
                  dataKey="grossSales"
                  fill="#0d9488"
                  radius={[6, 6, 0, 0]}
                  name="Gross Sales"
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-center text-gray-400 mt-2">
              Hover over a bar to see full day details
            </p>
          </div>
        ) : (
          <EmptyState title="No sales data" message="Try a different date range." />
        )}

        {/* Daily breakdown table */}
        {rows.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 text-sm">Daily Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">Date</th>
                    <th className="th text-center">Bills</th>
                    <th className="th text-right">Gross Sales</th>
                    <th className="th text-right">Discount</th>
                    <th className="th text-right">Tax</th>
                    <th className="th text-right">Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((r) => (
                    <tr key={r._id} className="table-row-hover">
                      <td className="td font-medium">{r._id}</td>
                      <td className="td text-center">
                        <span className="badge-blue">{r.billCount}</span>
                      </td>
                      <td className="td text-right font-bold text-teal-600">
                        {formatCurrency(r.grossSales)}
                      </td>
                      <td className="td text-right text-yellow-600">
                        -{formatCurrency(r.totalDiscount)}
                      </td>
                      <td className="td text-right text-purple-600">
                        {formatCurrency(r.totalTax)}
                      </td>
                      <td className="td text-right font-bold text-gray-900">
                        {formatCurrency((r.grossSales || 0) - (r.totalDiscount || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Footer totals */}
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="td font-bold text-gray-700">Total</td>
                    <td className="td text-center font-bold">{s.count}</td>
                    <td className="td text-right font-bold text-teal-700">{formatCurrency(s.total)}</td>
                    <td className="td text-right font-bold text-yellow-700">-{formatCurrency(s.discount)}</td>
                    <td className="td text-right font-bold text-purple-700">{formatCurrency(s.tax)}</td>
                    <td className="td text-right font-bold text-gray-900">
                      {formatCurrency((s.total || 0) - (s.discount || 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── PROFIT TAB ─── */
  const renderProfit = () => {
    const d = data?.data;
    if (!d) return <EmptyState title="No data available" />;
    const expBreak = d.expenseBreakdown || [];
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <SummaryCard label="Gross Revenue" value={formatCurrency(d.grossRevenue)} color="text-teal-600" />
          <SummaryCard label="Cost of Goods Sold" value={formatCurrency(d.cogs)} color="text-red-600" />
          <SummaryCard label="Gross Profit" value={formatCurrency(d.grossProfit)} color="text-green-600" />
          <SummaryCard label="Tax Collected" value={formatCurrency(d.taxCollected)} color="text-purple-600" />
          <SummaryCard
            label="Net Profit"
            value={formatCurrency(d.netProfit)}
            color={d.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}
          />
        </div>

        {/* Margin indicator */}
        {d.grossRevenue > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Profit Margin</h3>
            <div className="space-y-3">
              {[
                { label: 'Gross Margin', value: ((d.grossProfit / d.grossRevenue) * 100).toFixed(1), color: 'bg-green-500' },
                { label: 'Net Margin', value: ((d.netProfit / d.grossRevenue) * 100).toFixed(1), color: d.netProfit >= 0 ? 'bg-teal-500' : 'bg-red-500' },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{m.label}</span>
                    <span className="font-bold">{m.value}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.color} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, Math.abs(parseFloat(m.value))))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expBreak.length > 0 && (
          <div className="card p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Expense Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={expBreak}
                    dataKey="total"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ _id, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {expBreak.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {expBreak.map((e, i) => (
                  <div key={e._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="capitalize text-gray-700">{e._id}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(e.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── PRODUCTS TAB ─── */
  const renderProducts = () => {
    const rows = data?.data || [];
    if (!rows.length) return <EmptyState title="No product data" />;
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            className="btn-outline text-sm"
            onClick={() => exportToCSV(
              rows.map((p) => ({
                Product: p.productName, SKU: p.sku,
                'Qty Sold': p.totalQty, Revenue: p.totalRevenue?.toFixed(2),
                COGS: p.totalCogs?.toFixed(2), Profit: p.totalProfit?.toFixed(2),
              })),
              'product-report'
            )}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">#</th>
                <th className="th">Product</th>
                <th className="th">SKU</th>
                <th className="th">Qty Sold</th>
                <th className="th">Revenue</th>
                <th className="th">COGS</th>
                <th className="th">Gross Profit</th>
                <th className="th">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p, i) => {
                const margin = p.totalRevenue > 0 ? ((p.totalProfit / p.totalRevenue) * 100).toFixed(1) : 0;
                return (
                  <tr key={p._id} className="table-row-hover">
                    <td className="td text-gray-400">{i + 1}</td>
                    <td className="td font-medium">{p.productName}</td>
                    <td className="td font-mono text-xs text-gray-500">{p.sku}</td>
                    <td className="td font-semibold">{p.totalQty}</td>
                    <td className="td text-teal-600 font-semibold">{formatCurrency(p.totalRevenue)}</td>
                    <td className="td text-gray-500">{formatCurrency(p.totalCogs)}</td>
                    <td className={`td font-bold ${p.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(p.totalProfit)}
                    </td>
                    <td className="td">
                      <span className={`badge-${p.totalProfit >= 0 ? 'green' : 'red'}`}>{margin}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─── INVENTORY TAB ─── */
  const renderInventory = () => {
    const s = data?.summary;
    const rows = data?.data || [];
    if (!s && !rows.length) return <EmptyState title="No inventory data" />;
    return (
      <div className="space-y-5">
        {s && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <SummaryCard label="Total Products" value={s.totalProducts} color="text-blue-600" />
            <SummaryCard label="Total Stock Units" value={s.totalStock?.toLocaleString()} color="text-gray-900" />
            <SummaryCard label="Inventory Cost Value" value={formatCurrency(s.inventoryValue)} color="text-teal-600" />
            <SummaryCard label="Selling Value" value={formatCurrency(s.sellingValue)} color="text-green-600" />
            <SummaryCard label="Low Stock Products" value={s.lowStock} color="text-yellow-600" />
            <SummaryCard label="Out of Stock" value={s.outOfStock} color="text-red-600" />
          </div>
        )}
        <div className="flex justify-end">
          <button className="btn-outline text-sm" onClick={handleDownloadInventoryCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Product</th>
                <th className="th">SKU</th>
                <th className="th">Category</th>
                <th className="th">Stock</th>
                <th className="th">Cost/Unit</th>
                <th className="th">Cost Value</th>
                <th className="th">Selling Value</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((p) => (
                <tr key={p._id} className="table-row-hover">
                  <td className="td font-medium">{p.name}</td>
                  <td className="td font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="td text-gray-500">{p.category?.name || '-'}</td>
                  <td className="td font-bold">{p.stock} {p.unit}</td>
                  <td className="td">{formatCurrency(p.purchasePrice)}</td>
                  <td className="td">{formatCurrency(p.stock * p.purchasePrice)}</td>
                  <td className="td text-green-600">{formatCurrency(p.stock * p.sellingPrice)}</td>
                  <td className="td">
                    {p.stock <= 0
                      ? <span className="badge-red">Out of Stock</span>
                      : p.stock <= p.minStockLevel
                      ? <span className="badge-yellow">Low Stock</span>
                      : <span className="badge-green">In Stock</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─── CASHIERS TAB ─── */
  const renderCashiers = () => {
    const rows = data?.data || [];
    if (!rows.length) return <EmptyState title="No cashier data" />;
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            className="btn-outline text-sm"
            onClick={() => exportToCSV(
              rows.map((c) => ({
                Name: c.cashier?.name, Role: c.cashier?.role,
                'Bills Processed': c.billCount,
                'Total Sales': c.totalSales?.toFixed(2),
                'Total Discount': c.totalDiscount?.toFixed(2),
              })),
              'cashier-report'
            )}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">#</th>
                <th className="th">Staff Member</th>
                <th className="th">Role</th>
                <th className="th">Bills</th>
                <th className="th">Total Sales</th>
                <th className="th">Avg Bill Value</th>
                <th className="th">Discounts Given</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c, i) => (
                <tr key={c._id} className="table-row-hover">
                  <td className="td text-gray-400">{i + 1}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold">
                        {c.cashier?.name?.[0] || '?'}
                      </div>
                      <span className="font-medium">{c.cashier?.name}</span>
                    </div>
                  </td>
                  <td className="td capitalize">
                    <span className={`badge-${c.cashier?.role === 'admin' ? 'purple' : c.cashier?.role === 'manager' ? 'blue' : 'green'}`}>
                      {c.cashier?.role}
                    </span>
                  </td>
                  <td className="td font-semibold">{c.billCount}</td>
                  <td className="td font-bold text-teal-600">{formatCurrency(c.totalSales)}</td>
                  <td className="td">{formatCurrency(c.billCount ? c.totalSales / c.billCount : 0)}</td>
                  <td className="td text-yellow-600">{formatCurrency(c.totalDiscount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  /* ─── CUSTOMER OUTSTANDING ─── */
  const renderCustomerOutstanding = () => {
    const rows = data?.data || [];
    const total = data?.totalOutstanding || 0;
    if (!rows.length) return (
      <div className="card p-10 text-center">
        <Users className="h-10 w-10 text-green-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">All customers have cleared their dues!</p>
      </div>
    );
    return (
      <div className="space-y-4">
        <div className="card p-4 flex items-center justify-between bg-red-50 border-red-200">
          <div>
            <p className="text-sm text-red-600 font-medium">Total Customer Outstanding</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(total)}</p>
          </div>
          <button
            className="btn-outline text-sm"
            onClick={() => exportToCSV(
              rows.map((c) => ({ Name: c.name, Phone: c.phone, Email: c.email, Outstanding: c.outstandingBalance?.toFixed(2) })),
              'customer-outstanding'
            )}
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="th">Customer</th>
                <th className="th">Phone</th>
                <th className="th">Email</th>
                <th className="th">Total Purchases</th>
                <th className="th">Purchase Amount</th>
                <th className="th">Outstanding Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => (
                <tr key={c._id} className="table-row-hover">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td text-gray-500">{c.phone || '-'}</td>
                  <td className="td text-gray-500">{c.email || '-'}</td>
                  <td className="td">{c.totalPurchases}</td>
                  <td className="td">{formatCurrency(c.totalPurchaseAmount)}</td>
                  <td className="td font-bold text-red-600">{formatCurrency(c.outstandingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div className="py-24"><LoadingSpinner size="lg" /></div>;
    switch (tab) {
      case 'sales': return renderSales();
      case 'profit': return renderProfit();
      case 'products': return renderProducts();
      case 'inventory': return renderInventory();
      case 'cashiers': return renderCashiers();
      case 'customer_outstanding': return renderCustomerOutstanding();
      default: return null;
    }
  };

  const showDateFilter = !noDateTabs.includes(tab);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
      </div>

      {/* Date Filters */}
      {showDateFilter && (
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          {['today', 'week', 'month'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setStartDate(''); setEndDate(''); }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f && !startDate
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'today' ? 'Today' : f === 'week' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input w-36 text-sm"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input w-36 text-sm"
            />
          </div>
        </div>
      )}

      {/* Tabs — scrollable on mobile */}
      <div className="overflow-x-auto">
        <div className="flex gap-0 border-b border-gray-200 min-w-max">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === t.id
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {renderContent()}
    </div>
  );
};

export default Reports;
