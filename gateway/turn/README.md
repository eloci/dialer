# TURN Service (coturn)

This folder hosts a minimal TURN server used by the web dialer to speed up and stabilize media setup behind NAT.

- Image: instrumentisto/coturn
- Listening: 3478/udp and 3478/tcp
- Credentials: dialer / secret123
- Realm: dialer.local
- External IP: 77.29.180.211
- Relay ports: 49160–49200/udp

Security notes:
- Credentials are demo-only; replace in production.
- Open UDP 3478 and UDP 49160–49200 on your firewall to the host.

Update browser ICE servers accordingly:
- turn:77.29.180.211:3478?transport=udp
- turn:77.29.180.211:3478?transport=tcp
