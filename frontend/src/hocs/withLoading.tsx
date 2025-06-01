import React, { useEffect } from 'react';
import { useLoading } from '../contexts/LoadingContext';

export const withLoading = (WrappedComponent: React.ComponentType, loadingText?: string) => {
    return (props: any) => {
        const { showLoading, hideLoading } = useLoading();

        useEffect(() => {
            showLoading(loadingText);
            return () => hideLoading();
        }, []);

        return <WrappedComponent {...props} />;
    };
}; 