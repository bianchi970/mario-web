# MARIO_HANDOFF — Mappa runtime definitiva
# B34.7 — 14/06/2026

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

### Fuori runtime (non usare)
- Render
- WireGuard (wg0 inactive e fuori runtime)
- mario-web sul Pi (disabled)
- pm2
- npx next start manuale
- accesso utente da 192.168.1.4

### Repo ufficiali
| Componente | Percorso locale | Remote | Branch |
|---|---|---|---|
| mario-web | ROMEO DITTA 2025\mario-web | bianchi970/mario-web.git | main |
| mario-hub | ...DOMOTICA...\mario-hub | bianchi970/mario-hub.git | main |
| mario-brain | ...DOMOTICA...\mario-brain | bianchi970/mario-brain.git | master |
| mario-remote-bridge | ROMEO DITTA 2025\mario-remote-bridge | bianchi970/mario-remote-bridge.git | main |

NON usare: DOMOTICA FACILE PROGETTO root, mario-web-clean, C:\tmp come sorgente.

### Stato commit (B34.7)
- mario-web VPS: 3cb8428 B34.5.1
- mario-remote-bridge VPS: 9846211
- mario-hub Pi: d7d6e3b B34.5.1
- mario-brain Pi: b9dc3dd BLOCCO 14
