import { useState, useCallback } from 'react';

interface UseModalOptions {
  onOpen?: () => void;
  onClose?: () => void;
}

export function useModal(options: UseModalOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => {
    setIsOpen(true);
    options.onOpen?.();
  }, [options]);

  const close = useCallback(() => {
    setIsOpen(false);
    options.onClose?.();
  }, [options]);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      options.onClose?.();
    } else {
      options.onOpen?.();
    }
  }, [isOpen, options]);

  return {
    isOpen,
    open,
    close,
    toggle,
  };
} 