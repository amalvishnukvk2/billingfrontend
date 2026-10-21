export const formatCurrency = (amount, currency = '₹') => {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  return `${currency}${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatNumber = (num) => {
  if (!num) return '0';
  return Number(num).toLocaleString('en-IN');
};

export const getStockStatusLabel = (stock, minStock) => {
  if (stock <= 0) return { label: 'Out of Stock', class: 'badge-red' };
  if (stock <= minStock) return { label: 'Low Stock', class: 'badge-yellow' };
  return { label: 'In Stock', class: 'badge-green' };
};

export const getPaymentStatusLabel = (status) => {
  const map = {
    paid: { label: 'Paid', class: 'badge-green' },
    partial: { label: 'Partial', class: 'badge-yellow' },
    unpaid: { label: 'Unpaid', class: 'badge-red' },
    cancelled: { label: 'Cancelled', class: 'badge-gray' },
    refunded: { label: 'Refunded', class: 'badge-blue' },
  };
  return map[status] || { label: status, class: 'badge-gray' };
};

export const truncate = (str, length = 30) => {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
};

export const exportToCSV = (data, filename) => {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
