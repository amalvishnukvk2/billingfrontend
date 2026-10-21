import { useNavigate } from 'react-router-dom';
import { Fish, Home } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-100 rounded-full mb-6">
          <Fish className="h-10 w-10 text-teal-600" />
        </div>
        <h1 className="text-6xl font-bold text-gray-900 mb-3">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <button onClick={() => navigate('/')} className="btn-primary justify-center">
          <Home className="h-4 w-4" /> Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
