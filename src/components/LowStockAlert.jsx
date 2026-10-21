import { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, PackageX, X } from 'lucide-react';
import { productAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';

export const LowStockAlert = () => {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLowStock = async () => {
      setLoading(true);
      try {
        const res = await productAPI.getLowStock();
        setProducts(res.data.data || []);
      } catch { }
      finally { setLoading(false); }
    };
    fetchLowStock();
    // refresh every 5 minutes
    const id = setInterval(fetchLowStock, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const outOfStock = products.filter((p) => p.stock <= 0);
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= p.minStockLevel);
  const count = products.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={`Notifications — ${count} low stock alerts`}
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800">Stock Alerts</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-200 text-gray-400">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-center text-sm text-gray-400 py-6">Loading...</p>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">All products well stocked!</p>
              </div>
            ) : (
              <>
                {outOfStock.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
                      <PackageX className="h-3.5 w-3.5" /> Out of Stock ({outOfStock.length})
                    </p>
                    {outOfStock.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => { navigate('/inventory'); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-left transition-colors"
                      >
                        <div className="h-7 w-7 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold shrink-0">
                          {p.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sku}</p>
                        </div>
                        <span className="badge-red text-[10px]">0 {p.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
                {lowStock.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-yellow-600 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Low Stock ({lowStock.length})
                    </p>
                    {lowStock.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => { navigate('/inventory'); setOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-yellow-50 text-left transition-colors"
                      >
                        <div className="h-7 w-7 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600 text-xs font-bold shrink-0">
                          {p.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sku}</p>
                        </div>
                        <span className="badge-yellow text-[10px]">{p.stock} left</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {products.length > 0 && (
            <div className="border-t border-gray-100 p-3">
              <button
                onClick={() => { navigate('/inventory?stockStatus=low_stock'); setOpen(false); }}
                className="w-full text-center text-xs text-teal-600 hover:underline font-medium"
              >
                View all in Inventory →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LowStockAlert;
