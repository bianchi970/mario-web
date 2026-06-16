# MARIO_HANDOFF — Mappa runtime definitiva
# B35.9 — 16/06/2026

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

## Stato commit (B35.9)

| Componente | Commit locale | Commit VPS/Pi | Note |
|---|---|---|---|
| mario-web | d2b639c (B35.9) | d2b639c (B35.9) | Live ✅ |
| mario-hub | 3038d1a (B35.5) | 3038d1a (B35.5) | Pi ✅ |
| mario-brain | 13751d9 (B34.6) | b9dc3dd (BLOCCO 14) | Non modificato |
| mario-remote-bridge | 9846211 | 9846211 | Non modificato |

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
