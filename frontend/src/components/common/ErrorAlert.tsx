import React from 'react';

interface ErrorAlertProps {
    message: string;
    onClose?: () => void;
    className?: string;
}

function ErrorAlert({
    message,
    onClose,
    className = ''
}: ErrorAlertProps) {
    return (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`} role="alert">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-red-800">{message}</span>
                </div>
                {onClose && (
                    <button
                        type="button"
                        className="text-red-600 hover:text-red-800 focus:outline-none"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

export default ErrorAlert; 