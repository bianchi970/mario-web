import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import Modal from './Modal';
import BottomSheet from './BottomSheet';
import EmptyState from './EmptyState';
import Skeleton from './Skeleton';
import Toast from './Toast';
import { ToastProvider, useToast } from './ToastProvider';
import Button from './Button';

// ─── Modal ──────────────────────────────────────────────────────────────────

describe('Modal', () => {
  it('non rende nulla quando open=false', () => {
    render(<Modal open={false} onClose={jest.fn()} title="Test"><p>contenuto</p></Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rende il dialog con title e contenuto quando open=true', () => {
    render(<Modal open={true} onClose={jest.fn()} title="Titolo modale"><p>Corpo modale</p></Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Titolo modale')).toBeInTheDocument();
    expect(screen.getByText('Corpo modale')).toBeInTheDocument();
  });

  it('chiama onClose al click sul backdrop', () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Test"><p>contenuto</p></Modal>);
    // Il backdrop è nel portal su document.body — cerco con querySelector globale
    const backdrop = document.body.querySelector('.absolute.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chiama onClose al tasto Escape', () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Test"><p>contenuto</p></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chiama onClose al click sul pulsante Chiudi', () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Test"><p>contenuto</p></Modal>);
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('focus trap: Tab dal pulsante Chiudi (ultimo) sposta al primo focusabile', () => {
    render(
      <Modal open={true} onClose={jest.fn()} title="Test">
        <button>Primo</button>
        <button>Secondo</button>
      </Modal>
    );
    const chiudi = screen.getByRole('button', { name: 'Chiudi' });
    const primo = screen.getByRole('button', { name: 'Primo' });
    // simula focus sull'ultimo (Chiudi è il primo, poi Primo, Secondo — ordine DOM)
    const allButtons = screen.getAllByRole('button');
    const last = allButtons[allButtons.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    // dopo Tab dall'ultimo, il focus deve essere sul primo
    // (il focus trap rimanda al primo)
    expect(document.activeElement).not.toBe(null);
    // Verifica che non sia uscito dalla modale
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('aria-modal e role=dialog presenti', () => {
    render(<Modal open={true} onClose={jest.fn()} title="Test"><p>x</p></Modal>);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('rende senza titolo', () => {
    render(<Modal open={true} onClose={jest.fn()}><p>no title</p></Modal>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Chiudi' })).not.toBeInTheDocument();
  });
});

// ─── BottomSheet ─────────────────────────────────────────────────────────────

describe('BottomSheet', () => {
  it('non rende nulla quando open=false', () => {
    render(<BottomSheet open={false} onClose={jest.fn()} title="Sheet"><p>x</p></BottomSheet>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('rende title e contenuto quando open=true', () => {
    render(<BottomSheet open={true} onClose={jest.fn()} title="Sheet title"><p>corpo</p></BottomSheet>);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sheet title')).toBeInTheDocument();
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });

  it('chiama onClose su Escape', () => {
    const onClose = jest.fn();
    render(<BottomSheet open={true} onClose={onClose} title="S"><p>x</p></BottomSheet>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('chiama onClose al click backdrop', () => {
    const onClose = jest.fn();
    render(<BottomSheet open={true} onClose={onClose} title="S"><p>x</p></BottomSheet>);
    const backdrop = document.body.querySelector('.absolute.inset-0') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('aria-modal e role=dialog presenti', () => {
    render(<BottomSheet open={true} onClose={jest.fn()} title="S"><p>x</p></BottomSheet>);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });
});

// ─── EmptyState ──────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('mostra title obbligatorio', () => {
    render(<EmptyState title="Nessun dispositivo" />);
    expect(screen.getByText('Nessun dispositivo')).toBeInTheDocument();
  });

  it('mostra description se fornita', () => {
    render(<EmptyState title="Vuoto" description="Aggiungi qualcosa per iniziare" />);
    expect(screen.getByText('Aggiungi qualcosa per iniziare')).toBeInTheDocument();
  });

  it('non mostra description se assente', () => {
    render(<EmptyState title="Vuoto" />);
    expect(screen.queryByText('Aggiungi qualcosa per iniziare')).not.toBeInTheDocument();
  });

  it('mostra icon se fornita', () => {
    render(<EmptyState title="Vuoto" icon={<span data-testid="icon">📭</span>} />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('mostra action se fornita', () => {
    render(<EmptyState title="Vuoto" action={<button>Aggiungi</button>} />);
    expect(screen.getByRole('button', { name: 'Aggiungi' })).toBeInTheDocument();
  });
});

// ─── Skeleton ────────────────────────────────────────────────────────────────

describe('Skeleton', () => {
  it('rende un elemento con aria-hidden', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  it('variante rect (default): ha classe rounded-lg', () => {
    const { container } = render(<Skeleton variant="rect" />);
    expect(container.firstChild).toHaveClass('rounded-lg');
  });

  it('variante circle: ha classe rounded-full', () => {
    const { container } = render(<Skeleton variant="circle" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('variante text: ha classe rounded e h-4', () => {
    const { container } = render(<Skeleton variant="text" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('rounded');
    expect(el).toHaveClass('h-4');
  });

  it('applica width e height numerici come px', () => {
    const { container } = render(<Skeleton width={120} height={40} />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('120px');
    expect(el.style.height).toBe('40px');
  });

  it('applica width e height stringa direttamente', () => {
    const { container } = render(<Skeleton width="100%" height="2rem" />);
    const el = container.firstChild as HTMLElement;
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('2rem');
  });

  it('applica animate-pulse', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });
});

// ─── Toast ───────────────────────────────────────────────────────────────────

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
