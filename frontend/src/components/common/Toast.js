import React, { useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Toast = ({ 
  id, 
  type = 'info', 
  title, 
  message, 
  duration = 5000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300);
  };

  const getIcon = () => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'success':
        return <CheckCircleIcon className={`${iconClass} text-green-500`} />;
      case 'error':
        return <XCircleIcon className={`${iconClass} text-red-500`} />;
      case 'warning':
        return <ExclamationTriangleIcon className={`${iconClass} text-yellow-500`} />;
      default:
        return <InformationCircleIcon className={`${iconClass} text-blue-500`} />;
    }
  };

  const getStyles = () => {
    const baseStyles = "flex items-start p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-out";
    const typeStyles = {
      success: "bg-green-50 border-green-400 dark:bg-green-900/20 dark:border-green-500",
      error: "bg-red-50 border-red-400 dark:bg-red-900/20 dark:border-red-500",
      warning: "bg-yellow-50 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-500",
      info: "bg-blue-50 border-blue-400 dark:bg-blue-900/20 dark:border-blue-500"
    };
    
    const animationStyles = isExiting 
      ? "translate-x-full opacity-0" 
      : "translate-x-0 opacity-100";

    return `${baseStyles} ${typeStyles[type]} ${animationStyles}`;
  };

  if (!isVisible) return null;

  return (
    <div className={getStyles()}>
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
            {title}
          </h4>
        )}
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {message}
          </p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 ml-3 p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        aria-label="Close notification"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast; 