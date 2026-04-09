import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ScenariosEmptyStateProps {
  onCreate: () => void;
}

export default function ScenariosEmptyState({ onCreate }: ScenariosEmptyStateProps) {
  return (
    <section className="card py-16 text-center">
      <div className="mx-auto max-w-md space-y-3">
        <Badge variant="gray">Mock locale</Badge>
        <h3 className="text-lg font-semibold text-hub-text">Nessuno scenario</h3>
        <p className="text-sm text-hub-muted">
          Crea uno scenario per iniziare a comporre blocchi azione locali.
        </p>
        <div className="flex justify-center">
          <Button variant="primary" onClick={onCreate}>
            Crea scenario
          </Button>
        </div>
      </div>
    </section>
  );
}
