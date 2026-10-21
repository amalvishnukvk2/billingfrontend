import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiCall, options = {}) => {
    const { onSuccess, onError, successMessage, errorMessage } = options;
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall();
      if (successMessage) toast.success(successMessage);
      if (onSuccess) onSuccess(result.data);
      return result.data;
    } catch (err) {
      const msg = err.response?.data?.message || errorMessage || 'Something went wrong';
      setError(msg);
      if (!options.silent) toast.error(msg);
      if (onError) onError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, execute };
};

export default useApi;
