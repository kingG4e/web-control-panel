import React, { useState, useCallback } from 'react';
import Toast from './Toast';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };
    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((type, title, message, duration = 5000) => {
    return addToast({ type, title, message, duration });
  }, [addToast]);

  // Expose methods globally
  React.useEffect(() => {
    window.showToast = showToast;
    window.addToast = addToast;
    window.removeToast = removeToast;
    
    return () => {
      delete window.showToast;
      delete window.addToast;
      delete window.removeToast;
    };
  }, [showToast, addToast, removeToast]);

  return (
    <div className="fixed top-4 right-4 z-[200] space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </div>
  );
};

export default ToastContainer; 