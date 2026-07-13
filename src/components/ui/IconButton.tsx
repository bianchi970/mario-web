'use client';

type IconButtonVariant = 'ghost' | 'surface' | 'primary' | 'danger';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: IconButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  tooltip?: string;
}

const VARIANTS: Record<IconButtonVariant, string> = {
  ghost:   'text-text-2 hover:text-text hover:bg-surface-2',
  surface: 'bg-surface-2 text-text hover:bg-border',
  primary: 'bg-primary text-white hover:bg-primary/90',
  danger:  'text-danger hover:bg-danger/10',
};

const SIZES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-7 h-7 text-sm',
  md: 'w-9 h-9 text-base',
  lg: 'w-11 h-11 text-lg',
};

export default function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  tooltip,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      title={tooltip}
      aria-label={tooltip ?? props['aria-label']}
      className={`inline-flex items-center justify-center rounded-lg transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon}
    </button>
  );
}
