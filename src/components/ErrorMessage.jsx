import { AlertCircle, RefreshCw } from 'lucide-react';

export const ErrorMessage = ({ message = 'Something went wrong', onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
    <p className="text-gray-600 mb-4">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-outline">
        <RefreshCw className="h-4 w-4" /> Try Again
      </button>
    )}
  </div>
);

export default ErrorMessage;
