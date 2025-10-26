# 🎉 Your WebRTC SIP Gateway is Running!

## ✅ Status
- **Asterisk Gateway**: Running (Container: `asterisk-webrtc-gateway`)
- **Version**: Asterisk 20.11.1
- **VOS3000 Registration**: ✅ **REGISTERED** to `sip:104.248.249.40`
- **WebSocket Server**: ✅ Listening on `ws://localhost:8088/ws`
- **SIP UDP**: ✅ Port 5060 (for VOS3000 trunk)
- **RTP Ports**: ✅ 10000-10100 UDP (media/audio)

---

## 🚀 Connect Your Dialer

Open your browser and navigate to:
```
c:\Users\Ensar Lochi\Desktop\dialer\index.html
```

### Enter These Settings in the Dialer:

| Field | Value |
|-------|-------|
| **SIP Server (WebSocket)** | `ws://localhost:8088/ws` |
| **Username** | `1001` |
| **Password** | `websecret` |
| **Realm** | *(leave empty or use `localhost`)* |

### Click "Connect"
- You should see status change to "Connected"
- The dialer will register via WebSocket to Asterisk
- Asterisk will bridge calls to VOS3000 using your credentials

### Make a Test Call
1. Select a number from your predefined list
2. Click "Call"
3. Audio should flow through WebRTC → Asterisk → VOS3000 → destination

---

## 📊 Check Gateway Status

### View Logs
```powershell
cd "c:\Users\Ensar Lochi\Desktop\dialer\gateway\asterisk"
docker compose logs -f
```

### Check VOS3000 Registration
```powershell
docker compose exec asterisk asterisk -rx 'pjsip show registrations'
```
Should show:
```
vos3000-registration/sip:104.248.249.40    vos3000-auth    Registered
```

### Check WebRTC Endpoints
```powershell
docker compose exec asterisk asterisk -rx 'pjsip show endpoints'
```
Should show:
- `1001` (browser endpoint) - Unavailable until browser connects
- `vos3000-endpoint` - Not in use (trunk)

### Check Active Calls
```powershell
docker compose exec asterisk asterisk -rx 'core show channels'
```

### Check Transports
```powershell
docker compose exec asterisk asterisk -rx 'pjsip show transports'
```
Should show:
- `transport-udp` on `0.0.0.0:5060` (for VOS3000)
- `transport-ws` on `0.0.0.0:8088` (for browser)

---

## 🔧 Troubleshooting

### Browser Can't Connect to WebSocket
1. Check gateway is running:
   ```powershell
   docker compose ps
   ```
2. Verify port 8088 is open:
   ```powershell
   netstat -an | findstr "8088"
   ```
3. Check for errors:
   ```powershell
   docker compose logs --tail=50
   ```

### No Audio During Call
1. Verify RTP ports 10000-10100 are mapped:
   ```powershell
   docker compose ps
   ```
2. Check Windows Firewall allows these ports
3. Review Asterisk RTP config:
   ```powershell
   docker compose exec asterisk cat /etc/asterisk/rtp.conf
   ```

### VOS3000 Registration Failed
1. Check registration status:
   ```powershell
   docker compose exec asterisk asterisk -rx 'pjsip show registrations'
   ```
2. If "Rejected" or "Unregistered":
   - Verify VOS3000 allows registration from your gateway IP
   - Check credentials in `config/pjsip.conf`:
     - Username: `4942139974006`
     - Password: `msowu204$`
     - Server: `104.248.249.40`
   - Reload config:
     ```powershell
     docker compose exec asterisk asterisk -rx 'module reload res_pjsip.so'
     ```

### Call Fails or Immediate Hangup
1. Check dialplan is routing to VOS3000:
   ```powershell
   docker compose exec asterisk cat /etc/asterisk/extensions.conf
   ```
2. Enable verbose logging:
   ```powershell
   docker compose exec asterisk asterisk -rx 'core set verbose 5'
   docker compose exec asterisk asterisk -rx 'pjsip set logger on'
   ```
3. Watch logs during call attempt:
   ```powershell
   docker compose logs -f
   ```

---

## 🛑 Stop Gateway
```powershell
cd "c:\Users\Ensar Lochi\Desktop\dialer\gateway\asterisk"
docker compose down
```

## 🔄 Restart Gateway
```powershell
docker compose restart
```

## 📝 Update Configuration
After editing any `.conf` files in `config/`:
```powershell
docker compose exec asterisk asterisk -rx 'module reload res_pjsip.so'
```
Or full restart:
```powershell
docker compose restart
```

---

## 🎯 Next Steps

1. **Open the dialer** in your browser (`index.html`)
2. **Enter the WebSocket URL**: `ws://localhost:8088/ws`
3. **Use credentials**: `1001` / `websecret`
4. **Click Connect** and wait for "Connected" status
5. **Select a number** and click "Call"
6. **Verify audio** flows both ways

### Optional: Enable Secure WebSocket (WSS)
1. Place TLS cert and key in `gateway/asterisk/certs/`:
   - `fullchain.pem`
   - `privkey.pem`
2. Edit `config/http.conf` and uncomment WSS lines
3. Restart: `docker compose restart`
4. Update dialer to use: `wss://localhost:8089/ws`

---

## 📞 Architecture Overview

```
┌─────────────────┐
│   Browser       │
│   (JsSIP)       │  ws://localhost:8088/ws
└────────┬────────┘
         │ WebSocket/WebRTC
         │
┌────────▼────────┐
│   Asterisk      │
│   Gateway       │  SIP UDP :5060
│   (Docker)      │  RTP UDP :10000-10100
└────────┬────────┘
         │ SIP/RTP
         │
┌────────▼────────┐
│   VOS3000       │
│  104.248.249.40 │
│   (Softswitch)  │
└─────────────────┘
```

**Call Flow:**
1. Browser dials → JsSIP sends INVITE over WebSocket to Asterisk
2. Asterisk receives on `:8088/ws` (WebRTC endpoint `1001`)
3. Asterisk routes via dialplan to `vos3000-endpoint`
4. Asterisk sends INVITE to VOS3000 over SIP UDP `:5060`
5. VOS3000 routes to destination
6. Audio (RTP) flows: Browser ↔ Asterisk ↔ VOS3000 ↔ Destination

---

## 📚 Resources
- [Asterisk PJSIP Documentation](https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/)
- [JsSIP Documentation](https://jssip.net/documentation/)
- [WebRTC Samples](https://webrtc.github.io/samples/)

**Your gateway is ready! Start making calls.** 🎉
