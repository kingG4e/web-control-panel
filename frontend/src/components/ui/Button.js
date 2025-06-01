import React from 'react';

const variants = {
    primary: 'bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white',
    secondary: 'bg-[var(--secondary-bg)] border border-[var(--border-color)] text-[var(--secondary-text)] hover:text-[var(--accent-color)] hover:border-[var(--accent-color)]',
    danger: 'bg-[var(--danger-color)] hover:bg-[var(--danger-color)]/90 text-white',
    outline: 'border border-[var(--border-color)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] text-[var(--secondary-text)]',
};

const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
};

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    isLoading = false,
    disabled = false,
    icon,
    ...props
}) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/20 focus:ring-offset-2 focus:ring-offset-[var(--primary-bg)] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';
    
    return (
        <button
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
            )}
            {icon && !isLoading && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
};

export default Button; 