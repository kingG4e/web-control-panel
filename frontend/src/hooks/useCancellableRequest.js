import { useEffect, useRef } from 'react';
import { createCancellableRequest } from '../services/api';

/**
 * Custom hook to manage cancellable API requests
 * Automatically cancels requests when component unmounts
 */
export const useCancellableRequest = () => {
    const requestsRef = useRef(new Set());

    const createRequest = () => {
        const { request, cancel, signal } = createCancellableRequest();
        
        // Add to active requests
        requestsRef.current.add(cancel);
        
        // Enhanced request function that handles cleanup
        const enhancedRequest = async (config) => {
            try {
                const response = await request(config);
                // Remove from active requests on success
                requestsRef.current.delete(cancel);
                return response;
            } catch (error) {
                // Remove from active requests on error
                requestsRef.current.delete(cancel);
                // Don't throw for cancellation errors
                if (error.message === 'Request canceled') {
                    console.debug('Request canceled in component');
                    return null;
                }
                throw error;
            }
        };

        return {
            request: enhancedRequest,
            cancel,
            signal
        };
    };

    // Cancel all active requests on unmount
    useEffect(() => {
        return () => {
            requestsRef.current.forEach(cancel => {
                try {
                    cancel();
                } catch (error) {
                    console.debug('Error canceling request:', error);
                }
            });
            requestsRef.current.clear();
        };
    }, []);

    return { createRequest };
};

export default useCancellableRequest; 