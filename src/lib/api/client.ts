'use client';

export class ApiClientError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

function readError(payload: unknown): { message: string; code?: string } {
  if (!payload || typeof payload !== 'object') {
    return { message: 'Errore richiesta' };
  }

  const error = (payload as { error?: unknown }).error;

  if (typeof error === 'string' && error.trim()) {
    return { message: error, code: error };
  }

  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    const code = (error as { code?: unknown }).code;

    if (typeof message === 'string' && message.trim()) {
      return {
        message,
        code: typeof code === 'string' && code.trim() ? code : undefined,
      };
    }

    if (typeof code === 'string' && code.trim()) {
      return { message: code, code };
    }
  }

  return { message: 'Errore richiesta' };
}

export async function fetchAPI<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const res = await fetch(path, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  });

  console.log('[API]', method, path, res.status);

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const error = readError(payload);
    throw new ApiClientError(error.message, res.status, error.code);
  }

  return payload as T;
}
