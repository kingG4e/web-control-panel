import React from 'react';

const SectionLoading = ({ height = 'h-64', message }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${height}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-3 border-t-transparent border-[var(--accent-color)]"></div>
      {message && (
        <p className="mt-3 text-sm text-[var(--secondary-text)]">{message}</p>
      )}
    </div>
  );
};

export default SectionLoading; 