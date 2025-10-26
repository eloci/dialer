# Kamailio WebRTC Gateway

Simple and lightweight SIP proxy for WebRTC to SIP bridging.

## Services

1. **Kamailio**: SIP proxy with WebSocket support
2. **RTPEngine**: Media proxy for WebRTC ↔ RTP translation (handles DTLS/SRTP)
3. **Coturn**: TURN relay server for NAT traversal

## Architecture

```
Browser (WebRTC) → Kamailio (WS:8088) → VOS3000 (UDP:5060)
                ↓
              RTPEngine (converts DTLS-SRTP ↔ RTP)
```

## Start Gateway

```powershell
cd "C:\Users\Ensar Lochi\Desktop\dialer\gateway\kamailio"
docker compose up -d
```

## Check Status

```powershell
docker compose ps
docker compose logs -f
```

## Dialer Configuration

- **WebSocket URL**: `ws://localhost:8088`
- **Username**: Any (e.g., `1001`)
- **Password**: Any (no authentication)

Calls will be routed to VOS3000 with caller ID `4942139974006`.
