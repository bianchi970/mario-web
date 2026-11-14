/**
 * La risposta di un servizio a monte (Hub, Brain, ponte), girata al browser.
 *
 * 204, 205 e 304 non hanno corpo: costruirle con un corpo "" lancia, e il
 * proxy trasformava un «fatto» in un errore (14/11/2026: la stanza eliminata
 * dall'Hub, «l'Hub ha detto di no» nella PWA). Un posto solo per tutti i proxy.
 */

import { NextResponse } from 'next/server';

const SENZA_CORPO = new Set([101, 204, 205, 304]);

export function rispostaInoltrata(status: number, corpo: string, contentType: string | null): NextResponse {
  if (SENZA_CORPO.has(status)) return new NextResponse(null, { status });
  return new NextResponse(corpo, {
    status,
    headers: { 'Content-Type': contentType || 'application/json' },
  });
}
