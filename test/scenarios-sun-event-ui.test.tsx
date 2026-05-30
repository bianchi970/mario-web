import { render, screen } from '@testing-library/react';
import ScenarioDraftPanel from '@/components/scenarios/ScenarioDraftPanel';

const BASE_SPEC = {
  name: 'Test automazione',
  conditions: [],
  actions: [],
};

function renderPanel(trigger: Record<string, unknown>) {
  render(
    <ScenarioDraftPanel
      spec={{ ...BASE_SPEC, trigger }}
      onConfirm={async () => {}}
      onEdit={() => {}}
      onCancel={() => {}}
    />
  );
}

describe('ScenarioDraftPanel — sun_event formatting', () => {
  test('SD-01: sunset offset 0 → "Al tramonto"', () => {
    renderPanel({ type: 'sun_event', event: 'sunset', offset_minutes: 0 });
    expect(screen.getByText('Al tramonto')).toBeInTheDocument();
  });

  test("SD-02: sunrise offset 0 → \"All'alba\"", () => {
    renderPanel({ type: 'sun_event', event: 'sunrise', offset_minutes: 0 });
    expect(screen.getByText("All'alba")).toBeInTheDocument();
  });

  test('SD-03: sunset offset -30 → "30 minuti prima del tramonto"', () => {
    renderPanel({ type: 'sun_event', event: 'sunset', offset_minutes: -30 });
    expect(screen.getByText('30 minuti prima del tramonto')).toBeInTheDocument();
  });

  test("SD-04: sunrise offset +15 → \"15 minuti dopo l'alba\"", () => {
    renderPanel({ type: 'sun_event', event: 'sunrise', offset_minutes: 15 });
    expect(screen.getByText("15 minuti dopo l'alba")).toBeInTheDocument();
  });

  test('SD-05: fallback trigger sconosciuto → "Trigger: tipo_sconosciuto"', () => {
    renderPanel({ type: 'tipo_sconosciuto' });
    expect(screen.getByText('Trigger: tipo_sconosciuto')).toBeInTheDocument();
  });
});
