import React from 'react';

const ActionLoading = ({ size = 'sm', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-3'
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className={`
        animate-spin rounded-full 
        border-t-transparent border-[var(--accent-color)] 
        ${sizeClasses[size]}
      `} />
    </div>
  );
};

export default ActionLoading; 