# MARIO_HANDOFF — Mappa runtime definitiva
# B36 — 18/06/2026
# STATO: B36 Brain-AI COMPLETATO ✅

## B36 — Brain-AI (18/06/2026)

B36 implementa la comprensione del linguaggio naturale tramite Brain:

| Componente | Stato |
|---|---|
| mario-brain: provider AI (local/cloud/disabled) | ✅ dd51e3d |
| mario-brain: /api/brain/* endpoints | ✅ dd51e3d |
| mario-brain: error memory (brain_errors table) | ✅ dd51e3d |
| mario-hub: Brain proxy /brain/* in router | ✅ 5426394 |
| mario-web: NLCommandBar componente | ✅ cd1a229 |
| mario-web: /api/brain proxy (local+bridge mode) | ✅ cd1a229 |
| Test Brain: 26/26 provider + 32/32 API | ✅ |
| Test Hub: 191/191 | ✅ |
| Test Web: 74/74 | ✅ |
| Deploy Pi + VPS | ✅ |

Accesso Brain via VPS: `/api/brain/status` → bridge relay → Hub → Brain

## B35.10 — Freeze precedente (18/06/2026)

Tutte le funzionalità B35 implementate, testate e deployate:
- 191/191 test Hub ✅
- 74/74 test Web ✅
- Tutti i servizi attivi su VPS + Pi ✅
- Bridge connesso ✅

## MARIO è uno solo

MARIO è un prodotto unico composto da 4 pezzi tecnici:

| Componente | Ruolo |
|---|---|
| mario-web | app utente |
| mario-hub | runtime casa / comandi / protocolli |
| mario-brain | interpretazione / logica intelligente |
| mario-remote-bridge | collegamento remoto VPS ↔ Pi |

Non esiste un "MARIO locale" diverso da un "MARIO cloud". Esiste un MARIO.

## Runtime HomeMARIO — UNICO

### VPS Hetzner (178.105.23.248)
| Servizio | Porta | Note |
|---|---|---|
| nginx | 80 / 443 | TLS termination, reverse proxy |
| mario-web | 3000 | Next.js — UI pubblica |
| mario-remote-bridge | 7001 (WS) / 7002 (relay) | solo 127.0.0.1 |

Domini pubblici:
- https://app.homemario.com → nginx → mario-web :3000
- https://bridge.homemario.com → nginx → WS agent :7001
- https://bridge.homemario.com/relay → nginx → relay :7002

Porte pubbliche UFW: solo 22 / 80 / 443

### Pi Raspberry (192.168.1.4)
| Servizio | Porta | Note |
|---|---|---|
| mario-hub | 4001 | runtime comandi |
| mario-brain | 4000 | AI locale |
| mosquitto | 1883 (localhost) | MQTT broker |
| mario-bridge-client | — | outbound WS verso bridge.homemario.com |

Accesso Pi: solo tecnico locale (192.168.1.4)
Utente finale NON accede direttamente al Pi.

### Flusso dati
```
Browser/App
  └── https://app.homemario.com (VPS nginx)
       └── mario-web :3000 (VPS)
            └── /api/hub/* → relay https://bridge.homemario.com/relay
                 └── mario-remote-bridge :7002 (VPS)
                      └── WS tunnel → mario-bridge-client (Pi)
                           └── mario-hub :4001 (Pi)
                                ├── mario-brain :4000 (Pi)
                                └── mosquitto :1883 (Pi)
```

## Fuori runtime (non usare, non avviare, non modificare)

| Cosa | Motivo |
|---|---|
| DOMOTICA FACILE PROGETTO root | monorepo archiviato — ARCHIVIATO_NON_USARE.txt |
| mario-web-clean | copia stale B29.1 — ARCHIVIATO_NON_USARE.txt |
| mario-web sul Pi | disabled B34.7 — non far parte del runtime |
| Render | rimosso dal runtime |
| WireGuard | wg0 inactive, fuori runtime |
| C:\tmp | cartella temporanea — NON sorgente |
| 192.168.1.4 come accesso utente | solo tecnico SSH |
| pm2 | non usato |
| npx next start manuale | non usato |

## Repo ufficiali

| Componente | Percorso locale | Remote | Branch |
|---|---|---|---|
| mario-web | ROMEO DITTA 2025\mario-web | bianchi970/mario-web.git | main |
| mario-hub | ...DOMOTICA...\mario-hub | bianchi970/mario-hub.git | main |
| mario-brain | ...DOMOTICA...\mario-brain | bianchi970/mario-brain.git | master |
| mario-remote-bridge | ROMEO DITTA 2025\mario-remote-bridge | bianchi970/mario-remote-bridge.git | main |

## Stato commit (B35.10 — FREEZE)

| Componente | Commit | Deploy | Note |
|---|---|---|---|
| mario-web | b576756 (B35.10) | VPS ✅ | edit automazioni + UI completa |
| mario-hub | 7adf185 (B35.10) | Pi ✅ | fix security ruoli utente |
| mario-brain | 13751d9 (B34.6) | Pi ✅ | non modificato |
| mario-remote-bridge | 9846211 | VPS + Pi ✅ | non modificato |

## Funzionalità completate (B35)

| Blocco | Feature | Stato |
|---|---|---|
| B35.2 | Notifiche in-app (TopBar bell + dropdown + dismiss) | ✅ |
| B35.3 | Scenari senza Brain (creazione manuale, run via Hub) | ✅ |
| B35.4 | Home: dispositivi offline + esecuzioni recenti | ✅ |
| B35.5 | Meteo Open-Meteo (Hub service + widget Home + impostazioni) | ✅ |
| B35.6 | Sicurezza /security (stato, modalità, eventi, confirm dialog) | ✅ |
| B35.7 | Energia client-side + visibile a tutti | ✅ |
| B35.8 | Dettaglio dispositivo /devices/[id] | ✅ |
| B35.9 | Navigazione 4 voci mobile + telecamere card ONVIF | ✅ |

## API Hub aggiunte (B35.5)

- `GET  /api/hub/weather?project_id=X` — meteo Open-Meteo (cache 30min, fallback offline)
- `PATCH /api/hub/projects/:id/location` — aggiorna lat/lon/city per il meteo

## Funzionalità completate (B35.10)

| Fix / Feature | Dettaglio | Stato |
|---|---|---|
| B35.10a | Sicurezza: GET /security/state + /events accettano ruolo 'utente' | ✅ |
| B35.10b | Automazioni: bottone "Modifica" (installer) → wizard pre-popolato → PATCH | ✅ |

## Ruoli e permessi sicurezza (aggiornato B35.10)

| Endpoint | admin | installatore | utente |
|---|---|---|---|
| GET /security/state | ✅ | ✅ | ✅ |
| GET /security/events | ✅ | ✅ | ✅ |
| POST /security/state (cambia modalità) | ✅ | ✅ | ❌ |
