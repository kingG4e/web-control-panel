import React, { memo, useMemo } from 'react';

const Card = memo(({ 
  children, 
  className = '', 
  padding = 'md',
  shadow = true,
  border = true,
  ...props 
}) => {
  const cardClasses = useMemo(() => {
    const baseClasses = 'bg-[var(--card-bg)] rounded-lg';
    
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    };
    
    const shadowClass = shadow ? 'shadow-sm' : '';
    const borderClass = border ? 'border border-[var(--border-color)]' : '';
    
    return `${baseClasses} ${paddingClasses[padding]} ${shadowClass} ${borderClass} ${className}`.trim();
  }, [padding, shadow, border, className]);

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

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