import React from 'react';

const Card = ({ children, className = '' }) => {
    return (
        <div className={`bg-[var(--card-bg)] rounded-lg border border-[var(--border-color)] shadow-[var(--card-shadow)] p-6 ${className}`}>
            {children}
        </div>
    );
};

export const CardHeader = ({ children, className = '' }) => {
    return (
        <div className={`flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)] ${className}`}>
            {children}
        </div>
    );
};

export const CardTitle = ({ children, className = '' }) => {
    return (
        <h3 className={`text-lg font-medium text-[var(--primary-text)] ${className}`}>
            {children}
        </h3>
    );
};

export const CardDescription = ({ children, className = '' }) => {
    return (
        <p className={`text-sm text-[var(--secondary-text)] ${className}`}>
            {children}
        </p>
    );
};

export const CardContent = ({ children, className = '' }) => {
    return (
        <div className={className}>
            {children}
        </div>
    );
};

export const CardFooter = ({ children, className = '' }) => {
    return (
        <div className={`flex items-center justify-between pt-4 mt-4 border-t border-[var(--border-color)] ${className}`}>
            {children}
        </div>
    );
};

export default Card; 