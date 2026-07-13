'use client';

import { forwardRef } from 'react';

// Omit 'size' da InputHTMLAttributes (è number in HTML, qui usiamo 'sm'|'md')
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

const SIZE: Record<'sm' | 'md', string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, icon, size = 'md', className = '', id, ...props },
  ref
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-text-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full bg-surface-2 border rounded-lg text-text placeholder:text-text-2
            transition-colors outline-none
            focus:ring-2 focus:ring-focus/50 focus:border-focus
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-danger' : 'border-border'}
            ${icon ? 'pl-9' : ''}
            ${SIZE[size]} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
});

export default Input;
