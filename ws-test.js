// WebSocket test with SIP subprotocol
const WebSocket = require('ws');

console.log('Attempting WebSocket connection to ws://localhost:8088/ws with "sip" subprotocol...');

const ws = new WebSocket('ws://localhost:8088/ws', 'sip');

ws.on('open', () => {
  console.log('✅ WebSocket OPEN - connection established!');
  console.log('Sending SIP OPTIONS request...');
  ws.send('OPTIONS sip:localhost SIP/2.0\r\nVia: SIP/2.0/WS localhost;branch=z9hG4bK123456\r\nFrom: <sip:test@localhost>;tag=1234\r\nTo: <sip:localhost>\r\nCall-ID: test123@localhost\r\nCSeq: 1 OPTIONS\r\nMax-Forwards: 70\r\nContent-Length: 0\r\n\r\n');
});

ws.on('error', (err) => {
  console.error('❌ WebSocket ERROR:', err.message);
  console.error('Full error:', err);
});

ws.on('close', (code, reason) => {
  console.log(`❌ WebSocket CLOSE: Code=${code}, Reason="${reason.toString()}"`);
  if (code === 1006) {
    console.log('Error 1006 = Connection closed abnormally (server rejected handshake or closed immediately)');
  }
  process.exit(code === 1000 ? 0 : 1);
});

ws.on('message', (data) => {
  console.log('📨 WebSocket MESSAGE received:');
  console.log(data.toString());
});

// Timeout after 5 seconds
setTimeout(() => {
  if (ws.readyState !== WebSocket.OPEN) {
    console.log('⏱️ Timeout - connection did not open within 5 seconds');
    ws.close();
    process.exit(1);
  }
}, 5000);
