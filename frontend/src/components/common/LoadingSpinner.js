import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-color)]"></div>
      <span className="ml-2 text-[var(--secondary-text)]">Loading...</span>
    </div>
  );
};

export default LoadingSpinner; 