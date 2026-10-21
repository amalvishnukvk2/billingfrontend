import { AlertTriangle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export const ConfirmDialog = ({ isOpen, title, message, onConfirm, onCancel, loading, variant = 'danger' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className={`flex items-center gap-3 mb-4 ${variant === 'danger' ? 'text-red-600' : 'text-yellow-600'}`}>
          <AlertTriangle className="h-6 w-6" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary" disabled={loading}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
          >
            {loading && <LoadingSpinner size="sm" />}
            {variant === 'danger' ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
