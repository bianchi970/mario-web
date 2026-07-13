// Varianti semantiche B97 + alias legacy (green/red/amber/blue) per compatibilità
type BadgeVariant = 'success' | 'danger' | 'warning' | 'primary' | 'gray'
  | 'green' | 'red' | 'amber' | 'blue'; // alias legacy → token semantici

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  // Token semantici B97
  success: 'bg-success/20 text-success border-success/30',
  danger:  'bg-danger/20  text-danger  border-danger/30',
  warning: 'bg-warning/20 text-warning border-warning/30',
  primary: 'bg-primary/20 text-primary border-primary/30',
  gray:    'bg-surface-2  text-text-2  border-border',
  // Alias legacy
  green:   'bg-success/20 text-success border-success/30',
  red:     'bg-danger/20  text-danger  border-danger/30',
  amber:   'bg-warning/20 text-warning border-warning/30',
  blue:    'bg-primary/20 text-primary border-primary/30',
};

export default function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium
        ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function deviceTypeBadge(type: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    light: 'warning', rgb_light: 'warning',
    thermostat: 'danger', boiler: 'danger',
    inverter: 'success', battery: 'success', meter: 'success',
    alarm_panel: 'danger', siren: 'danger',
    plug: 'primary', ev_charger: 'primary',
    sensor: 'gray', motion_sensor: 'gray',
  };
  return map[type] ?? 'gray';
}
