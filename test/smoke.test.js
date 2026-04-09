'use strict';

/**
 * mario-web/test/smoke.test.js
 *
 * Smoke test strutturale per il frontend di produzione.
 * Verifica:
 *   - proxy server-side esiste e inietta HUB_TOKEN
 *   - render.yaml punta a mario-web (non ad apps/web)
 *   - package.json ha gli script minimi (build, start, test)
 *   - apps/web non è nel percorso di deploy
 *
 * Non richiede build/run — puro check strutturale.
 */

const fs   = require('node:fs');
const path = require('node:path');

let passed = 0;
let failed = 0;

function ok(label, condition) {
  if (condition) {
    passed++;
    console.log(`  OK  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}`);
  }
}

// Resolve paths
const MARIO_WEB  = path.resolve(__dirname, '..');
const REPO_ROOT  = path.resolve(MARIO_WEB, '..');
const PROXY_TS   = path.join(MARIO_WEB, 'src', 'app', 'api', 'hub', '[...path]', 'route.ts');
const RENDER_YML = path.join(REPO_ROOT, 'render.yaml');
const WEB_PKG    = path.join(MARIO_WEB, 'package.json');
const APPS_WEB_PKG = path.join(REPO_ROOT, 'apps', 'web', 'package.json');
const APPS_WEB_PH  = path.join(REPO_ROOT, 'apps', 'web', 'PLACEHOLDER.md');

// ── Proxy server-side ─────────────────────────────────────────────────────────

console.log('\n── proxy server-side ──');
const proxyExists  = fs.existsSync(PROXY_TS);
const proxySource  = proxyExists ? fs.readFileSync(PROXY_TS, 'utf8') : '';

ok('proxy route.ts esiste', proxyExists);
ok('proxy legge HUB_URL da env',        proxySource.includes('process.env.HUB_URL'));
ok('proxy legge HUB_TOKEN da env',      proxySource.includes('process.env.HUB_TOKEN'));
ok('proxy inietta Authorization header', proxySource.includes('authorization'));
ok('proxy supporta SSE passthrough',    proxySource.includes('text/event-stream'));

// ── render.yaml ───────────────────────────────────────────────────────────────

console.log('\n── render.yaml ──');
const renderExists = fs.existsSync(RENDER_YML);
const renderYml    = renderExists ? fs.readFileSync(RENDER_YML, 'utf8') : '';

ok('render.yaml esiste',                     renderExists);
ok('render.yaml deploya mario-web',          renderYml.includes('rootDir: mario-web'));
ok('render.yaml ha HUB_TOKEN su mario-web',  renderYml.includes('HUB_TOKEN'));
ok('render.yaml ha HUB_URL su mario-web',    renderYml.includes('HUB_URL'));
ok('render.yaml NON deploya apps/web',       !renderYml.includes('rootDir: apps/web'));

// ── mario-web/package.json ────────────────────────────────────────────────────

console.log('\n── mario-web package.json ──');
const pkg = fs.existsSync(WEB_PKG) ? JSON.parse(fs.readFileSync(WEB_PKG, 'utf8')) : {};

ok('ha script build', typeof pkg.scripts?.build === 'string');
ok('ha script start', typeof pkg.scripts?.start === 'string');
ok('ha script test',  typeof pkg.scripts?.test  === 'string');

// ── apps/web dichiarato placeholder ──────────────────────────────────────────

console.log('\n── apps/web placeholder ──');
const appsWebPkg = fs.existsSync(APPS_WEB_PKG)
  ? JSON.parse(fs.readFileSync(APPS_WEB_PKG, 'utf8')) : {};

ok('apps/web ha script test (placeholder)', typeof appsWebPkg.scripts?.test === 'string');
ok('apps/web PLACEHOLDER.md esiste',        fs.existsSync(APPS_WEB_PH));

// ── Risultato ─────────────────────────────────────────────────────────────────

const total = passed + failed;
console.log(`\nRisultato: ${total} test — ${passed} OK, ${failed} FAIL`);
if (failed > 0) process.exit(1);
