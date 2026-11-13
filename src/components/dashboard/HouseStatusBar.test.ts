import { computeStatus } from './HouseStatusBar';
import type { HubNotification } from '@/lib/api/notifications';

// La barra in alto, 13/11/2026: con un allarme gas aperto diceva «Casa OK»,
// perché cercava `gas: true` nello stato del device, e il sensore gas vero ha
// lo stato vuoto: l'allarme arriva come notifica dell'Hub.

const notifica = (o: Partial<HubNotification>): HubNotification => ({
  id: 'n1', severity: 'critical', audience: 'both', category: 'security', title: 'Allarme',
  message: 'GAS rilevato da "Sensore Gas Caldaia"!', device_id: 'gas', source_event_type: 'anomaly.gas.detected',
  persistent: 1, dismissed: 0, created_at: '2026-11-13 18:00:00', ...o,
});
const gas = { id: 'gas', project_id: 'default', name: 'Sensore Gas Caldaia', online: true, state: {} } as never;

describe('HouseStatusBar — computeStatus', () => {
  it('HS-01 un allarme gas aperto non è «Casa OK»', () => {
    expect(computeStatus([gas], [notifica({})])).toEqual({ level: 'error', label: 'Allarme gas' });
  });
  it('HS-02 acqua e gas insieme si dicono tutti e due', () => {
    const s = computeStatus([gas], [notifica({}), notifica({ id: 'n2', source_event_type: 'anomaly.water.detected' })]);
    expect(s.label).toBe('Allarme gas, acqua');
  });
  it('HS-03 una notifica chiusa, o una prova, non è un allarme', () => {
    expect(computeStatus([gas], [notifica({ dismissed: 1 })]).label).toBe('Casa OK');
    expect(computeStatus([gas], [notifica({ title: 'PROVA — Allarme' })]).label).toBe('Casa OK');
  });
});
