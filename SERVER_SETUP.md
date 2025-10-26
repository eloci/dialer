# SIP Server Configuration Guide

This guide helps you configure popular SIP servers to work with the WebRTC-based dialer.

## Asterisk Configuration

### 1. Install Asterisk with WebSocket Support

```bash
# Ensure Asterisk 13+ is installed with res_pjsip and res_http_websocket
```

### 2. Configure WebSocket Transport (`pjsip.conf`)

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
; For secure WebSocket - requires SSL certificates
external_media_address=YOUR_PUBLIC_IP
external_signaling_address=YOUR_PUBLIC_IP

[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0:8088
; For testing only - not secure
```

### 3. Configure WebRTC Endpoint (`pjsip.conf`)

```ini
[webrtc-endpoint](!)
type=endpoint
context=from-internal
dtmf_mode=rfc4733
disallow=all
allow=opus
allow=ulaw
allow=alaw
ice_support=yes
use_avpf=yes
media_encryption=sdes
force_avp=no
media_use_received_transport=no
rtcp_mux=yes
rtp_symmetric=yes
rewrite_contact=yes
timers=no

[1001](webrtc-endpoint)
type=endpoint
auth=1001
aors=1001

[1001]
type=auth
auth_type=userpass
username=1001
password=SecurePassword123

[1001]
type=aor
max_contacts=5
remove_existing=yes
```

### 4. Configure HTTP Server (`http.conf`)

```ini
[general]
enabled=yes
bindaddr=0.0.0.0
bindport=8088
tlsenable=yes
tlsbindaddr=0.0.0.0:8089
tlscertfile=/etc/asterisk/keys/asterisk.pem
tlsprivatekey=/etc/asterisk/keys/asterisk.key
```

### 5. Enable Required Modules (`modules.conf`)

```ini
load => res_http_websocket.so
load => res_pjsip.so
load => res_pjsip_session.so
load => res_pjsip_transport_websocket.so
```

### 6. Restart Asterisk

```bash
asterisk -rx "core restart now"
```

---

## FreeSWITCH Configuration

### 1. Enable WebSocket (`sip_profiles/internal.xml`)

```xml
<param name="ws-binding" value=":8080"/>
<param name="wss-binding" value=":8081"/>
```

### 2. Configure WebRTC Settings (`sip_profiles/internal.xml`)

```xml
<param name="apply-inbound-acl" value="domains"/>
<param name="local-network-acl" value="localnet.auto"/>
<param name="enable-100rel" value="true"/>
<param name="enable-compact-headers" value="true"/>
<param name="media-option" value="resume-media-on-hold"/>
<param name="media-option" value="bypass-media-after-att-xfer"/>
```

### 3. Create WebRTC User (`directory/default/1001.xml`)

```xml
<include>
  <user id="1001">
    <params>
      <param name="password" value="SecurePassword123"/>
      <param name="vm-password" value="1001"/>
    </params>
    <variables>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="User 1001"/>
      <variable name="effective_caller_id_number" value="1001"/>
    </variables>
  </user>
</include>
```

### 4. Enable WebRTC Module

```bash
fs_cli -x "load mod_verto"
```

### 5. Restart FreeSWITCH

```bash
systemctl restart freeswitch
```

---

## Kamailio Configuration

### 1. Enable WebSocket Module (`kamailio.cfg`)

```
loadmodule "websocket.so"

# WebSocket listening
listen=tcp:0.0.0.0:8080
listen=tls:0.0.0.0:8081

# WebSocket handling
event_route[websocket:closed] {
    xlog("L_INFO", "WebSocket connection closed\n");
}
```

### 2. Configure WebRTC Handling

```
# In request route
if (nat_uac_test("64")) {
    force_rport();
    if (is_method("REGISTER")) {
        fix_nated_register();
    } else {
        if (!add_contact_alias()) {
            xlog("L_ERR", "Error aliasing contact\n");
        }
    }
}
```

---

## Testing Your Configuration

### 1. Test WebSocket Connection

```bash
# Use wscat to test WebSocket
npm install -g wscat
wscat -c ws://your-server:8088

# For secure WebSocket
wscat -c wss://your-server:8089
```

### 2. Check SIP Registration

In the dialer application:
- Open browser console (F12)
- Click Connect
- Look for "Successfully registered" message

### 3. Test Audio

Make a test call to an echo service or voicemail to verify:
- Outgoing audio (speak and listen to echo)
- Incoming audio (play voicemail greeting)

---

## Firewall Configuration

### Ports to Open

```bash
# WebSocket (non-secure)
sudo ufw allow 8088/tcp

# WebSocket (secure)
sudo ufw allow 8089/tcp

# RTP Media (for Asterisk/FreeSWITCH)
sudo ufw allow 10000:20000/udp

# SIP Signaling (if needed)
sudo ufw allow 5060/udp
sudo ufw allow 5060/tcp
```

---

## STUN/TURN Server Configuration

### Public STUN Servers (for testing)

The dialer is configured to use Google's STUN server by default:
- `stun:stun.l.google.com:19302`

### Setting Up Your Own TURN Server (coturn)

```bash
# Install coturn
sudo apt-get install coturn

# Configure /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YourSecretKey
realm=yourdomain.com
total-quota=100
stale-nonce=600

# Start coturn
sudo systemctl start coturn
```

### Update script.js to use your TURN server

```javascript
pcConfig: {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302'] },
    { 
      urls: ['turn:your-turn-server.com:3478'],
      username: 'username',
      credential: 'password'
    }
  ]
}
```

---

## SSL Certificate Setup (for WSS)

### Using Let's Encrypt

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Certificates will be in:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

### Configure Asterisk to use certificates

```ini
; In http.conf
tlscertfile=/etc/letsencrypt/live/your-domain.com/fullchain.pem
tlsprivatekey=/etc/letsencrypt/live/your-domain.com/privkey.pem
```

---

## Common Issues and Solutions

### Issue: "Registration Failed - 401 Unauthorized"
**Solution**: Check username/password in both dialer and server config

### Issue: "WebSocket connection failed"
**Solution**: 
- Verify WebSocket port is open
- Check if WebSocket module is loaded
- Ensure firewall allows connection

### Issue: "No audio during call"
**Solution**:
- Configure STUN/TURN servers
- Open RTP ports (10000-20000 UDP)
- Check NAT configuration

### Issue: "403 Forbidden"
**Solution**: Check IP-based ACLs on SIP server

### Issue: Certificate errors with WSS
**Solution**: Use valid SSL certificate or add exception in browser (testing only)

---

## Security Best Practices

1. **Always use WSS in production** (not WS)
2. **Use strong passwords** for SIP accounts
3. **Implement rate limiting** to prevent abuse
4. **Use fail2ban** to block brute force attempts
5. **Keep SIP server updated** with security patches
6. **Use firewall rules** to restrict access
7. **Implement IP whitelisting** where possible
8. **Monitor logs** for suspicious activity

---

## Codec Configuration

For best WebRTC compatibility, prioritize these codecs:

```ini
; Asterisk pjsip.conf
disallow=all
allow=opus      ; Best quality for WebRTC
allow=ulaw      ; Fallback
allow=alaw      ; Fallback
```

---

## Testing Tools

- **SIP.js**: Test SIP WebSocket connectivity
- **Wireshark**: Capture and analyze SIP/RTP traffic
- **WebRTC Internals**: Chrome's built-in WebRTC debugger (chrome://webrtc-internals)
- **SIPp**: SIP protocol testing tool

---

## Support Resources

- Asterisk: https://wiki.asterisk.org/wiki/display/AST/WebRTC
- FreeSWITCH: https://freeswitch.org/confluence/display/FREESWITCH/WebRTC
- JsSIP: https://jssip.net/documentation/
- WebRTC: https://webrtc.org/

---

Need help? Check the browser console for detailed error messages and refer to your SIP server logs.
