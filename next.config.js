/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      // sw.js non va mai in cache — il browser lo aggiorna ad ogni deploy
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      // Microfono esplicito per PWA standalone (default Chrome: allow, ma meglio essere espliciti)
      {
        source: '/(.*)',
        headers: [
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
