import React from 'react';

const PageLayout = ({ title, description, children, actions }) => {
    return (
        <div className="space-y-4 md:space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-semibold text-[var(--primary-text)] truncate">{title}</h1>
                    {description && (
                        <p className="mt-1 text-sm text-[var(--secondary-text)] line-clamp-2">{description}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 shrink-0">
                        {actions}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="space-y-4 md:space-y-6">
                {children}
            </div>
        </div>
    );
};

export default PageLayout; 