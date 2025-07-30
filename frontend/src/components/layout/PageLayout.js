import React from 'react';

const PageLayout = ({ title, description, children, actions }) => {
    return (
        <div className="min-h-screen" style={{ backgroundColor: 'var(--primary-bg)' }}>
            <div className="max-w-7xl mx-auto p-6">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--primary-text)' }}>
                                {title}
                            </h1>
                            {description && (
                                <p className="text-sm" style={{ color: 'var(--secondary-text)' }}>
                                    {description}
                                </p>
                            )}
                        </div>
                        {actions && (
                            <div className="flex items-center space-x-3">
                                {actions}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default PageLayout; 