import React from 'react';

const PageLayout = ({ title, description, children, actions }) => {
    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-[var(--primary-text)]">{title}</h1>
                    {description && (
                        <p className="mt-1 text-sm text-[var(--secondary-text)]">{description}</p>
                    )}
                </div>
                {actions && (
                    <div className="flex items-center space-x-3">
                        {actions}
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="space-y-6">
                {children}
            </div>
        </div>
    );
};

export default PageLayout; 