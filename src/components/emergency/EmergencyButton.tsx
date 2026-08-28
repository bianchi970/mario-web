'use client';

import { useEffect, useState } from 'react';
import { Phone, X } from 'lucide-react';

const LS_KEY = 'mario_emergency_contact';

interface EmergencyContact {
  name: string;
  number: string;
}

function loadContact(): EmergencyContact | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; number?: string };
    if (parsed.name && parsed.number) return { name: parsed.name, number: parsed.number };
    return null;
  } catch {
    return null;
  }
}

export default function EmergencyButton() {
  const [open, setOpen] = useState(false);
  const [contact, setContact] = useState<EmergencyContact | null>(null);

  // Legge il contatto da localStorage solo lato client
  useEffect(() => {
    setContact(loadContact());
    // Aggiorna se le impostazioni cambiano (altro tab o settings page)
    function onStorage(e: StorageEvent) {
      if (e.key === LS_KEY) setContact(loadContact());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <>
      {/* Pulsante fisso in basso a destra */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Emergenza"
        className="fixed bottom-20 right-4 z-50 md:bottom-6 flex items-center gap-2 rounded-full bg-red-600 px-4 py-3 text-white shadow-lg shadow-red-900/40 active:bg-red-700 transition-colors"
      >
        <Phone className="h-5 w-5" strokeWidth={2} />
        <span className="text-sm font-semibold">SOS</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center md:items-center"
          onClick={() => setOpen(false)}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Contenuto */}
          <div
            className="relative w-full max-w-sm rounded-t-[28px] md:rounded-[28px] bg-surface p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-bold text-base text-text">Emergenza</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Chiudi">
                <X className="h-5 w-5 text-text-2" />
              </button>
            </div>

            <div className="space-y-3">
              {/* 112 */}
              <a
                href="tel:112"
                className="flex items-center gap-4 rounded-[20px] border border-red-500/30 bg-red-500/10 px-5 py-4 active:bg-red-500/20 transition-colors"
                onClick={() => setOpen(false)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <Phone className="h-5 w-5 text-red-500" strokeWidth={2} />
                </div>
                <div>
                  <div className="font-bold text-text text-lg leading-tight">112</div>
                  <div className="text-xs text-text-2">Numero unico emergenze</div>
                </div>
              </a>

              {/* Familiare — solo se configurato */}
              {contact && (
                <a
                  href={`tel:${contact.number}`}
                  className="flex items-center gap-4 rounded-[20px] border border-border bg-surface-2 px-5 py-4 active:bg-surface transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                    <Phone className="h-5 w-5 text-text-2" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div className="font-semibold text-text leading-tight">{contact.name}</div>
                    <div className="text-xs text-text-2">{contact.number}</div>
                  </div>
                </a>
              )}

              <button
                onClick={() => setOpen(false)}
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
