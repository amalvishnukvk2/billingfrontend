import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Minus, Trash2, Search, User, Printer,
  CheckCircle, ShoppingCart, X, Tag, UserPlus,
  Receipt, PauseCircle, PlayCircle, RefreshCw,
  TrendingUp, Hash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productAPI, customerAPI, saleAPI, categoryAPI, reportAPI } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { LoadingSpinner } from '../components/LoadingSpinner';
import InvoicePreview from '../features/billing/InvoicePreview';
import Modal from '../components/Modal';
import { getProductImageUrl } from '../utils/config';

const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'card',          label: 'Card' },
  { value: 'upi',           label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

/* ─────────────────────────── Quick-add customer ─── */
const QuickAddCustomer = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const res = await customerAPI.create(form);
      toast.success('Customer added');
      onCreated(res.data.data);
      onClose();
      setForm({ name: '', phone: '', email: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Add Customer"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving && <LoadingSpinner size="sm" />} Add Customer
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="label">Full Name *</label>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="input"
            placeholder="Customer name"
          />
        </div>
        <div>
          <label className="label">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
            placeholder="Mobile number"
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
            placeholder="Optional"
          />
        </div>
      </div>
    </Modal>
  );
};

/* ─────────────────────────── Session Stats Bar ─── */
const SessionStats = ({ refreshKey }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    reportAPI.getDashboard({ filter: 'today' })
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-navy-900 text-white text-xs shrink-0 overflow-x-auto">
      <div className="flex items-center gap-1.5 text-gray-400 shrink-0">
        <TrendingUp className="h-3.5 w-3.5 text-teal-400" />
        <span>Today:</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Hash className="h-3 w-3 text-gray-500" />
        <span className="text-white font-semibold">{stats.sales?.count ?? 0}</span>
        <span className="text-gray-400">bills</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-teal-400 font-bold">{formatCurrency(stats.sales?.total ?? 0)}</span>
        <span className="text-gray-400">sales</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-green-400 font-bold">{formatCurrency(stats.profit?.grossProfit ?? 0)}</span>
        <span className="text-gray-400">gross profit</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-yellow-400 font-semibold">{stats.products?.lowStock ?? 0}</span>
        <span className="text-gray-400">low stock</span>
      </div>
    </div>
  );
};

/* ─────────────────────────── Main Billing ─── */
export const Billing = () => {
  /* Products & categories */
  const [products,         setProducts]         = useState([]);
  const [allCategories,    setAllCategories]    = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [productSearch,    setProductSearch]    = useState('');
  const [loadingProducts,  setLoadingProducts]  = useState(false);

  /* Customer */
  const [customer,         setCustomer]         = useState(null);
  const [customerSearch,   setCustomerSearch]   = useState('');
  const [customerResults,  setCustomerResults]  = useState([]);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showQuickAdd,     setShowQuickAdd]     = useState(false);

  /* Cart */
  const [cart,             setCart]             = useState([]);
  const [billDiscount,     setBillDiscount]     = useState('');
  const [billNote,         setBillNote]         = useState('');
  const [showNote,         setShowNote]         = useState(false);

  /* Hold bills */
  const [heldBills,        setHeldBills]        = useState([]);  // [{id, cart, customer, billDiscount, label}]
  const [showHeld,         setShowHeld]         = useState(false);

  /* Payments */
  const [payments,         setPayments]         = useState([{ method: 'cash', amount: '' }]);

  /* UI */
  const [processing,       setProcessing]       = useState(false);
  const [completedSale,    setCompletedSale]    = useState(null);
  const [statsKey,         setStatsKey]         = useState(0);

  const barcodeRef       = useRef(null);
  const productSearchRef = useRef(null);
  const searchTimeout    = useRef(null);
  const customerTimeout  = useRef(null);

  /* ── Fetch products ── */
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await productAPI.getAll({
        search: productSearch,
        category: selectedCategory,
        limit: 60,
      });
      setProducts(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoadingProducts(false); }
  }, [productSearch, selectedCategory]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(fetchProducts, 250);
  }, [fetchProducts]);

  useEffect(() => {
    categoryAPI.getAll().then((r) => setAllCategories(r.data.data || []));
  }, []);

  /* ── Customer search ── */
  useEffect(() => {
    clearTimeout(customerTimeout.current);
    if (customerSearch.length < 2) { setCustomerResults([]); return; }
    customerTimeout.current = setTimeout(async () => {
      try {
        const res = await customerAPI.getAll({ search: customerSearch, limit: 6 });
        setCustomerResults(res.data.data || []);
        setShowCustomerDrop(true);
      } catch { }
    }, 300);
  }, [customerSearch]);

  /* ── Barcode / SKU scan ── */
  const handleBarcodeKey = async (e) => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    const val = e.target.value.trim();
    e.target.value = '';
    try {
      let res;
      try       { res = await productAPI.getByBarcode(val); }
      catch (_) { res = await productAPI.getBySKU(val); }
      addToCart(res.data.data);
    } catch {
      toast.error(`No product found for: "${val}"`);
    }
  };

  /* ── Cart helpers ── */
  const addToCart = useCallback((product) => {
    if (product.stock <= 0) {
      toast.error(`"${product.name}" is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} in stock`);
          return prev;
        }
        return prev.map((i) =>
          i.productId === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        productId:     product._id,
        name:          product.name,
        sku:           product.sku,
        image:         product.image,
        unitPrice:     product.sellingPrice,
        purchasePrice: product.purchasePrice,
        taxRate:       product.taxRate || 0,
        quantity:      1,
        discount:      0,
        maxStock:      product.stock,
        unit:          product.unit,
      }];
    });
  }, []);

  const updateQty = (productId, qty) => {
    const n = parseInt(qty);
    if (!n || n < 1) return removeFromCart(productId);
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      if (n > i.maxStock) { toast.error(`Only ${i.maxStock} in stock`); return i; }
      return { ...i, quantity: n };
    }));
  };

  const updateDiscount = (productId, val) =>
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, discount: parseFloat(val) || 0 } : i
      )
    );

  const removeFromCart = (productId) =>
    setCart((prev) => prev.filter((i) => i.productId !== productId));

  const clearCart = () => {
    if (!cart.length) return;
    if (!window.confirm('Clear all items from cart?')) return;
    setCart([]);
    setCustomer(null);
    setBillDiscount('');
    setBillNote('');
    setPayments([{ method: 'cash', amount: '' }]);
  };

  /* ── Hold / Recall ── */
  const holdBill = () => {
    if (!cart.length) return toast.error('Cart is empty');
    const label = `Bill ${heldBills.length + 1} — ${cart.length} item(s)${customer ? ` · ${customer.name}` : ''}`;
    setHeldBills((prev) => [
      ...prev,
      { id: Date.now(), cart, customer, billDiscount, label },
    ]);
    setCart([]);
    setCustomer(null);
    setBillDiscount('');
    setPayments([{ method: 'cash', amount: '' }]);
    toast.success('Bill held. Start a new sale.');
  };

  const recallBill = (held) => {
    if (cart.length > 0 && !window.confirm('This will replace your current cart. Continue?')) return;
    setCart(held.cart);
    setCustomer(held.customer);
    setBillDiscount(held.billDiscount);
    setHeldBills((prev) => prev.filter((h) => h.id !== held.id));
    setShowHeld(false);
    toast.success('Bill recalled.');
  };

  /* ── Calculations ── */
  const subtotal   = cart.reduce((s, i) => s + (i.unitPrice - i.discount) * i.quantity, 0);
  const taxTotal   = cart.reduce((s, i) => s + ((i.unitPrice - i.discount) * i.quantity * i.taxRate) / 100, 0);
  const discAmt    = parseFloat(billDiscount) || 0;
  const grandTotal = Math.max(0, subtotal + taxTotal - discAmt);
  const amountPaid = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const changeDue  = amountPaid - grandTotal;

  const fillPayment = () =>
    setPayments((prev) =>
      prev.map((p, i) => i === 0 ? { ...p, amount: grandTotal.toFixed(2) } : p)
    );

  /* ── Complete sale ── */
  const handleCompleteSale = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (grandTotal <= 0) return toast.error('Grand total must be greater than 0');

    const validPayments = payments.filter((p) => parseFloat(p.amount) > 0);
    if (!validPayments.length) return toast.error('Enter a payment amount');

    if (amountPaid < grandTotal) {
      const ok = window.confirm(
        `Amount paid ${formatCurrency(amountPaid)} is less than total ${formatCurrency(grandTotal)}.\n\nProceed as partial payment?`
      );
      if (!ok) return;
    }

    setProcessing(true);
    try {
      const res = await saleAPI.create({
        customerId:       customer?._id,
        items: cart.map((i) => ({
          productId: i.productId,
          quantity:  i.quantity,
          unitPrice: i.unitPrice,
          discount:  i.discount,
          taxRate:   i.taxRate,
        })),
        discountAmount: discAmt,
        payments: validPayments.map((p) => ({
          method: p.method,
          amount: parseFloat(p.amount),
        })),
        notes:           billNote,
        idempotencyKey:  `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });

      const sale = res.data.data || res.data;
      setCompletedSale(sale);

      // ── Instantly decrement stock on product cards (no page refresh needed) ──
      const soldItems = cart; // capture before clearing
      setProducts((prev) =>
        prev.map((p) => {
          const sold = soldItems.find((i) => i.productId === p._id);
          if (!sold) return p;
          return { ...p, stock: Math.max(0, p.stock - sold.quantity) };
        })
      );

      setCart([]);
      setCustomer(null);
      setBillDiscount('');
      setBillNote('');
      setPayments([{ method: 'cash', amount: '' }]);
      setStatsKey((k) => k + 1); // refresh session stats bar

      // Background re-fetch to stay in sync with server
      fetchProducts();

      toast.success(`✅ Invoice ${sale.invoiceNumber} created!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete sale');
    } finally {
      setProcessing(false);
    }
  };

  /* ════════════════ RECEIPT SCREEN ════════════════ */
  if (completedSale) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Sale Complete!</h1>
              <p className="text-sm text-gray-500">
                Invoice: <span className="font-mono font-semibold text-teal-600">{completedSale.invoiceNumber}</span>
                &nbsp;·&nbsp;{formatCurrency(completedSale.grandTotal)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-outline">
              <Printer className="h-4 w-4" /> Print Receipt
            </button>
            <button onClick={() => setCompletedSale(null)} className="btn-primary">
              <Plus className="h-4 w-4" /> New Sale
            </button>
          </div>
        </div>
        <InvoicePreview sale={completedSale} />
      </div>
    );
  }

  /* ════════════════ POS SCREEN ════════════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Today's session stats bar ── */}
      <SessionStats refreshKey={statsKey} />

      {/* ── Main POS layout ── */}
      <div className="flex flex-1 gap-0 overflow-hidden">

        {/* ══ LEFT — Product panel ══ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 px-4 md:px-5 pt-4 pb-2">

          {/* Search & toolbar */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {/* Barcode input */}
            <div className="relative shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono select-none">⌥</span>
              <input
                ref={barcodeRef}
                onKeyDown={handleBarcodeKey}
                className="input pl-7 w-36 text-sm font-mono"
                placeholder="Barcode / SKU"
                title="Scan barcode or type SKU and press Enter"
              />
            </div>

            {/* Product search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={productSearchRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by name or SKU…"
                className="input pl-9 text-sm"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Hold bill */}
            <button
              onClick={holdBill}
              disabled={!cart.length}
              className="btn-outline text-sm shrink-0 disabled:opacity-40"
              title="Hold current bill"
            >
              <PauseCircle className="h-4 w-4" /> Hold
            </button>

            {/* Recall held */}
            {heldBills.length > 0 && (
              <button
                onClick={() => setShowHeld(true)}
                className="relative btn-outline text-sm shrink-0"
                title="Recall a held bill"
              >
                <PlayCircle className="h-4 w-4" /> Recall
                <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {heldBills.length}
                </span>
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-0.5 shrink-0">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                !selectedCategory
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
              }`}
            >
              All
            </button>
            {allCategories.map((c) => (
              <button
                key={c._id}
                onClick={() => setSelectedCategory(selectedCategory === c._id ? '' : c._id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedCategory === c._id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-teal-300'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
            {loadingProducts ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner size="lg" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-300">
                <ShoppingCart className="h-12 w-12 mb-3" />
                <p className="text-sm">No products found</p>
                {productSearch && (
                  <button onClick={() => setProductSearch('')} className="mt-2 text-xs text-teal-600 hover:underline">
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5 pb-4">
                {products.map((product) => {
                  const inCart     = cart.find((i) => i.productId === product._id);
                  const outOfStock = product.stock <= 0;
                  return (
                    <button
                      key={product._id}
                      onClick={() => addToCart(product)}
                      disabled={outOfStock}
                      className={`relative rounded-xl border-2 p-2.5 text-left transition-all active:scale-95 ${
                        outOfStock
                          ? 'opacity-40 cursor-not-allowed border-gray-200 bg-gray-50'
                          : inCart
                          ? 'border-teal-500 bg-teal-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-teal-400 hover:shadow-md cursor-pointer'
                      }`}
                    >
                      {/* Cart qty badge */}
                      {inCart && (
                        <span className="absolute -top-2 -right-2 h-5 w-5 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10">
                          {inCart.quantity}
                        </span>
                      )}

                      {/* Image */}
                      <div className="h-14 w-full rounded-lg mb-2 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={getProductImageUrl(product.image)}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-gray-200">
                            {product.name[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2 mb-1">
                        {product.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono">{product.sku}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-sm font-bold text-teal-700">
                          {formatCurrency(product.sellingPrice)}
                        </span>
                        <span className={`text-[10px] font-medium ${
                          outOfStock
                            ? 'text-red-500'
                            : product.stock <= product.minStockLevel
                            ? 'text-yellow-600'
                            : 'text-gray-400'
                        }`}>
                          {outOfStock ? 'Out of stock' : `${product.stock} ${product.unit}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT — Cart & Checkout ══ */}
        <div className="w-80 xl:w-96 shrink-0 flex flex-col bg-white border-l border-gray-200 overflow-hidden">

          {/* Cart header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-teal-600" />
              <span className="font-bold text-gray-800 text-sm">
                Cart
                {cart.length > 0 && (
                  <span className="ml-1.5 bg-teal-100 text-teal-700 text-xs font-bold px-1.5 py-0.5 rounded-full">
                    {cart.reduce((s, i) => s + i.quantity, 0)}
                  </span>
                )}
              </span>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Clear
              </button>
            )}
          </div>

          {/* Customer */}
          <div className="px-3 py-2.5 border-b border-gray-100 shrink-0">
            {customer ? (
              <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-teal-200 flex items-center justify-center text-teal-800 text-xs font-bold shrink-0">
                    {customer.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-teal-900">{customer.name}</p>
                    {customer.phone && <p className="text-xs text-teal-600">{customer.phone}</p>}
                    {customer.outstandingBalance > 0 && (
                      <p className="text-xs text-red-500 font-medium">
                        Due: {formatCurrency(customer.outstandingBalance)}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => { setCustomer(null); setCustomerSearch(''); }}
                  className="p-1 hover:bg-teal-100 rounded-full shrink-0"
                >
                  <X className="h-3.5 w-3.5 text-teal-600" />
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onFocus={() => customerSearch.length >= 2 && setShowCustomerDrop(true)}
                    onBlur={() => setTimeout(() => setShowCustomerDrop(false), 200)}
                    placeholder="Walk-in or search customer…"
                    className="input pl-8 text-sm py-2"
                  />
                  {showCustomerDrop && customerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                      {customerResults.map((c) => (
                        <button
                          key={c._id}
                          onMouseDown={() => {
                            setCustomer(c);
                            setShowCustomerDrop(false);
                            setCustomerSearch('');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                        >
                          <div className="h-7 w-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0">
                            {c.name[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.phone || c.email || 'No contact'}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 shrink-0"
                  title="Quick add new customer"
                >
                  <UserPlus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 py-10">
                <ShoppingCart className="h-12 w-12 mb-3" />
                <p className="text-sm font-medium">Cart is empty</p>
                <p className="text-xs mt-1">Tap products on the left to add</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <div key={item.productId} className="px-3 py-2.5">
                    {/* Row 1: thumbnail + name + line total */}
                    <div className="flex items-start gap-2">
                      <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                        {item.image ? (
                          <img
                            src={getProductImageUrl(item.image)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-300">{item.name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.sku} · {formatCurrency(item.unitPrice)}/unit</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {formatCurrency((item.unitPrice - item.discount) * item.quantity)}
                        </p>
                        {item.taxRate > 0 && (
                          <p className="text-[10px] text-gray-400">
                            +{formatCurrency(((item.unitPrice - item.discount) * item.quantity * item.taxRate) / 100)} GST
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: qty stepper + discount + delete */}
                    <div className="flex items-center gap-2 mt-2">
                      {/* Qty stepper */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                        <button
                          onClick={() => updateQty(item.productId, item.quantity - 1)}
                          className="h-7 w-7 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQty(item.productId, e.target.value)}
                          className="w-9 h-7 text-center text-sm font-bold border-0 focus:outline-none bg-transparent"
                          min={1}
                        />
                        <button
                          onClick={() => updateQty(item.productId, item.quantity + 1)}
                          className="h-7 w-7 flex items-center justify-center text-gray-500 hover:bg-gray-100"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Item discount */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1">
                        <span className="pl-2 text-gray-400 text-xs shrink-0">₹ off</span>
                        <input
                          type="number"
                          value={item.discount || ''}
                          onChange={(e) => updateDiscount(item.productId, e.target.value)}
                          className="w-full h-7 px-1 text-sm text-right focus:outline-none bg-transparent"
                          min={0}
                          placeholder="0"
                        />
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5 text-sm shrink-0">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
              <span className="font-medium text-gray-700">{formatCurrency(subtotal)}</span>
            </div>
            {taxTotal > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax / GST</span>
                <span className="font-medium text-gray-700">{formatCurrency(taxTotal)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-gray-500">
              <span className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Bill Discount (₹)
              </span>
              <input
                type="number"
                value={billDiscount}
                onChange={(e) => setBillDiscount(e.target.value)}
                onBlur={() => {
                  const v = parseFloat(billDiscount);
                  if (v < 0 || isNaN(v)) setBillDiscount('');
                  if (v > subtotal + taxTotal) setBillDiscount((subtotal + taxTotal).toFixed(2));
                }}
                className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                min={0}
                placeholder="0.00"
              />
            </div>
            <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2">
              <span>Grand Total</span>
              <span className="text-teal-700 text-lg">{formatCurrency(grandTotal)}</span>
            </div>
          </div>

          {/* Payment */}
          <div className="border-t border-gray-100 px-4 py-3 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</span>
              <button onClick={fillPayment} className="text-xs text-teal-600 hover:underline font-medium">
                Fill ₹{formatCurrency(grandTotal)}
              </button>
            </div>

            {payments.map((p, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={p.method}
                  onChange={(e) =>
                    setPayments((prev) =>
                      prev.map((pm, i) => i === idx ? { ...pm, method: e.target.value } : pm)
                    )
                  }
                  className="input flex-1 text-sm py-2"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) =>
                    setPayments((prev) =>
                      prev.map((pm, i) => i === idx ? { ...pm, amount: e.target.value } : pm)
                    )
                  }
                  className="input w-24 text-sm py-2 text-right"
                  placeholder="0.00"
                  min={0}
                />
                {payments.length > 1 && (
                  <button
                    onClick={() => setPayments((prev) => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              onClick={() => setPayments((p) => [...p, { method: 'cash', amount: '' }])}
              className="text-xs text-teal-600 hover:underline font-medium"
            >
              + Split payment
            </button>

            {/* Change / Balance */}
            {amountPaid > 0 && (
              <div className={`flex justify-between text-sm font-semibold rounded-xl px-3 py-2 ${
                changeDue >= 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
              }`}>
                <span>{changeDue >= 0 ? '🪙 Change Due' : '⚠ Balance Due'}</span>
                <span>{formatCurrency(Math.abs(changeDue))}</span>
              </div>
            )}

            {/* Note */}
            <button
              onClick={() => setShowNote(!showNote)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              {showNote ? '▲ Hide note' : '+ Add bill note'}
            </button>
            {showNote && (
              <textarea
                value={billNote}
                onChange={(e) => setBillNote(e.target.value)}
                className="input resize-none text-sm"
                rows={2}
                placeholder="Note for this bill…"
              />
            )}
          </div>

          {/* Complete Sale button */}
          <div className="px-4 pb-4 shrink-0">
            <button
              onClick={handleCompleteSale}
              disabled={cart.length === 0 || processing}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl text-base transition-all active:scale-[0.98] shadow-sm"
            >
              {processing ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Receipt className="h-5 w-5" />
                  <span>Complete Sale</span>
                  {grandTotal > 0 && (
                    <span className="ml-1 bg-teal-500 rounded-lg px-2 py-0.5 text-sm font-semibold">
                      {formatCurrency(grandTotal)}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Held bills modal ── */}
      <Modal
        isOpen={showHeld}
        onClose={() => setShowHeld(false)}
        title={`Held Bills (${heldBills.length})`}
        size="sm"
      >
        {heldBills.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No held bills</p>
        ) : (
          <div className="space-y-2">
            {heldBills.map((held) => (
              <div
                key={held.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-xl hover:border-teal-300 hover:bg-teal-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{held.label}</p>
                  <p className="text-xs text-gray-400">
                    {held.cart.reduce((s, i) => s + i.quantity, 0)} items
                    {held.customer ? ` · ${held.customer.name}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => recallBill(held)}
                  className="btn-primary text-xs py-1.5"
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Recall
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ── Quick Add Customer ── */}
      <QuickAddCustomer
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onCreated={(c) => setCustomer(c)}
      />
    </div>
  );
};

export default Billing;
