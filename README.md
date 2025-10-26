# Production SIP Dialer Application with AI Voice & Authentication

A production-ready web-based dialer application for making real VoIP calls through a SIP softswitch using JsSIP and WebRTC, with AI voice capabilities and user authentication.

## 🎯 Features

- **🔐 User Authentication**: Secure login/register system with JWT
- **Real SIP Integration**: Uses JsSIP library for actual SIP communication
- **WebRTC Audio**: Full duplex audio calling with WebRTC
- **🤖 AI Voice Assistant**: OpenAI-powered conversational AI
- **🎤 Speech Recognition**: Browser & OpenAI Whisper support
- **🔊 Text-to-Speech**: OpenAI TTS with 6 premium voices
- **Softswitch Configuration**: WebSocket-based SIP connection
- **Connection Management**: Connect/Disconnect from SIP server with registration
- **Predefined Numbers**: Add, manage, and store phone numbers locally
- **Call Management**: 
  - Make and receive calls
  - Mute/Unmute microphone
  - Volume control
  - Call duration tracking
- **Call History**: Track all calls with duration, status, and timestamps
- **Multi-user Support**: SQLite database for user management
- **Incoming Calls**: Handles incoming calls with accept/reject prompts

## 📋 Requirements

### Backend Requirements
- Node.js 16+ installed
- SQLite3 (auto-installed)
- SIP account credentials
- OpenAI API key (for AI features)

### SIP Server Requirements

Your SIP softswitch MUST support:
1. **WebSocket Transport** (ws:// or wss://)
2. **WebRTC** (required for browser-based audio)
3. **STUN/TURN servers** (for NAT traversal)

### Popular SIP Servers that work:

- **Asterisk** (with `chan_pjsip` and WebSocket support)
- **FreeSWITCH** (with `mod_verto` or WebSocket)
- **Kamailio** (with WebSocket module)
- **OpenSIPS** (with WebSocket support)

### Browser Requirements

- Modern browser with WebRTC support:
  - Chrome 70+
  - Firefox 65+
  - Edge 79+
  - Safari 14.1+
- Microphone access permission

## 🚀 Quick Start

### 1. Configure Your SIP Server

Your SIP server must have WebSocket support enabled. Example for Asterisk:

```ini
; In pjsip.conf
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089

[transport-ws]
type=transport
protocol=ws
bind=0.0.0.0:8088
```

### 2. Open the Application

Simply open `index.html` in your web browser (preferably over HTTPS).

### 3. Configure Connection

Fill in the connection details:

- **SIP Server**: `wss://your-server.com:8089` or `ws://your-server.com:8088`
  - Use `wss://` for secure WebSocket (recommended)
  - Use `ws://` for non-secure WebSocket (testing only)
- **Username/Extension**: Your SIP username (e.g., `1001`)
- **Password**: Your SIP password
- **Realm** (optional): Your SIP domain (e.g., `yourdomain.com`)

### 4. Connect

Click **Connect** button. You should see:
- "Connecting..." → "Connected & Registered"

### 5. Make Calls

- Add phone numbers or use the default test numbers
- Click **📞 Call** button
- Wait for the call to connect
- Use **Mute** and **Hang Up** buttons during the call
- Adjust volume with the slider

## 🔧 Configuration Examples

### Example 1: FreeSWITCH
```
SIP Server: wss://freeswitch.example.com:7443
Username: 1001
Password: your-password
Realm: freeswitch.example.com
```

### Example 2: Asterisk
```
SIP Server: wss://asterisk.example.com:8089
Username: 1001
Password: your-password
Realm: asterisk.example.com
```

### Example 3: Local Testing
```
SIP Server: ws://192.168.1.100:8088
Username: 1001
Password: 1234
Realm: (leave empty or use local domain)
```

## 🎵 Audio Features

### During Active Call:
- **Mute/Unmute**: Toggle your microphone
- **Volume Control**: Adjust incoming audio volume (0-100%)
- **Auto-play**: Remote audio plays automatically

### Audio Elements:
- Ringback tone plays while calling
- Remote audio plays when connected
- All audio stops when call ends

## 📊 Call States

1. **Calling...** - Initiating call, ringback tone playing
2. **Ringing...** - Remote party is ringing
3. **Call Connected** - Two-way audio active
4. **No active call** - Call ended or idle

## 🛠️ Troubleshooting

### Connection Issues

**"Registration Failed"**
- Check SIP server URL (must start with ws:// or wss://)
- Verify username and password
- Ensure WebSocket port is open on firewall
- Check if SIP server has WebSocket enabled

**"WebSocket disconnected"**
- SIP server may be down
- Network connectivity issue
- Firewall blocking WebSocket connection

### Audio Issues

**No audio during call**
- Grant microphone permission to browser
- Check browser console for errors
- Verify WebRTC is supported
- Check STUN/TURN server configuration

**Echo or feedback**
- Use headphones
- Enable echo cancellation in browser settings
- Adjust microphone sensitivity

**One-way audio**
- NAT/Firewall issue - configure STUN/TURN servers
- Check codec compatibility
- Verify RTP ports are open

### Call Issues

**Calls don't connect**
- Verify you're registered (status shows "Connected & Registered")
- Check if number format is correct for your SIP server
- Review browser console for error messages
- Ensure destination is valid and reachable

## 🔒 Security Recommendations

### For Production Deployment:

1. **Use HTTPS**: Host the application over HTTPS
2. **Use WSS**: Always use secure WebSocket (wss://)
3. **Strong Passwords**: Use complex SIP passwords
4. **CORS Policy**: Configure proper CORS headers on SIP server
5. **Rate Limiting**: Implement call rate limiting
6. **Authentication**: Add application-level authentication
7. **SSL Certificates**: Use valid SSL certificates
8. **Network Security**: 
   - Use VPN for remote access
   - Implement IP whitelisting
   - Configure firewall rules

## 📱 Incoming Calls

The dialer automatically handles incoming calls:
- Browser alert prompts to accept/reject
- Accepted calls follow same flow as outgoing calls
- Rejected calls are terminated immediately
- Only one active call at a time

## 💾 Data Storage

All data stored in browser's localStorage:
- **Predefined numbers**: Persistent across sessions
- **Call history**: Last 50 calls
- **Configuration**: SIP server, username, realm (password NOT stored)

## 🌐 Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 70+ | ✅ Full |
| Firefox | 65+ | ✅ Full |
| Edge | 79+ | ✅ Full |
| Safari | 14.1+ | ✅ Full |
| Opera | 57+ | ✅ Full |

## 📚 Technical Stack

- **JsSIP 3.10.1**: SIP protocol implementation
- **WebRTC**: Real-time audio communication
- **WebSocket**: SIP signaling transport
- **HTML5 Audio API**: Audio playback and control
- **LocalStorage API**: Data persistence

## 🐛 Debug Mode

Open browser console (F12) to see:
- Connection events
- Registration status
- Call progress
- WebRTC peer connection details
- Error messages

## 🌐 Deployment to Free Server

### Option 1: Render.com (Recommended - Easiest)

1. **Create Render account**: Go to [render.com](https://render.com) and sign up (free)

2. **Push code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit with auth"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

3. **Create New Web Service** on Render:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: `dialer-app`
     - **Build Command**: `cd backend && npm install`
     - **Start Command**: `cd backend && node server.js`
     - **Environment**: Node
     - **Plan**: Free

4. **Add Environment Variables** in Render dashboard:
   - `OPENAI_API_KEY`: Your OpenAI key
   - `JWT_SECRET`: Any random string (e.g., `mySecretKey123!`)
   - `PORT`: 10000 (Render uses this)

5. **Deploy**: Click "Create Web Service"

🎉 Your app will be live at: `https://dialer-app.onrender.com`

**Note**: Free plan sleeps after 15min inactivity, takes ~30s to wake up.

### Option 2: Railway.app

1. **Create account**: [railway.app](https://railway.app) (free $5 credit)
2. **New Project** → "Deploy from GitHub repo"
3. **Configure**:
   - Start command: `cd backend && node server.js`
   - Add environment variables (same as Render)
4. **Deploy** - auto-deploys on push

🎉 Live at: `https://your-app.railway.app`

### Option 3: Fly.io (Advanced)

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Launch
fly launch --name dialer-app

# Set secrets
fly secrets set OPENAI_API_KEY=your_key JWT_SECRET=your_secret

# Deploy
fly deploy
```

🎉 Live at: `https://dialer-app.fly.dev`

### Post-Deployment Checklist

✅ Change default admin password (admin/admin123)
✅ Add your SIP credentials in Configuration tab
✅ Test login/register functionality
✅ Test calling functionality
✅ Set up OpenAI API key for AI features

## 🔒 Security Notes

- ⚠️ **Change admin password** immediately in production
- ⚠️ Use **strong JWT_SECRET** (random 32+ character string)
- ⚠️ Never commit `.env` file to Git
- ✅ HTTPS automatically provided by Render/Railway/Fly
- ✅ Database (SQLite) stored on server filesystem

## � Database Management

- **Location**: `backend/dialer.db` (auto-created)
- **Backup**: Download from server periodically
- **Tables**: users, user_settings, call_logs

## 📦 Local Development

```bash
# Install dependencies
cd backend
npm install

# Create .env file
echo "OPENAI_API_KEY=your_key
JWT_SECRET=dev_secret_key
PORT=3000" > .env

# Run server
node server.js

# Open browser
open http://localhost:3000
```

**Default login**: admin / admin123

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **WebRTC**: JsSIP
- **Database**: SQLite3
- **Authentication**: JWT + bcrypt
- **AI**: OpenAI (GPT-4, Whisper, TTS)
- **Real-time**: WebSocket

## �📄 License

This is a production-ready application. Customize as needed for your use case.

## 🤝 Support

For issues:
1. Check browser console for errors
2. Verify SIP server configuration
3. Test with SIP client (like Zoiper) to rule out server issues
4. Review firewall and network settings
5. For auth issues, check backend logs

## 🚀 Next Steps

To deploy in production:
1. Host on HTTPS server
2. Configure your SIP server for WebSocket + WebRTC
3. Set up STUN/TURN servers for NAT traversal
4. Implement user authentication
5. Add monitoring and logging
6. Test across different networks and browsers
