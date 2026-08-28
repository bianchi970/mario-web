'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, X } from 'lucide-react';

const LS_KEY  = 'mario_emergency_contact';
const HOLD_MS = 800;

interface EmergencyContact { name: string; number: string; }

function loadContact(): EmergencyContact | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { name?: string; number?: string };
    if (p.name && p.number) return { name: p.name, number: p.number };
    return null;
  } catch { return null; }
}

export default function EmergencyButton({ variant = 'inline' }: { variant?: 'inline' | 'sidebar' }) {
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState<{ label: string; number: string } | null>(null);
  const [contact, setContact] = useState<EmergencyContact | null>(null);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setContact(loadContact());
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY) setContact(loadContact());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function startHold() {
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setOpen(true);
      setHolding(false);
    }, HOLD_MS);
  }

  function cancelHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setHolding(false);
  }

  function askConfirm(label: string, number: string) {
    setOpen(false);
    setConfirm({ label, number });
  }

  function closeAll() {
    setOpen(false);
    setConfirm(null);
  }

  return (
    <>
      {/* ── Pulsante SOS — hold 800ms ── */}
      <button
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        aria-label="Emergenza — tieni premuto per aprire"
        className={`relative flex items-center gap-1.5 text-white shadow-md shadow-red-900/40 transition-all select-none ${
          variant === 'sidebar'
            ? 'w-full justify-center rounded-lg px-3 py-2 text-sm font-semibold'
            : 'rounded-full px-3 py-1.5 text-xs font-semibold'
        } ${holding ? 'bg-red-700 scale-95' : 'bg-red-600'}`}
        style={{ touchAction: 'none' }}
      >
        <Phone className={variant === 'sidebar' ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={2} />
        <span>SOS Emergenza</span>
        {holding && (
          <span className="absolute inset-0 rounded-lg border-2 border-white/60 animate-ping" />
        )}
      </button>

      {/* ── Modal scelta chiamata ── */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center" onClick={closeAll}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-sm rounded-t-[28px] md:rounded-[28px] bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold text-base text-text">Emergenza</span>
              </div>
              <button onClick={closeAll} aria-label="Chiudi"><X className="h-5 w-5 text-text-2" /></button>
            </div>

            <div className="space-y-3">
              {/* 112 */}
              <button
                onClick={() => askConfirm('112 — Emergenze', '112')}
                className="w-full flex items-center gap-4 rounded-[20px] border border-red-500/30 bg-red-500/10 px-5 py-4 active:bg-red-500/20 transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20 shrink-0">
                  <Phone className="h-5 w-5 text-red-500" strokeWidth={2} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-text text-lg leading-tight">112</div>
                  <div className="text-xs text-text-2">Numero unico emergenze</div>
                </div>
              </button>

              {/* Familiare */}
              {contact && (
                <button
                  onClick={() => askConfirm(contact.name, contact.number)}
                  className="w-full flex items-center gap-4 rounded-[20px] border border-border bg-surface-2 px-5 py-4 active:bg-surface transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shrink-0">
                    <Phone className="h-5 w-5 text-text-2" strokeWidth={1.8} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-text leading-tight">{contact.name}</div>
                    <div className="text-xs text-text-2">{contact.number}</div>
                  </div>
                </button>
              )}

              <button
                onClick={closeAll}
                className="w-full rounded-[16px] border border-border py-3 text-sm text-text-2 active:bg-surface-2 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conferma prima di chiamare ── */}
      {confirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-6" onClick={closeAll}>
          <div className="absolute inset-0 bg-black/70" />
          <div
            className="relative w-full max-w-xs rounded-[28px] bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                <Phone className="h-7 w-7 text-red-500" strokeWidth={2} />
              </div>
              <div>
                <div className="font-bold text-text text-base">Stai per chiamare</div>
                <div className="mt-1 text-2xl font-bold text-red-500">{confirm.label}</div>
              </div>
            </div>

            <div className="space-y-2">
              <a
                href={`tel:${confirm.number}`}
                onClick={closeAll}
                className="flex items-center justify-center gap-2 w-full rounded-[16px] bg-red-600 py-3.5 text-sm font-bold text-white active:bg-red-700 transition-colors"
              >
                <Phone className="h-4 w-4" strokeWidth={2} />
                Chiama ora
              </a>
              <button
                onClick={closeAll}
                className="w-full rounded-[16px] border border-border py-3 text-sm text-text-2 active:bg-surface-2 transition-colors"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
