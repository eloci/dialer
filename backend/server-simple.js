const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Store active sessions
const sessions = new Map();

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

console.log('\n==============================================');
console.log('SIP DIALER BACKEND SERVER');
console.log('==============================================\n');
console.log(`✓ WebSocket server: ws://localhost:${WS_PORT}`);
console.log(`✓ HTTP server: http://localhost:${PORT}`);
console.log('\n⚠️  IMPORTANT NOTICE:');
console.log('==============================================');
console.log('This is a DEMONSTRATION backend that shows how');
console.log('a WebSocket-to-SIP bridge would work.\n');
console.log('For PRODUCTION use with traditional SIP servers,');
console.log('you have TWO OPTIONS:\n');
console.log('OPTION 1 (RECOMMENDED):');
console.log('  Configure your SIP server to support WebSocket');
console.log('  - Asterisk: Enable WebSocket in pjsip.conf');
console.log('  - FreeSWITCH: Enable mod_verto');
console.log('  - See SERVER_SETUP.md for details\n');
console.log('OPTION 2:');
console.log('  Use a production SIP proxy like:');
console.log('  - Kamailio with WebSocket module');
console.log('  - OpenSIPS with WebSocket');
console.log('  - Drachtio server with drachtio-srf\n');
console.log('==============================================\n');

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const sessionId = Date.now().toString();
  console.log(`[${sessionId}] New WebSocket connection`);

  sessions.set(sessionId, {
    ws: ws,
    registered: false,
    config: null
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[${sessionId}] Received: ${data.type}`);

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
        default:
          console.log(`[${sessionId}] Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error(`[${sessionId}] Error processing message:`, error.message);
      sendToClient(sessionId, {
        type: 'error',
        message: 'Server error: ' + error.message
      });
    }
  });

  ws.on('close', () => {
    console.log(`[${sessionId}] WebSocket connection closed`);
    sessions.delete(sessionId);
  });

  ws.on('error', (error) => {
    console.error(`[${sessionId}] WebSocket error:`, error.message);
  });
});

// Handle SIP Registration (Simulation)
function handleRegister(sessionId, data) {
  const session = sessions.get(sessionId);
  const { username, password, sipServer, port, realm } = data;

  console.log(`[${sessionId}] Registration request:`);
  console.log(`  - SIP Server: ${sipServer}:${port}`);
  console.log(`  - Username: ${username}`);
  console.log(`  - Realm: ${realm || sipServer}`);

  session.config = {
    username,
    password,
    sipServer,
    port: port || 5060,
    realm: realm || sipServer
  };

  // SIMULATION: In a real implementation, this would:
  // 1. Create a SIP socket connection to sipServer:port
  // 2. Send a REGISTER message with authentication
  // 3. Handle the response

  console.log(`[${sessionId}] ⚠️  SIMULATION MODE:`);
  console.log(`[${sessionId}] Would connect to ${sipServer}:${port}`);
  console.log(`[${sessionId}] Would send SIP REGISTER for ${username}`);

  // Simulate success after 1 second
  setTimeout(() => {
    session.registered = true;
    sendToClient(sessionId, {
      type: 'registered',
      message: 'Simulated registration successful'
    });

    console.log(`[${sessionId}] ✓ Simulated registration complete`);
    console.log(`[${sessionId}] ℹ️  To connect to a REAL SIP server:`);
    console.log(`[${sessionId}]    1. Configure your SIP server for WebSocket support`);
    console.log(`[${sessionId}]    2. Use the original JsSIP frontend`);
    console.log(`[${sessionId}]    3. See SERVER_SETUP.md for instructions`);
  }, 1000);
}

// Handle outgoing call (Simulation)
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
  console.log(`[${sessionId}] Call request to: ${number}`);

  // SIMULATION: In a real implementation, this would:
  // 1. Send SIP INVITE to the number
  // 2. Negotiate SDP for media
  // 3. Establish RTP streams for audio

  console.log(`[${sessionId}] ⚠️  SIMULATION MODE:`);
  console.log(`[${sessionId}] Would send SIP INVITE to ${number}`);

  // Simulate ringing
  setTimeout(() => {
    sendToClient(sessionId, { type: 'ringing' });
    console.log(`[${sessionId}] Simulated: Ringing...`);
  }, 500);

  // Simulate call connection
  setTimeout(() => {
    sendToClient(sessionId, {
      type: 'callEstablished',
      sdp: 'simulated-sdp'
    });
    console.log(`[${sessionId}] ✓ Simulated: Call connected`);
    console.log(`[${sessionId}] ℹ️  Real audio would require RTP setup`);
  }, 3000);
}

// Handle hangup
function handleHangup(sessionId, data) {
  console.log(`[${sessionId}] Hangup request`);

  // SIMULATION: Would send SIP BYE message
  sendToClient(sessionId, { type: 'callEnded' });
  console.log(`[${sessionId}] ✓ Call ended`);
}

// Helper function to send messages to client
function sendToClient(sessionId, message) {
  const session = sessions.get(sessionId);
  if (session && session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(JSON.stringify(message));
  }
}

// HTTP server for serving frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/status', (req, res) => {
  res.json({
    status: 'running',
    mode: 'simulation',
    connections: sessions.size,
    message: 'This is a demonstration server. For production use, configure your SIP server for WebSocket support.'
  });
});

app.listen(PORT, () => {
  console.log('Server ready! Open http://localhost:' + PORT + ' in your browser\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down gracefully...');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});
