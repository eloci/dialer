# Quick Start Guide - Production WebRTC SIP Dialer

This guide helps you run the dialer in production mode with real voice using a WebRTC-enabled SIP gateway (Asterisk/FreeSWITCH/Kamailio/OpenSIPS).

## ✅ Prerequisites

- A SIP server or proxy that supports:
  - WebSocket (ws:// or wss://)
  - WebRTC media (SRTP/ICE/DTLS)
  - STUN/TURN for NAT traversal

If your current softswitch does NOT support WebSocket/WebRTC, place a gateway in front of it (Asterisk/FreeSWITCH/Kamailio) and trunk it to your softswitch.

## 🚀 Start the App

1. Open `index.html` in your browser (preferably over HTTPS)
2. Fill in:

```
SIP Server (WebSocket): wss://your-gateway:7443
Username/Extension: 1001
Password: your-password
Realm/Domain (optional): yourdomain.com
```

3. Click Connect → you should see “Connected & Registered”
4. Click a 📞 Call button to place a call
5. Allow microphone permission

## 🧭 Recommended Gateway Topologies

- Asterisk/FreeSWITCH as a WebRTC gateway (WSS) → Trunk → Your Softswitch (UDP/TCP)
- Kamailio/OpenSIPS (WebSocket + rtpengine) → Trunk → Your Softswitch

See `SERVER_SETUP.md` for copy-paste configs for Asterisk and FreeSWITCH.

## 🔍 Troubleshooting

- Registration failed: verify WSS URL, credentials, and firewall
- No audio: check microphone permission, STUN/TURN, and NAT/firewall
- One-way audio: enable rtpengine or proper media relay on the gateway
- Certificate errors: use valid TLS certs for WSS in production

## 🔒 Production Tips

- Use HTTPS + WSS
- Use strong SIP secrets
- Restrict by IPs / ACLs on the gateway
- Rate-limit registrations and calls
- Monitor logs and enable detailed SIP tracing during setup

## 🧪 Example Settings

Asterisk WSS:
```
wss://asterisk.example.com:8089
Realm: asterisk.example.com
```

FreeSWITCH WSS:
```
wss://freeswitch.example.com:7443
Realm: freeswitch.example.com
```

Local lab testing:
```
ws://192.168.1.10:8088
Realm: (optional)
```

For complete gateway configuration, open `SERVER_SETUP.md`.
