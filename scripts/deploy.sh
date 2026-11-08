#!/usr/bin/env bash
# Deploy della PWA con la build A PARTE (8/11/2026).
#
# Prima: `git pull && npm run build` scriveva la build nuova SOPRA `.next`, mentre
# il server vecchio la stava servendo: per i minuti della build la PWA poteva
# fallire («Non riesco a leggerlo» alle 20:26 dell'8/11, durante il deploy).
# Ora la build va in `.next-nuovo`; solo quando è finita e riuscita si scambia
# con `.next` e si riavvia. Se dopo il riavvio la PWA non risponde, si torna
# alla build di prima (`.next-vecchio`), che resta lì fino al deploy dopo.
#
# uso, dalla cartella della PWA (Pi: ~/mario-web · VPS: /opt/mario-web):
#   bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git pull --ff-only

rm -rf .next-nuovo
NEXT_DIST_DIR=.next-nuovo npm run build
# la build con un'altra cartella riscrive questi due file tracciati: un file
# modificato sul server fa abortire il `git pull` successivo
git checkout -- next-env.d.ts tsconfig.json

rm -rf .next-vecchio
mv .next .next-vecchio
mv .next-nuovo .next
sudo -n systemctl restart mario-web

# risponde? (Pi: https col certificato di casa · VPS: http dietro nginx)
risponde() {
  for url in https://127.0.0.1:3000/login http://127.0.0.1:3000/login; do
    code=$(curl -sk -o /dev/null -m 5 -w '%{http_code}' "$url" || true)
    [ "$code" = "200" ] && return 0
  done
  return 1
}
for _ in $(seq 1 20); do risponde && break; sleep 1; done

if risponde; then
  echo "deploy OK: $(git log --oneline -1)"
else
  echo "⛔ la PWA nuova non risponde: si torna alla build di prima" >&2
  rm -rf .next-rotta && mv .next .next-rotta && mv .next-vecchio .next
  sudo -n systemctl restart mario-web
  exit 1
fi
