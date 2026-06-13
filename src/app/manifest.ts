import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MARIO',
    short_name: 'MARIO',
    id: '/',
    description: 'Domotica locale — controllo casa',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    // @ts-ignore — display_override è supportato runtime ma non nel tipo Next.js
    display_override: ['standalone'],
    orientation: 'portrait',
    theme_color: '#0f1117',
    background_color: '#0f1117',
    lang: 'it',
    categories: ['utilities'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-192x192-maskable.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384-maskable.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    screenshots: [
      {
        src: '/screenshots/screenshot-mobile.png',
        sizes: '540x1170',
        type: 'image/png',
      } as any,
    ],
  };
}
