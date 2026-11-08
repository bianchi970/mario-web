/** @type {import('next').NextConfig} */
const nextConfig = {
  // `scripts/deploy.sh` costruisce in `.next-nuovo` e scambia a build finita:
  // senza variabile resta `.next`, ed è quella che il server legge sempre.
  distDir: process.env.NEXT_DIST_DIR || '.next',
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
