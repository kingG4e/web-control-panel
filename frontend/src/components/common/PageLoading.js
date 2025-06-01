import React from 'react';

const PageLoading = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-[var(--accent-color)]"></div>
      {message && (
        <p className="mt-4 text-[var(--secondary-text)] font-medium">{message}</p>
      )}
    </div>
  );
};

export default PageLoading; 