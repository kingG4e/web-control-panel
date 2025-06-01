import React, { createContext, useContext, useState, useCallback } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const LoadingContext = createContext({
    isLoading: false,
    showLoading: () => {},
    hideLoading: () => {}
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState();

    const showLoading = useCallback((text) => {
        setLoadingText(text);
        setIsLoading(true);
    }, []);

    const hideLoading = useCallback(() => {
        setIsLoading(false);
        setLoadingText(undefined);
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading }}>
            {children}
            {isLoading && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center space-y-4">
                        <LoadingSpinner size="lg" />
                        {loadingText && (
                            <p className="text-[var(--primary-text)] font-medium">
                                {loadingText}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </LoadingContext.Provider>
    );
}; 