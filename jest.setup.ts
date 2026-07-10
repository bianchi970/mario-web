import '@testing-library/jest-dom';

// Polyfill crypto.randomUUID per jsdom (non disponibile di default)
if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.randomUUID !== 'function') {
  let _uuid_counter = 0;
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...globalThis.crypto,
      randomUUID: () => {
        _uuid_counter++;
        return `00000000-0000-4000-8000-${String(_uuid_counter).padStart(12, '0')}`;
      },
    },
    configurable: true,
  });
}

if (typeof AbortSignal !== 'undefined' && typeof (AbortSignal as { timeout?: unknown }).timeout === 'undefined') {
  (AbortSignal as { timeout?: (ms: number) => AbortSignal }).timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
    return controller.signal;
  };
}
