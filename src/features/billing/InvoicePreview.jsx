import { useEffect } from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import useSettingsStore from '../../store/settingsStore';
import { getLogoUrl } from '../../utils/config';

export const InvoicePreview = ({ sale }) => {
  const { settings, fetchSettings } = useSettingsStore();
  useEffect(() => { if (!settings) fetchSettings(); }, []);

  const shop   = settings || {};
  const logoUrl = getLogoUrl(shop.logo);

  return (
    <>
      <div id="invoice-print" className="bg-white max-w-2xl mx-auto">
        {/* Shop Header */}
        <div className="text-center pb-4 mb-4 border-b-2 border-gray-800">
          {logoUrl && (
            <img src={logoUrl} alt={shop.shopName} className="h-14 w-auto mx-auto mb-2 object-contain" />
          )}
          {shop.shopName && (
            <h1 className="text-2xl font-bold text-gray-900 tracking-wide">{shop.shopName}</h1>
          )}
          {shop.address && (
            <p className="text-sm text-gray-600 mt-1">
              {[shop.address.street, shop.address.city, shop.address.state, shop.address.pincode]
                .filter(Boolean).join(', ')}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-4 mt-1 text-sm text-gray-500">
            {shop.phone && <span>📞 {shop.phone}</span>}
            {shop.email && <span>✉ {shop.email}</span>}
          </div>
          {shop.gstNumber && (
            <p className="text-xs text-gray-500 mt-1">GSTIN: {shop.gstNumber}</p>
          )}
        </div>

        {/* Invoice Title */}
        <div className="text-center mb-4">
          <span className="inline-block bg-gray-800 text-white text-sm font-bold px-6 py-1 rounded-full tracking-widest uppercase">
            Tax Invoice
          </span>
        </div>

        {/* Invoice Meta */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-5 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 shrink-0">Invoice No:</span>
              <span className="font-bold text-teal-700">{sale.invoiceNumber}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 shrink-0">Date & Time:</span>
              <span className="font-medium">{formatDateTime(sale.createdAt)}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 shrink-0">Cashier:</span>
              <span className="font-medium">{sale.cashier?.name || '-'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex gap-2">
              <span className="text-gray-500 w-28 shrink-0">Bill To:</span>
              <span className="font-bold">{sale.customerName || 'Walk-in Customer'}</span>
            </div>
            {sale.customer?.phone && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">Phone:</span>
                <span>{sale.customer.phone}</span>
              </div>
            )}
            {sale.customer?.gstNumber && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-28 shrink-0">GSTIN:</span>
                <span className="font-mono text-xs">{sale.customer.gstNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-sm mb-5">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left px-3 py-2 rounded-tl-lg">#</th>
              <th className="text-left px-3 py-2">Item Description</th>
              <th className="text-center px-3 py-2">Qty</th>
              <th className="text-right px-3 py-2">Unit Price</th>
              <th className="text-right px-3 py-2">Discount</th>
              <th className="text-right px-3 py-2">Tax</th>
              <th className="text-right px-3 py-2 rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items?.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium text-gray-900">{item.productName}</p>
                  <p className="text-xs text-gray-400">{item.sku}</p>
                </td>
                <td className="px-3 py-2 text-center">{item.quantity}</td>
                <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="px-3 py-2 text-right text-green-600">
                  {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '-'}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {item.taxRate > 0 ? `${item.taxRate}%` : '-'}
                </td>
                <td className="px-3 py-2 text-right font-semibold">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={6} className="px-3 py-2 text-right text-sm text-gray-500 font-medium">Subtotal</td>
              <td className="px-3 py-2 text-right font-semibold">{formatCurrency(sale.subtotal)}</td>
            </tr>
            {sale.taxAmount > 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-2 text-right text-sm text-gray-500">Tax (GST)</td>
                <td className="px-3 py-2 text-right">{formatCurrency(sale.taxAmount)}</td>
              </tr>
            )}
            {sale.discountAmount > 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-2 text-right text-sm text-green-600">Bill Discount</td>
                <td className="px-3 py-2 text-right text-green-600">-{formatCurrency(sale.discountAmount)}</td>
              </tr>
            )}
            <tr className="bg-gray-800 text-white">
              <td colSpan={6} className="px-3 py-3 text-right font-bold text-base rounded-bl-lg">
                GRAND TOTAL
              </td>
              <td className="px-3 py-3 text-right font-bold text-lg rounded-br-lg">
                {formatCurrency(sale.grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Payment Details */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-xs text-green-600 font-semibold uppercase mb-2">Payment Details</p>
            {sale.payments?.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="capitalize text-gray-600">{p.method.replace('_', ' ')}</span>
                <span className="font-semibold">{formatCurrency(p.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-green-200">
              <span>Amount Paid</span>
              <span className="text-green-700">{formatCurrency(sale.amountPaid)}</span>
            </div>
          </div>
          {sale.amountDue > 0 ? (
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <p className="text-xs text-red-600 font-semibold uppercase mb-2">Balance Due</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(sale.amountDue)}</p>
              <p className="text-xs text-red-400 mt-1">Payment pending</p>
            </div>
          ) : (
            <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex flex-col items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <span className="text-green-600 text-xl font-bold">✓</span>
              </div>
              <p className="text-sm font-bold text-green-700">PAID IN FULL</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-dashed border-gray-300">
          {shop.receiptHeader && (
            <p className="text-sm font-medium text-gray-700">{shop.receiptHeader}</p>
          )}
          {shop.receiptFooter && (
            <p className="text-xs text-gray-400 mt-1">{shop.receiptFooter}</p>
          )}
          {shop.termsAndConditions && (
            <p className="text-xs text-gray-400 mt-2 max-w-md mx-auto">{shop.termsAndConditions}</p>
          )}
          <p className="text-xs text-gray-300 mt-3">Invoice: {sale.invoiceNumber}</p>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print, #invoice-print * { visibility: visible !important; }
          #invoice-print {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            padding: 20px;
            font-size: 12px;
          }
        }
      `}</style>
    </>
  );
};

export default InvoicePreview;
