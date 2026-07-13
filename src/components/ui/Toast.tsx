'use client';

import { useEffect } from 'react';

export type ToastType = 'success' | 'warning' | 'danger' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  item: ToastItem;
  onDismiss: (id: string) => void;
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  warning: '⚠',
  danger:  '✕',
  info:    'ℹ',
};

const STYLES: Record<ToastType, string> = {
  success: 'bg-success/15 border-success/40 text-success',
  warning: 'bg-warning/15 border-warning/40 text-warning',
  danger:  'bg-danger/15  border-danger/40  text-danger',
  info:    'bg-primary/15 border-primary/40 text-primary',
};

export default function Toast({ item, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(item.id), item.duration ?? 4000);
    return () => clearTimeout(t);
  }, [item.id, item.duration, onDismiss]);

  return (
    <div
      role={item.type === 'danger' ? 'alert' : 'status'}
      aria-live={item.type === 'danger' ? 'assertive' : 'polite'}
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm max-w-xs shadow-lg
        ${STYLES[item.type]}`}
    >
      <span className="font-bold flex-shrink-0 mt-0.5">{ICONS[item.type]}</span>
      <span className="flex-1 text-text">{item.message}</span>
      <button
        onClick={() => onDismiss(item.id)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-xs leading-none mt-0.5"
        aria-label="Chiudi notifica"
      >
        ✕
      </button>
    </div>
  );
}
