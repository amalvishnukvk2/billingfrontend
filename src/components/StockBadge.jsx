import { getStockStatusLabel } from '../utils/formatters';

export const StockBadge = ({ stock, minStock }) => {
  const { label, class: cls } = getStockStatusLabel(stock, minStock);
  return <span className={cls}>{label}</span>;
};

export default StockBadge;
