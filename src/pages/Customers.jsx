import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Eye, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { customerAPI } from '../services/api';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';

const emptyForm = { name: '', phone: '', email: '', address: { city: '', state: '' }, gstNumber: '', creditLimit: 0, notes: '' };

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customerAPI.getAll({ search, page, limit });
      setCustomers(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search]);

  const openModal = (customer = null) => {
    setEditCustomer(customer);
    setForm(customer ? { ...emptyForm, ...customer, address: { ...emptyForm.address, ...customer.address } } : emptyForm);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Customer name required');
    setSaving(true);
    try {
      if (editCustomer) {
        await customerAPI.update(editCustomer._id, form);
        toast.success('Customer updated');
      } else {
        await customerAPI.create(form);
        toast.success('Customer created');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleViewHistory = async (customer) => {
    setViewCustomer(customer);
    setHistoryLoading(true);
    try {
      const res = await customerAPI.getHistory(customer._id);
      setHistory(res.data.data);
    } catch { toast.error('Failed to load history'); }
    finally { setHistoryLoading(false); }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) return toast.error('Invalid amount');
    try {
      await customerAPI.recordPayment(paymentModal._id, { amount: Number(paymentAmount), method: 'cash' });
      toast.success('Payment recorded');
      setPaymentModal(null);
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Customers ({total})</h1>
        <button onClick={() => openModal()} className="btn-primary"><Plus className="h-4 w-4" /> Add Customer</button>
      </div>

      <div className="card p-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone..." className="max-w-md" />
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="py-20"><LoadingSpinner size="lg" /></div> : customers.length === 0 ? <EmptyState title="No customers found" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="th">Customer</th>
                    <th className="th">Phone</th>
                    <th className="th">Total Purchases</th>
                    <th className="th">Purchase Amount</th>
                    <th className="th">Outstanding</th>
                    <th className="th">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr key={c._id} className="table-row-hover">
                      <td className="td">
                        <p className="font-medium">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </td>
                      <td className="td">{c.phone || '-'}</td>
                      <td className="td">{c.totalPurchases || 0}</td>
                      <td className="td font-semibold">{formatCurrency(c.totalPurchaseAmount)}</td>
                      <td className="td">
                        {c.outstandingBalance > 0 ? (
                          <span className="badge-red">{formatCurrency(c.outstandingBalance)}</span>
                        ) : <span className="badge-green">Clear</span>}
                      </td>
                      <td className="td">
                        <div className="flex gap-1.5">
                          <button onClick={() => handleViewHistory(c)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => openModal(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500"><Edit2 className="h-4 w-4" /></button>
                          {c.outstandingBalance > 0 && (
                            <button onClick={() => { setPaymentModal(c); setPaymentAmount(c.outstandingBalance); }} className="p-1.5 rounded hover:bg-green-50 text-green-600">
                              <DollarSign className="h-4 w-4" />
                            </button>
                          )}
                        </div>
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

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editCustomer ? 'Edit Customer' : 'Add Customer'} size="md"
        footer={<>
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>{saving && <LoadingSpinner size="sm" />} Save</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Full Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></div>
          <div><label className="label">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></div>
          <div><label className="label">Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="input" /></div>
          <div><label className="label">City</label><input value={form.address?.city} onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} className="input" /></div>
          <div><label className="label">State</label><input value={form.address?.state} onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} className="input" /></div>
          <div><label className="label">GST Number</label><input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} className="input" /></div>
          <div><label className="label">Credit Limit (₹)</label><input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="input" /></div>
          <div className="col-span-2"><label className="label">Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input resize-none" rows={2} /></div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={!!viewCustomer} onClose={() => setViewCustomer(null)} title={`${viewCustomer?.name} — Purchase History`} size="lg">
        {historyLoading ? <div className="py-10"><LoadingSpinner size="lg" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr><th className="th">Invoice</th><th className="th">Date</th><th className="th">Items</th><th className="th">Total</th><th className="th">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No purchases found</td></tr>
                ) : history.map((s) => (
                  <tr key={s._id} className="table-row-hover">
                    <td className="td font-mono text-teal-600">{s.invoiceNumber}</td>
                    <td className="td text-xs text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="td">{s.items?.length}</td>
                    <td className="td font-bold">{formatCurrency(s.grandTotal)}</td>
                    <td className="td"><span className={s.paymentStatus === 'paid' ? 'badge-green' : 'badge-yellow'}>{s.paymentStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal isOpen={!!paymentModal} onClose={() => setPaymentModal(null)} title="Record Payment" size="sm"
        footer={<>
          <button onClick={() => setPaymentModal(null)} className="btn-secondary">Cancel</button>
          <button onClick={handleRecordPayment} className="btn-primary">Record Payment</button>
        </>}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Outstanding balance: <strong className="text-red-600">{formatCurrency(paymentModal?.outstandingBalance)}</strong></p>
          <div><label className="label">Payment Amount (₹)</label><input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="input" /></div>
        </div>
      </Modal>
    </div>
  );
};

export default Customers;
