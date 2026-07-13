'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import Toast, { type ToastItem, type ToastType } from './Toast';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Container posizionato sopra la bottom nav mobile (pb-16 md:pb-0) */}
      <div
        aria-label="Notifiche"
        className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-2 md:bottom-4"
      >
        {toasts.map((item) => (
          <Toast key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
