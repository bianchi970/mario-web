# mario-web — CLAUDE.md

Regole condivise: `C:\HomeMARIO\CLAUDE.md`

## Ruolo
Interfaccia PWA Next.js 15 (React 18, TypeScript 5, Tailwind CSS).
Deployata su VPS Hetzner. Installabile su Android/iOS come PWA.
Flusso voce: microfono browser → MediaRecorder → blob → FormData → endpoint STT (Whisper su Pi) → testo → Brain.

## Comandi
```bash
npm run dev      # Next.js dev server porta 3000
npm test         # jest --runInBand  (128/128 test case)
npm run build    # build produzione
npm run lint     # ESLint
```

## Note Specifiche
- Service worker: `public/sw.js` v3 — gestisce installazione PWA e cache
- Nginx VPS: `Permissions-Policy: microphone=(self)` necessario per microfono
- Auth: access token + refresh token; logout invia refresh token per revoca sessione singola
- Stanze: badge con conteggio device online/totale
- Commit corrente verde: `bf93d8a` (diagnostica microfono per tipo errore)
