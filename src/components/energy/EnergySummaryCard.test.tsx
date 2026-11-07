import { render, screen } from '@testing-library/react';
import EnergySummaryCard from '@/components/energy/EnergySummaryCard';

// Nessuna misura non è «0 Wh». Il 7/11/2026 la pagina Energia diceva
// «Oggi 0 Wh · Corrente 0 W · Picco 0 W» in una casa dove nessun device misura
// la potenza (0 righe su 134.202 eventi dell'Hub): l'Hub inventava lo zero,
// e la PWA lo mostrava. Ora l'Hub dice `null` e la PWA lo dice com'è.

const NESSUNA_MISURA = {
  ok: true, today_wh: null, week_wh: null, month_wh: null, current_w: null, peak_w: null,
};

describe('EnergySummaryCard', () => {
  it('EN-W01: senza misure non mostra nessuno zero, e dice perché', () => {
    const { container } = render(<EnergySummaryCard data={NESSUNA_MISURA} />);
    expect(container.textContent).not.toMatch(/\b0 W/);
    expect(container.textContent).not.toMatch(/null/);
    expect(screen.getByText(/Nessuna misura di consumo/)).toBeInTheDocument();
  });

  it('EN-W02: una misura vera si mostra, anche quando è zero', () => {
    render(<EnergySummaryCard data={{
      ok: true, today_wh: 120, week_wh: 1500, month_wh: 0, current_w: 0, peak_w: 40,
    }} />);
    expect(screen.getByText('120 Wh')).toBeInTheDocument();
    expect(screen.getByText('1.50 kWh')).toBeInTheDocument();
    expect(screen.getByText('0 W')).toBeInTheDocument();
    expect(screen.getByText('40 W')).toBeInTheDocument();
    expect(screen.queryByText(/Nessuna misura di consumo/)).not.toBeInTheDocument();
  });

  it('EN-W03: la potenza di adesso che manca è «—», il resto resta', () => {
    render(<EnergySummaryCard data={{
      ok: true, today_wh: 70, week_wh: 70, month_wh: 70, current_w: null, peak_w: 70,
    }} />);
    expect(screen.getAllByText('70 Wh').length).toBeGreaterThan(0);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
