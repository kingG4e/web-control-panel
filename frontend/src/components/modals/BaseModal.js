import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

const BaseModal = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
  title,
  titleIcon,
  footer,
  disableOverlayClick = false,
  disableEscapeKey = false,
  className = '',
}) => {
  // Handle escape key press
  useEffect(() => {
    if (!isOpen || disableEscapeKey) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, disableEscapeKey]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn"
      onClick={!disableOverlayClick ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--modal-overlay)' }} />
      {/* Modal */}
      <div 
        className={`relative ${maxWidth} w-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden animate-slideUp ${className}`}
        style={{ 
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header: only show close button if onClose, no extra space if no title/titleIcon */}
        {(onClose && !title && !titleIcon) && (
          <div className="flex justify-end items-start w-full" style={{ minHeight: 0, padding: 0, margin: 0 }}>
            <button
              onClick={onClose}
              className="m-2 p-1 rounded transition-all duration-200 hover:bg-[var(--hover-bg)]"
              style={{ width: 28, height: 28, color: 'var(--secondary-text)', minWidth: 0, minHeight: 0 }}
              aria-label="Close modal"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Standard Header if title or titleIcon present */}
        {(title || titleIcon) && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-3">
              {titleIcon && (
                <div className="flex-shrink-0">{titleIcon}</div>
              )}
              {title && (
                <h2 className="text-xl font-semibold" style={{ color: 'var(--primary-text)' }}>
                  {title}
                </h2>
              )}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg transition-all duration-200 hover:bg-[var(--hover-bg)]"
                style={{ color: 'var(--secondary-text)' }}
                onMouseEnter={(e) => {
                  e.target.style.color = 'var(--primary-text)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = 'var(--secondary-text)';
                }}
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4" style={{ 
            borderTop: '1px solid var(--border-color)',
            backgroundColor: 'var(--secondary-bg)'
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

// Add CSS animations to index.css or a global CSS file
const modalStyles = `
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}

.animate-slideUp {
  animation: slideUp 0.3s ease-out;
}
`;

// Export utility components for consistent styling
export const ModalSection = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>{children}</div>
);

export const ModalSectionTitle = ({ children, icon, className = '' }) => (
  <h3 className={`text-lg font-medium mb-3 flex items-center gap-2 ${className}`} style={{ color: 'var(--primary-text)' }}>
    {icon && <span className="text-xl">{icon}</span>}
    {children}
  </h3>
);

export const ModalInfoBox = ({ children, variant = 'info', className = '' }) => {
  const getVariantStyles = (variant) => {
    switch (variant) {
      case 'info':
        return {
          backgroundColor: 'var(--info-bg)',
          border: '1px solid var(--info-color)',
          color: 'var(--info-color)'
        };
      case 'success':
        return {
          backgroundColor: 'var(--success-bg)',
          border: '1px solid var(--success-color)',
          color: 'var(--success-color)'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--warning-bg)',
          border: '1px solid var(--warning-color)',
          color: 'var(--warning-color)'
        };
      case 'error':
        return {
          backgroundColor: 'var(--error-bg)',
          border: '1px solid var(--danger-color)',
          color: 'var(--danger-color)'
        };
      default:
        return {
          backgroundColor: 'var(--info-bg)',
          border: '1px solid var(--info-color)',
          color: 'var(--info-color)'
        };
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${className}`} style={getVariantStyles(variant)}>
      {children}
    </div>
  );
};

export const ModalButton = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
  const getVariantClasses = (variant) => {
    switch (variant) {
      case 'primary':
        return 'bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white';
      case 'secondary':
        return 'bg-[var(--secondary-bg)] hover:bg-[var(--hover-bg)] text-[var(--primary-text)] border border-[var(--border-color)]';
      case 'success':
        return 'bg-[var(--success-color)] hover:opacity-90 text-white';
      case 'danger':
        return 'bg-[var(--danger-color)] hover:opacity-90 text-white';
      case 'ghost':
        return 'bg-transparent hover:bg-[var(--hover-bg)] text-[var(--secondary-text)] hover:text-[var(--primary-text)] border border-transparent';
      default:
        return 'bg-[var(--accent-color)] text-white';
    }
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`
        ${sizes[size]}
        ${getVariantClasses(variant)}
        font-medium rounded-lg
        focus:outline-none focus:ring-2 focus:ring-[var(--focus-border)] focus:ring-offset-2 focus:ring-offset-[var(--primary-bg)]
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        inline-flex items-center justify-center
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default BaseModal; 