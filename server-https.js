'use strict';

const https   = require('https');
const fs      = require('fs');
const path    = require('path');
const { parse } = require('url');
const next    = require('next');

const app    = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

const KEY  = path.join(__dirname, 'certs', 'key.pem');
const CERT = path.join(__dirname, 'certs', 'cert.pem');

app.prepare().then(() => {
  https.createServer({ key: fs.readFileSync(KEY), cert: fs.readFileSync(CERT) }, (req, res) => {
    handle(req, res, parse(req.url, true));
  }).listen(3000, '0.0.0.0', () => {
    console.log('[mario-web] HTTPS :3000 ready');
  });
});
