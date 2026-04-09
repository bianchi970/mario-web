import Badge from '@/components/ui/Badge';

interface ScenarioConditionsSummaryProps {
  ariaLabel?: string;
  className?: string;
}

export default function ScenarioConditionsSummary({
  ariaLabel,
  className = '',
}: ScenarioConditionsSummaryProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 text-xs text-hub-muted ${className}`}
      aria-label={ariaLabel}
    >
      <span>Condizioni</span>{' '}
      <Badge variant="gray">Mock</Badge>{' '}
      <span className="text-hub-text">Fascia oraria</span>{' '}
      <span aria-hidden="true">|</span>{' '}
      <span className="text-hub-text">22:00 - 06:00</span>
    </div>
  );
}
