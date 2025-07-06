import React, { memo, useMemo } from 'react';

const Button = memo(({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    disabled = false, 
    loading = false,
    icon,
    className = '',
    onClick,
    type = 'button',
    ...props 
}) => {
    const buttonClasses = useMemo(() => {
        const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
        
        const variants = {
            primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] focus:ring-[var(--primary)]',
            secondary: 'bg-[var(--secondary-bg)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] focus:ring-[var(--primary)]',
            danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
            ghost: 'text-[var(--text-primary)] hover:bg-[var(--hover-bg)] focus:ring-[var(--primary)]',
            outline: 'border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] focus:ring-[var(--primary)]'
        };
        
        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base'
        };
        
        return `${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`;
    }, [variant, size, className]);

    const handleClick = useMemo(() => {
        if (disabled || loading) return undefined;
        return onClick;
    }, [disabled, loading, onClick]);

    return (
        <button
            type={type}
            className={buttonClasses}
            disabled={disabled || loading}
            onClick={handleClick}
            {...props}
        >
            {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {icon && !loading && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
});

Button.displayName = 'Button';

export default Button; 