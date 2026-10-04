/**
 * src/lib/voce.ts — la bocca di MARIO
 *
 * Fino al 2026-10-04 MARIO aveva un orecchio (Whisper sul Pi) e **nessuna
 * bocca**: cercando `tts`, `speechSynthesis`, `piper`, `espeak` in tutti e
 * quattro i repository le occorrenze erano zero. Rispondeva solo scrivendo.
 *
 * Qui usa la voce del browser (`window.speechSynthesis`), e la scelta e
 * deliberata:
 *   - **niente servizio esterno**: nessuna frase di casa esce da questo
 *     dispositivo, nessuna chiave, nessun costo, nessuna latenza di rete;
 *   - **funziona offline**, come deve fare una casa;
 *   - **niente dipendenze**: e gia nel browser, su Windows, Android e iOS.
 *
 * Regola che vale anche qui: MARIO dice **solo cio che ha gia deciso**. Questo
 * modulo riceve una frase gia costruita da `parola.js` nel Brain e la
 * pronuncia. Non la riformula, non la completa, non aggiunge fatti.
 */

/** Il browser sa parlare? (SSR, browser vecchi, permessi) */
export function puoParlare(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Pronuncia una frase in italiano. Non lancia mai: se la voce non c'e, la
 * risposta scritta resta ed e sufficiente — la bocca e un di piu, non un
 * requisito.
 *
 * @param frase  testo gia deciso dal Brain
 */
export function parla(frase: string | null | undefined): void {
  if (!puoParlare()) return;
  const testo = (frase ?? '').trim();
  if (!testo) return;

  try {
    // Una frase alla volta: se MARIO sta ancora dicendo quella di prima, la
    // nuova la sostituisce. Due voci sovrapposte non si capiscono.
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(testo);
    u.lang   = 'it-IT';
    u.rate   = 1.0;
    u.pitch  = 1.0;
    u.volume = 1.0;

    // Se c'e una voce italiana installata, si preferisce: senza, il browser
    // leggerebbe l'italiano con la fonetica della lingua di sistema.
    const italiana = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('it'));
    if (italiana) u.voice = italiana;

    window.speechSynthesis.speak(u);
  } catch {
    /* la voce e un di piu: un suo errore non deve togliere la risposta scritta */
  }
}

/** Zittisce MARIO subito (es. l'utente ricomincia a parlare). */
export function taci(): void {
  if (!puoParlare()) return;
  try { window.speechSynthesis.cancel(); } catch { /* ignora */ }
}
