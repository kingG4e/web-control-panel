import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    color?: string;
    className?: string;
}

function LoadingSpinner({
    size = 'md',
    color = 'text-blue-600',
    className = ''
}: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div className={`animate-spin rounded-full border-4 border-t-transparent ${sizeClasses[size]} ${color}`} />
        </div>
    );
}

export default LoadingSpinner; 