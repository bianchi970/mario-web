type BadgeVariant = 'green' | 'red' | 'amber' | 'blue' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANTS: Record<BadgeVariant, string> = {
  green: 'bg-hub-green/20 text-hub-green border-hub-green/30',
  red:   'bg-hub-red/20  text-hub-red  border-hub-red/30',
  amber: 'bg-hub-amber/20 text-hub-amber border-hub-amber/30',
  blue:  'bg-hub-accent/20 text-hub-accent border-hub-accent/30',
  gray:  'bg-hub-border/50 text-hub-muted  border-hub-border',
};

export default function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border font-medium ${VARIANTS[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function deviceTypeBadge(type: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    light: 'amber', rgb_light: 'amber',
    thermostat: 'red', boiler: 'red',
    inverter: 'green', battery: 'green', meter: 'green',
    alarm_panel: 'red', siren: 'red',
    plug: 'blue', ev_charger: 'blue',
    sensor: 'gray', motion_sensor: 'gray',
  };
  return map[type] ?? 'gray';
}
