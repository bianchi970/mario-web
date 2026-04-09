'use client';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  size?: 'sm' | 'md';
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:   'bg-hub-accent text-white hover:bg-blue-500',
  secondary: 'bg-hub-border text-hub-text hover:bg-hub-border/80',
  danger:    'bg-hub-red/20 text-hub-red border border-hub-red/30 hover:bg-hub-red/30',
  ghost:     'text-hub-muted hover:text-hub-text hover:bg-hub-border/30',
};

const SIZES: Record<'sm' | 'md', string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export default function Button({
  variant = 'secondary',
  loading = false,
  size = 'md',
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
