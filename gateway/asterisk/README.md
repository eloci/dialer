# Asterisk WebRTC Gateway for VOS3000

This gateway lets your browser dial via WebRTC (SIP over WebSocket) and forwards calls to your VOS3000 (traditional SIP UDP/TCP).

## What this does

Browser (JsSIP/WebRTC) → WebSocket (ws/wss) → Asterisk → SIP UDP (5060) → VOS3000 (104.248.249.40)

## Prerequisites

- Docker Desktop installed (Windows)
- Ports available on your host:
  - 8088/tcp (ws)
  - 8089/tcp (wss, optional)
  - 5060/udp (SIP)
  - 10000-10100/udp (RTP media)

## Configuration Included

- pjsip.conf:
  - WebSocket transport (ws on 8088)
  - WebRTC client user: 1001 / websecret
  - Trunk registers to VOS3000 using:
    - Server: 104.248.249.40
    - Username: 4942139974006
    - Password: msowu204$
- extensions.conf:
  - Routes all dialed numbers to the VOS3000 trunk

If you need to change credentials/IP, edit `config/pjsip.conf` before starting.

## Start the gateway

Open a terminal (cmd or PowerShell) and run:

```cmd
cd "c:\Users\Ensar Lochi\Desktop\dialer\gateway\asterisk"
docker compose up -d
```

Check logs:

```cmd
docker compose logs -f
```

Stop:

```cmd
docker compose down
```

## Point your Dialer UI to the gateway

In your `index.html` app (already wired with JsSIP):

- SIP Server (WebSocket): `ws://localhost:8088/ws`
- Username/Extension: `1001`
- Password: `websecret`
- Realm/Domain: leave empty or set `localhost`

Then click Connect → Should say "Connected & Registered"

Place calls → They will be forwarded to VOS3000.

## Optional: Enable Secure WebSocket (WSS)

1. Put TLS cert and key into `certs/` as `fullchain.pem` and `privkey.pem`.
2. Edit `config/http.conf` and uncomment tls lines.
3. Edit `config/pjsip.conf` to use `transport-wss` in the 1001 endpoint.
4. Expose 8089/tcp (already mapped).
5. Restart the stack:

```cmd
docker compose down
docker compose up -d
```

Use `wss://localhost:8089/ws` in the dialer.

## Notes / Troubleshooting

- If registration to VOS3000 fails, verify credentials and that your public IP is allowed by VOS3000.
- If audio is one-way or no audio:
  - Ensure UDP 10000-10100 is open on Windows Firewall
  - If running behind NAT, port-forward 5060/udp and 10000-10100/udp on your router
  - Consider using a public cloud host for the gateway
- If the browser blocks microphone:
  - Serve your app from http://localhost or HTTPS
  - Allow mic permission when prompted

## Security

- Credentials are in `pjsip.conf`. Consider using environment variables or secrets for production.
- Prefer WSS in production with valid TLS certificates.
- Limit exposure of 5060 and RTP ports to trusted networks.
