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
      // Permissions-Policy già inviato da nginx — non duplicare qui
      // (header duplicato causa blocco microfono su alcuni browser)
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
