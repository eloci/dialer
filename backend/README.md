# Backend Server Setup for Traditional SIP

This backend server acts as a bridge between your browser (which only supports WebSocket) and your traditional SIP softswitch (which uses UDP/TCP on port 5060).

## Architecture

```
Browser (WebRTC) <--WebSocket--> Node.js Backend <--SIP UDP/TCP--> Your SIP Softswitch
```

## Prerequisites

- Node.js 14+ installed
- Access to your SIP softswitch (IP address, username, password)
- SIP softswitch must be accessible from this server

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Edit `.env` file if needed:
```env
PORT=3000        # HTTP server port
WS_PORT=8080     # WebSocket port (browser connects here)
```

## Running the Server

### Development Mode (with auto-restart):
```bash
npm run dev
```

### Production Mode:
```bash
npm start
```

You should see:
```
HTTP server running on http://localhost:3000
WebSocket server running on ws://localhost:8080

Configuration:
- Frontend will connect to ws://localhost:8080
- Backend will connect to your SIP server via UDP/TCP on port 5060
```

## How It Works

1. **Frontend** connects to **Backend** via WebSocket (`ws://localhost:8080`)
2. **Frontend** sends connection details (SIP server IP, username, password)
3. **Backend** registers to your SIP softswitch using traditional SIP (UDP/TCP)
4. When making a call:
   - **Frontend** sends call request to **Backend**
   - **Backend** sends SIP INVITE to your softswitch
   - Audio is handled via WebRTC in the browser
   - Signaling goes through the backend

## Troubleshooting

### "Cannot find module 'sip'"

The `sip` module has limited support. For production, consider using:
- **drachtio-srf**: Full-featured SIP application framework
- **Asterisk with WebRTC**: Configure Asterisk to support WebSocket
- **FreeSWITCH**: Native WebRTC support

### Alternative: Use Asterisk/FreeSWITCH as WebSocket Gateway

**Recommended Approach**: Configure your SIP server to support WebSocket directly.

#### For Asterisk:
Enable WebSocket in `http.conf` and `pjsip.conf` (see main README)

#### For FreeSWITCH:
Enable `mod_verto` for WebSocket support

This eliminates the need for this backend server!

## Production Deployment

For production use, consider:

1. **Use a proper SIP proxy**: Kamailio, OpenSIPS, or Asterisk with WebSocket
2. **SSL/TLS**: Use WSS (secure WebSocket)
3. **Authentication**: Add proper user authentication
4. **Scaling**: Use clustering for multiple users
5. **Monitoring**: Add logging and error tracking

## Testing

1. Start the backend server
2. Open `index.html` in your browser
3. Enter your SIP details:
   - SIP Server IP: Your softswitch IP (e.g., 192.168.1.100)
   - SIP Port: 5060 (default)
   - Username: Your SIP extension
   - Password: Your SIP password
4. Click "Connect"
5. Make a test call

## Notes

- This is a **proof of concept** for traditional SIP connectivity
- **Audio quality** may vary depending on network conditions
- For **production**, use a proper SIP-to-WebSocket gateway like Asterisk or FreeSWITCH
- **RTP audio streaming** from backend to browser requires additional setup

## Recommended Production Solution

Instead of this custom backend, configure your SIP server for WebSocket:

### Best Option: Asterisk with WebSocket Support
```ini
; pjsip.conf
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

; Then use the original JsSIP frontend code
```

This provides:
- Native WebRTC support
- Better performance
- Industry-standard solution
- Full feature support (call transfer, conferencing, etc.)

See `SERVER_SETUP.md` in the parent directory for full configuration details.
