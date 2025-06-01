import React, { createContext, useContext, useState, useCallback } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface LoadingContextType {
    isLoading: boolean;
    showLoading: (text?: string) => void;
    hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
    isLoading: false,
    showLoading: () => {},
    hideLoading: () => {}
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState<string | undefined>();

    const showLoading = useCallback((text?: string) => {
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
                <LoadingSpinner 
                    variant="page" 
                    size="lg" 
                    text={loadingText}
                />
            )}
        </LoadingContext.Provider>
    );
}; 