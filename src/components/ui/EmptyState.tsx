interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 px-4 text-center ${className}`}
    >
      {icon && <div className="text-4xl text-text-2">{icon}</div>}
      <p className="font-medium text-text">{title}</p>
      {description && <p className="text-sm text-text-2 max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
