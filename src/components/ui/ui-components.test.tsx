import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import Toast from './Toast';
import { ToastProvider, useToast } from './ToastProvider';
import Button from './Button';

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('mostra il messaggio', () => {
    const item = { id: '1', type: 'success' as const, message: 'Salvato con successo' };
    render(<Toast item={item} onDismiss={jest.fn()} />);
    expect(screen.getByText('Salvato con successo')).toBeInTheDocument();
  });

  it('chiama onDismiss al click sul pulsante chiudi', () => {
    const onDismiss = jest.fn();
    const item = { id: '1', type: 'info' as const, message: 'Info messaggio' };
    render(<Toast item={item} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi notifica' }));
    expect(onDismiss).toHaveBeenCalledWith('1');
  });

  it('auto-dismiss dopo duration ms', () => {
    const onDismiss = jest.fn();
    const item = { id: '2', type: 'success' as const, message: 'x', duration: 2000 };
    render(<Toast item={item} onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(2001));
    expect(onDismiss).toHaveBeenCalledWith('2');
  });

  it('tipo danger usa role=alert', () => {
    const item = { id: '3', type: 'danger' as const, message: 'Errore' };
    render(<Toast item={item} onDismiss={jest.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('tipo success usa role=status', () => {
    const item = { id: '4', type: 'success' as const, message: 'OK' };
    render(<Toast item={item} onDismiss={jest.fn()} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

// ─── ToastProvider / useToast ────────────────────────────────────────────────

function ToastTrigger({ type = 'info' as const }: { type?: 'success' | 'danger' | 'info' }) {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast('Messaggio test', type)}>Mostra toast</button>
  );
}

describe('ToastProvider', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('showToast rende il toast nel DOM', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mostra toast' }));
    expect(await screen.findByText('Messaggio test')).toBeInTheDocument();
  });

  it('il toast scompare dopo auto-dismiss (4s default)', async () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mostra toast' }));
    expect(await screen.findByText('Messaggio test')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(4001));
    await waitFor(() =>
      expect(screen.queryByText('Messaggio test')).not.toBeInTheDocument()
    );
  });

  it('più toast simultanei vengono tutti mostrati', async () => {
    render(
      <ToastProvider>
        <ToastTrigger type="success" />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mostra toast' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mostra toast' }));
    const toasts = await screen.findAllByText('Messaggio test');
    expect(toasts.length).toBe(2);
  });
});

// ─── Button (token semantici) ────────────────────────────────────────────────

describe('Button — token semantici', () => {
  it('variante primary contiene classe bg-primary', () => {
    const { container } = render(<Button variant="primary">Click</Button>);
    const btn = container.querySelector('button') as HTMLElement;
    expect(btn.className).toContain('bg-primary');
  });

  it('variante danger contiene classe text-danger', () => {
    const { container } = render(<Button variant="danger">Elimina</Button>);
    const btn = container.querySelector('button') as HTMLElement;
    expect(btn.className).toContain('text-danger');
  });

  it('disabled con loading=true', () => {
    render(<Button loading={true}>Carico</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('non ha classi hub-accent o hub-border', () => {
    const { container } = render(
      <>
        <Button variant="primary">P</Button>
        <Button variant="secondary">S</Button>
      </>
    );
    expect(container.innerHTML).not.toContain('hub-accent');
    expect(container.innerHTML).not.toContain('hub-border');
  });
});
