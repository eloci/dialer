const express = require('express');
const WebSocket = require('ws');
const sip = require('sip');
const cors = require('cors');
const path = require('path');
const dgram = require('dgram');
const cookieParser = require('cookie-parser');

// Load .env file from the backend directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Import authentication modules
const { userDB } = require('./database');
const { generateToken, verifyToken, requireAuth, optionalAuth } = require('./auth');

// Debug: Check if API key is loaded
console.log('[DEBUG] OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 20)}... (${process.env.OPENAI_API_KEY.length} chars)` : 'NOT FOUND');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..')));

// Store active sessions
const sessions = new Map();
const sipStack = new Map();

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const user = await userDB.register(username, email, password);
    console.log('✅ New user registered:', username);

    res.json({
      success: true,
      message: 'Registration successful',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(400).json({ error: error.message });
  }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await userDB.login(username, password);
    const token = generateToken(user);

    console.log('✅ User logged in:', username);

    res.json({
      success: true,
      token: token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: error.message });
  }
});

// Verify token
app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

  if (!token) {
    return res.json({ valid: false });
  }

  const decoded = verifyToken(token);
  if (decoded) {
    res.json({ valid: true, user: decoded });
  } else {
    res.json({ valid: false });
  }
});

// Get current user info
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await userDB.getUserById(req.user.id);
    if (user) {
      res.json({ user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Logout (client-side will remove token)
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get user settings
app.get('/api/settings', requireAuth, async (req, res) => {
  try {
    const settings = await userDB.getUserSettings(req.user.id);
    res.json({ settings: settings || {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save user settings
app.post('/api/settings', requireAuth, async (req, res) => {
  try {
    await userDB.saveUserSettings(req.user.id, req.body);
    res.json({ success: true, message: 'Settings saved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// END AUTHENTICATION ROUTES
// ============================================

// Start SIP stack
const sipPort = 5070; // Local port for SIP communication
sip.start({
  port: sipPort,
  udp: true,
  tcp: false
}, (request) => {
  console.log('Incoming SIP request:', request.method);
  handleIncomingSipRequest(request);
});

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`WebSocket server running on port ${WS_PORT}`);

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const sessionId = Date.now().toString();
  console.log(`New WebSocket connection: ${sessionId}`);

  sessions.set(sessionId, {
    ws: ws,
    sipSession: null,
    registered: false,
    config: null
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('Received:', data.type);

      switch (data.type) {
        case 'register':
          handleRegister(sessionId, data);
          break;
        case 'call':
          handleCall(sessionId, data);
          break;
        case 'hangup':
          handleHangup(sessionId, data);
          break;
        case 'answer':
          handleAnswer(sessionId, data);
          break;
        case 'dtmf':
          handleDTMF(sessionId, data);
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      sendToClient(sessionId, { type: 'error', message: error.message });
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket connection closed: ${sessionId}`);
    cleanupSession(sessionId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle incoming SIP requests
function handleIncomingSipRequest(request) {
  console.log('SIP Request:', request.method, request.uri);

  if (request.method === 'OPTIONS') {
    // Respond to OPTIONS (keep-alive)
    sip.send({
      method: 'OPTIONS',
      uri: request.headers.contact[0].uri,
      headers: {
        to: request.headers.from,
        from: request.headers.to,
        'call-id': request.headers['call-id'],
        cseq: { method: 'OPTIONS', seq: request.headers.cseq.seq },
        via: request.headers.via
      }
    });
  }
  // Handle other incoming requests (INVITE, etc.)
}

// SIP Registration
function handleRegister(sessionId, data) {
  const session = sessions.get(sessionId);
  const { username, password, sipServer, port } = data;

  session.config = {
    username,
    password,
    sipServer,
    port: port || 5060,
    domain: data.realm || sipServer
  };

  const localIP = getLocalIP();
  const sipUri = `sip:${username}@${session.config.domain}`;
  const contact = `sip:${username}@${localIP}:${sipPort}`;

  // Send REGISTER request using sip.send
  const registerRequest = {
    method: 'REGISTER',
    uri: `sip:${session.config.domain}`,
    headers: {
      to: { uri: sipUri },
      from: { uri: sipUri, params: { tag: generateTag() } },
      'call-id': generateCallId(),
      cseq: { seq: 1, method: 'REGISTER' },
      contact: [{ uri: contact }],
      expires: 3600,
      via: []
    }
  };

  try {
    sip.send(registerRequest, (response) => {
      if (!response) {
        console.error('No response from SIP server');
        sendToClient(sessionId, {
          type: 'registrationFailed',
          message: 'No response from SIP server. Check IP address and connectivity.'
        });
        return;
      }

      console.log('REGISTER response:', response.status);

      if (response.status === 200) {
        session.registered = true;
        session.callId = registerRequest.headers['call-id'];
        sendToClient(sessionId, {
          type: 'registered',
          message: 'Successfully registered to SIP server'
        });
      } else if (response.status === 401 || response.status === 407) {
        // Handle authentication challenge
        handleAuthChallenge(sessionId, registerRequest, response);
      } else {
        sendToClient(sessionId, {
          type: 'registrationFailed',
          message: `Registration failed: ${response.status} ${response.reason || 'Unknown error'}`
        });
      }
    });
  } catch (error) {
    console.error('Error sending REGISTER:', error);
    sendToClient(sessionId, {
      type: 'registrationFailed',
      message: `Error: ${error.message}`
    });
  }
}// Handle SIP authentication challenge
function handleAuthChallenge(sessionId, originalRequest, response) {
  const session = sessions.get(sessionId);
  const wwwAuth = response.headers['www-authenticate'] || response.headers['proxy-authenticate'];

  if (!wwwAuth) {
    sendToClient(sessionId, {
      type: 'registrationFailed',
      message: 'Authentication required but no challenge received'
    });
    return;
  }

  // Parse authentication parameters
  const authParams = parseAuthHeader(wwwAuth);
  const authHeader = generateAuthHeader(
    session.config.username,
    session.config.password,
    originalRequest.method,
    originalRequest.uri,
    authParams
  );

  // Resend request with authorization
  originalRequest.headers.cseq.seq++;
  originalRequest.headers.authorization = authHeader;

  sip.send(originalRequest, (response) => {
    if (response.status === 200) {
      session.registered = true;
      sendToClient(sessionId, {
        type: 'registered',
        message: 'Successfully registered to SIP server'
      });
    } else {
      sendToClient(sessionId, {
        type: 'registrationFailed',
        message: `Registration failed: ${response.status} ${response.reason}`
      });
    }
  });
}

// Make outgoing call
function handleCall(sessionId, data) {
  const session = sessions.get(sessionId);

  if (!session.registered) {
    sendToClient(sessionId, {
      type: 'callFailed',
      message: 'Not registered to SIP server'
    });
    return;
  }

  const { number } = data;
  const callUri = `sip:${number}@${session.config.domain}`;
  const fromUri = `sip:${session.config.username}@${session.config.domain}`;

  const inviteRequest = {
    method: 'INVITE',
    uri: callUri,
    headers: {
      to: { uri: callUri },
      from: { uri: fromUri, params: { tag: generateTag() } },
      'call-id': generateCallId(),
      cseq: { seq: 1, method: 'INVITE' },
      contact: [{ uri: fromUri }],
      'content-type': 'application/sdp'
    },
    content: generateSDP(sessionId)
  };

  session.callId = inviteRequest.headers['call-id'];

  sip.send(inviteRequest, (response) => {
    console.log('INVITE response:', response.status);

    if (response.status === 100 || response.status === 180) {
      sendToClient(sessionId, { type: 'ringing' });
    } else if (response.status === 200) {
      sendToClient(sessionId, {
        type: 'callEstablished',
        sdp: response.content
      });
      // Send ACK
      sendAck(sessionId, inviteRequest, response);
    } else if (response.status === 401 || response.status === 407) {
      handleCallAuthChallenge(sessionId, inviteRequest, response);
    } else {
      sendToClient(sessionId, {
        type: 'callFailed',
        message: `Call failed: ${response.status} ${response.reason}`
      });
    }
  });
}

// Handle call authentication
function handleCallAuthChallenge(sessionId, originalRequest, response) {
  const session = sessions.get(sessionId);
  const wwwAuth = response.headers['www-authenticate'] || response.headers['proxy-authenticate'];

  const authParams = parseAuthHeader(wwwAuth);
  const authHeader = generateAuthHeader(
    session.config.username,
    session.config.password,
    originalRequest.method,
    originalRequest.uri,
    authParams
  );

  originalRequest.headers.cseq.seq++;
  originalRequest.headers.authorization = authHeader;

  sip.send(originalRequest, (response) => {
    if (response.status === 100 || response.status === 180) {
      sendToClient(sessionId, { type: 'ringing' });
    } else if (response.status === 200) {
      sendToClient(sessionId, {
        type: 'callEstablished',
        sdp: response.content
      });
      sendAck(sessionId, originalRequest, response);
    } else {
      sendToClient(sessionId, {
        type: 'callFailed',
        message: `Call failed: ${response.status} ${response.reason}`
      });
    }
  });
}

// Send ACK
function sendAck(sessionId, inviteRequest, response) {
  const ackRequest = {
    method: 'ACK',
    uri: inviteRequest.uri,
    headers: {
      to: response.headers.to,
      from: inviteRequest.headers.from,
      'call-id': inviteRequest.headers['call-id'],
      cseq: { seq: inviteRequest.headers.cseq.seq, method: 'ACK' },
      via: inviteRequest.headers.via
    }
  };

  sip.send(ackRequest);
}

// Hangup call
function handleHangup(sessionId, data) {
  const session = sessions.get(sessionId);

  if (!session.callId) {
    return;
  }

  const byeRequest = {
    method: 'BYE',
    uri: `sip:${session.config.domain}`,
    headers: {
      'call-id': session.callId,
      cseq: { seq: 2, method: 'BYE' }
    }
  };

  sip.send(byeRequest, (response) => {
    console.log('BYE response:', response.status);
    sendToClient(sessionId, { type: 'callEnded' });
  });

  session.callId = null;
}

// Handle answer (for incoming calls)
function handleAnswer(sessionId, data) {
  // Implementation for answering incoming calls
  console.log('Answer call:', sessionId);
}

// Handle DTMF
function handleDTMF(sessionId, data) {
  console.log('DTMF:', data.digit);
  // Send INFO request with DTMF
}

// Helper functions
function sendToClient(sessionId, message) {
  const session = sessions.get(sessionId);
  if (session && session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(JSON.stringify(message));
  }
}

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    if (session.callId) {
      handleHangup(sessionId, {});
    }
    sessions.delete(sessionId);
  }
}

function generateTag() {
  return Math.random().toString(36).substring(7);
}

function generateCallId() {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

function getLocalIP() {
  const nets = require('os').networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function generateSDP(sessionId) {
  const localIP = getLocalIP();
  const rtpPort = 10000 + parseInt(sessionId.slice(-4));

  return `v=0
o=- ${Date.now()} ${Date.now()} IN IP4 ${localIP}
s=SIP Call
c=IN IP4 ${localIP}
t=0 0
m=audio ${rtpPort} RTP/AVP 0 8 101
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:101 telephone-event/8000
a=sendrecv
`;
}

function parseAuthHeader(authHeader) {
  const params = {};
  const regex = /(\w+)=["']?([^,"']+)["']?/g;
  let match;
  while ((match = regex.exec(authHeader)) !== null) {
    params[match[1]] = match[2];
  }
  return params;
}

function generateAuthHeader(username, password, method, uri, authParams) {
  const crypto = require('crypto');

  const realm = authParams.realm;
  const nonce = authParams.nonce;
  const qop = authParams.qop;
  const algorithm = authParams.algorithm || 'MD5';

  const ha1 = crypto.createHash('md5')
    .update(`${username}:${realm}:${password}`)
    .digest('hex');

  const ha2 = crypto.createHash('md5')
    .update(`${method}:${uri}`)
    .digest('hex');

  const nc = '00000001';
  const cnonce = Math.random().toString(36).substring(7);

  const response = crypto.createHash('md5')
    .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    .digest('hex');

  return `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}", algorithm=${algorithm}, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
}

// Asterisk Configuration Management API
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// API endpoint to update Asterisk configuration
app.post('/api/asterisk/config', async (req, res) => {
  try {
    const {
      trunkHost,
      trunkPort,
      registerUser,
      registerPassword,
      callerId,
      codecs,
      webRTCPort
    } = req.body;

    console.log('[ASTERISK CONFIG] Received configuration update request');

    // Validate inputs
    if (!trunkHost || !registerUser || !registerPassword) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Generate pjsip.conf
    const pjsipConfig = `; PJSIP Configuration for WebRTC Gateway
; Generated by SIP Dialer - ${new Date().toISOString()}

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:${webRTCPort || 8088}

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; Browser WebRTC Endpoint
[1001]
type=endpoint
context=from-internal
disallow=all
allow=${codecs || 'alaw,ulaw'}
webrtc=yes
dtls_auto_generate_cert=yes
media_encryption=dtls
dtls_verify=fingerprint
dtls_setup=actpass
ice_support=yes
media_use_received_transport=yes
rtcp_mux=yes
use_avpf=yes
force_rport=yes
rewrite_contact=yes
rtp_symmetric=yes
auth=1001
aors=1001

[1001]
type=auth
auth_type=userpass
username=1001
password=websecret

[1001]
type=aor
max_contacts=5
remove_existing=yes

; VOS3000 Registration
[vos3000-registration]
type=registration
transport=transport-udp
outbound_auth=vos3000-auth
server_uri=sip:${trunkHost}:${trunkPort || 5060}
client_uri=sip:${registerUser}@${trunkHost}:${trunkPort || 5060}
contact_user=${registerUser}
retry_interval=60
forbidden_retry_interval=600
expiration=3600
auth_rejection_permanent=no

[vos3000-auth]
type=auth
auth_type=userpass
username=${registerUser}
password=${registerPassword}

; VOS3000 Trunk Endpoint
[vos3000-endpoint]
type=endpoint
context=from-vos3000
disallow=all
allow=${codecs || 'alaw,ulaw'}
transport=transport-udp
from_user=${callerId || registerUser}
from_domain=${trunkHost}
aors=vos3000-aor
outbound_auth=vos3000-auth
direct_media=no
trust_id_inbound=yes
send_pai=yes

[vos3000-aor]
type=aor
contact=sip:${trunkHost}:${trunkPort || 5060}

; Identify incoming calls from VOS3000
[vos3000-identify]
type=identify
endpoint=vos3000-endpoint
match=${trunkHost}
`;

    // Generate extensions.conf
    const extensionsConfig = `; Dialplan Configuration
; Generated by SIP Dialer - ${new Date().toISOString()}

[from-internal]
; Route calls with + prefix
exten => _+.,1,NoOp(Dialing \${EXTEN})
same => n,Set(CALLERID(num)=${callerId || registerUser})
same => n,Dial(PJSIP/\${EXTEN}@vos3000-endpoint,60)
same => n,Hangup()

; Route regular numeric calls
exten => _X.,1,NoOp(Dialing \${EXTEN})
same => n,Set(CALLERID(num)=${callerId || registerUser})
same => n,Dial(PJSIP/\${EXTEN}@vos3000-endpoint,60)
same => n,Hangup()

[from-vos3000]
; Handle incoming calls from VOS3000
exten => _X.,1,NoOp(Incoming call from VOS3000: \${EXTEN})
same => n,Dial(PJSIP/1001)
same => n,Hangup()
`;

    // Write configuration files to the gateway directory
    const gatewayConfigPath = path.join(__dirname, '..', 'gateway', 'asterisk', 'config');

    // Ensure directory exists
    if (!fs.existsSync(gatewayConfigPath)) {
      fs.mkdirSync(gatewayConfigPath, { recursive: true });
    }

    fs.writeFileSync(path.join(gatewayConfigPath, 'pjsip.conf'), pjsipConfig);
    fs.writeFileSync(path.join(gatewayConfigPath, 'extensions.conf'), extensionsConfig);

    console.log('[ASTERISK CONFIG] Configuration files written successfully');

    // Try to reload Asterisk configuration via Docker
    try {
      console.log('[ASTERISK CONFIG] Attempting to reload Asterisk...');

      // Check if Docker is available
      const dockerPath = path.join(__dirname, '..', 'gateway', 'asterisk');

      // Reload PJSIP
      await execPromise('docker compose exec -T asterisk asterisk -rx "pjsip reload"', {
        cwd: dockerPath
      });

      // Reload dialplan
      await execPromise('docker compose exec -T asterisk asterisk -rx "dialplan reload"', {
        cwd: dockerPath
      });

      console.log('[ASTERISK CONFIG] Asterisk reloaded successfully');

      res.json({
        success: true,
        message: 'Configuration applied and Asterisk reloaded successfully',
        files: {
          pjsip: 'pjsip.conf',
          extensions: 'extensions.conf'
        }
      });

    } catch (reloadError) {
      console.error('[ASTERISK CONFIG] Failed to reload Asterisk:', reloadError.message);

      res.json({
        success: true,
        message: 'Configuration files updated, but automatic reload failed. Please restart Asterisk manually.',
        warning: reloadError.message,
        files: {
          pjsip: 'pjsip.conf',
          extensions: 'extensions.conf'
        }
      });
    }

  } catch (error) {
    console.error('[ASTERISK CONFIG] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to restart Asterisk
app.post('/api/asterisk/restart', async (req, res) => {
  try {
    console.log('[ASTERISK] Restarting Asterisk container...');

    const dockerPath = path.join(__dirname, '..', 'gateway', 'asterisk');

    // Restart the container
    await execPromise('docker compose restart asterisk', {
      cwd: dockerPath
    });

    console.log('[ASTERISK] Asterisk container restarted successfully');

    res.json({
      success: true,
      message: 'Asterisk container restarted successfully'
    });

  } catch (error) {
    console.error('[ASTERISK] Restart failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get Asterisk status
app.get('/api/asterisk/status', async (req, res) => {
  try {
    const dockerPath = path.join(__dirname, '..', 'gateway', 'asterisk');

    // Check container status
    const { stdout } = await execPromise('docker compose ps asterisk', {
      cwd: dockerPath
    });

    // Get PJSIP registration status
    let registrationStatus = 'Unknown';
    try {
      const { stdout: regStatus } = await execPromise('docker compose exec -T asterisk asterisk -rx "pjsip show registrations"', {
        cwd: dockerPath
      });
      registrationStatus = regStatus;
    } catch (e) {
      console.error('Could not get registration status:', e.message);
    }

    res.json({
      success: true,
      containerStatus: stdout,
      registrationStatus: registrationStatus
    });

  } catch (error) {
    console.error('[ASTERISK] Status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TTS Proxy endpoint to avoid CORS issues
app.get('/api/tts', async (req, res) => {
  try {
    const text = req.query.text || 'Hello';
    const speed = req.query.speed || '1';
    const lang = req.query.lang || 'en';

    // Use Google Translate TTS API
    const https = require('https');
    const encodedText = encodeURIComponent(text);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}&ttsspeed=${speed}`;

    console.log(`[TTS] Proxying request for: "${text.substring(0, 50)}..."`);

    // Fetch the audio from Google Translate
    https.get(ttsUrl, (response) => {
      if (response.statusCode !== 200) {
        console.error('[TTS] Failed to fetch from Google:', response.statusCode);
        res.status(response.statusCode).send('TTS service unavailable');
        return;
      }

      // Set proper headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

      // Pipe the audio response
      response.pipe(res);
    }).on('error', (error) => {
      console.error('[TTS] Error fetching audio:', error);
      res.status(500).send('TTS service error');
    });

  } catch (error) {
    console.error('[TTS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OpenAI TTS endpoint
app.post('/api/openai-tts', async (req, res) => {
  try {
    const { text, voice = 'alloy', model = 'tts-1', speed = 1.0 } = req.body;

    if (!text) {
      console.error('[OpenAI TTS] No text provided');
      return res.status(400).json({ error: 'Text is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.error('[OpenAI TTS] API key not configured properly');
      return res.status(500).json({ error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in backend/.env file' });
    }

    console.log(`[OpenAI TTS] Generating speech for: "${text.substring(0, 50)}..." with voice: ${voice}, model: ${model}, speed: ${speed}`);
    console.log(`[OpenAI TTS] Using API key: ${apiKey.substring(0, 10)}...`);

    // Make request to OpenAI TTS API
    const https = require('https');
    const postData = JSON.stringify({
      model: model,
      input: text,
      voice: voice,
      speed: speed,
      response_format: 'mp3'
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/audio/speech',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const openaiReq = https.request(options, (openaiRes) => {
      console.log(`[OpenAI TTS] Response status: ${openaiRes.statusCode}`);

      if (openaiRes.statusCode !== 200) {
        console.error('[OpenAI TTS] API error:', openaiRes.statusCode);
        let errorData = '';
        openaiRes.on('data', chunk => errorData += chunk);
        openaiRes.on('end', () => {
          console.error('[OpenAI TTS] Error details:', errorData);
          try {
            const errorJson = JSON.parse(errorData);
            res.status(openaiRes.statusCode).json({ error: errorJson.error?.message || 'OpenAI TTS failed' });
          } catch (e) {
            res.status(openaiRes.statusCode).json({ error: errorData || 'OpenAI TTS failed' });
          }
        });
        return;
      }

      // Set proper headers
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

      // Pipe the audio response
      openaiRes.pipe(res);
      console.log(`[OpenAI TTS] Audio generated successfully`);
    });

    openaiReq.on('error', (error) => {
      console.error('[OpenAI TTS] Request error:', error);
      res.status(500).json({ error: 'Failed to connect to OpenAI TTS: ' + error.message });
    });

    openaiReq.write(postData);
    openaiReq.end();

  } catch (error) {
    console.error('[OpenAI TTS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Set up multer for file uploads (move outside the route)
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// OpenAI Whisper Transcription endpoint
app.post('/api/whisper-transcribe', upload.single('audio'), async (req, res) => {
  const FormData = require('form-data');

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const language = req.body.language || 'en';
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log(`[WHISPER] Transcribing audio (${req.file.size} bytes) in language: ${language}`);

    // Create form data for OpenAI API
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'audio.webm',
      contentType: req.file.mimetype || 'audio/webm'
    });
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'json');

    // Make request to OpenAI Whisper API
    const https = require('https');
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/audio/transcriptions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders()
      }
    };

    const whisperReq = https.request(options, (whisperRes) => {
      let data = '';

      whisperRes.on('data', (chunk) => {
        data += chunk;
      });

      whisperRes.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (whisperRes.statusCode === 200) {
            console.log(`[WHISPER] Transcribed: "${result.text}"`);
            res.json({ text: result.text });
          } else {
            console.error('[WHISPER] API error:', result);
            res.status(whisperRes.statusCode).json({ error: result.error || 'Transcription failed' });
          }
        } catch (parseError) {
          console.error('[WHISPER] Parse error:', parseError, 'Data:', data);
          res.status(500).json({ error: 'Failed to parse Whisper response' });
        }
      });
    });

    whisperReq.on('error', (error) => {
      console.error('[WHISPER] Request error:', error);
      res.status(500).json({ error: 'Failed to connect to OpenAI Whisper' });
    });

    // Send the form data
    formData.pipe(whisperReq);

  } catch (error) {
    console.error('[WHISPER] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Favicon endpoint to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content
});

// HTTP server for serving frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`HTTP server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);
  console.log('\nConfiguration:');
  console.log('- Frontend will connect to ws://localhost:' + WS_PORT);
  console.log('- Backend will connect to your SIP server via UDP/TCP on port 5060');
  console.log('- TTS proxy available at http://localhost:' + PORT + '/api/tts');
});
