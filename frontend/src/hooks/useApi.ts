import { useState, useCallback } from 'react';
import { useLoading } from '../contexts/RootContext';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  loadingMessage?: string;
}

export function useApi<T>(
  apiCall: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { setLoading } = useLoading();

  const execute = useCallback(
    async (...args: any[]) => {
      try {
        setError(null);
        if (options.loadingMessage) {
          setLoading({ isLoading: true, message: options.loadingMessage });
        }

        const result = await apiCall(...args);
        setData(result);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);
        options.onError?.(error);
        throw error;
      } finally {
        if (options.loadingMessage) {
          setLoading({ isLoading: false, message: null });
        }
      }
    },
    [apiCall, options, setLoading]
  );

  return {
    data,
    error,
    execute,
  };
} 