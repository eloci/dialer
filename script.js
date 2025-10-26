// Application State
let state = {
  connected: false,
  activeCalls: [],  // Array to store multiple active calls
  listeningToCallId: null,  // Which call audio is currently active
  userAgent: null,
  localStream: null,
  config: {
    sipServer: '',
    username: '',
    password: '',
    realm: ''
  },
  numbers: [],
  callHistory: [],
  isMuted: false,
  autoHangupConfig: {
    enabled: true,
    minSeconds: 180,  // 3 minutes
    maxSeconds: 240   // 4 minutes
  },
  autoDialer: {
    running: false,
    timer: null,
    countdownInterval: null,
    nextCallTime: null,
    selectedNumbers: [],
    currentIndex: 0,
    lastCallConnectTime: null
  }
};

// DOM Elements
const elements = {
  sipServer: document.getElementById('sipServer'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  realm: document.getElementById('realm'),
  connectBtn: document.getElementById('connectBtn'),
  disconnectBtn: document.getElementById('disconnectBtn'),
  connectionStatus: document.getElementById('connectionStatus'),
  newNumber: document.getElementById('newNumber'),
  newNumberLabel: document.getElementById('newNumberLabel'),
  newNumberMinDuration: document.getElementById('newNumberMinDuration'),
  newNumberMaxDuration: document.getElementById('newNumberMaxDuration'),
  addNumberBtn: document.getElementById('addNumberBtn'),
  excelFileInput: document.getElementById('excelFileInput'),
  importExcelBtn: document.getElementById('importExcelBtn'),
  importStatus: document.getElementById('importStatus'),
  callSelectedBtn: document.getElementById('callSelectedBtn'),
  selectAllBtn: document.getElementById('selectAllBtn'),
  deselectAllBtn: document.getElementById('deselectAllBtn'),
  batchMinDuration: document.getElementById('batchMinDuration'),
  batchMaxDuration: document.getElementById('batchMaxDuration'),
  numbersList: document.getElementById('numbersList'),
  callStatus: document.getElementById('callStatus'),
  activeCallsList: document.getElementById('activeCallsList'),
  hangupBtn: document.getElementById('hangupBtn'),
  muteBtn: document.getElementById('muteBtn'),
  volumeControl: document.getElementById('volumeControl'),
  callHistory: document.getElementById('callHistory'),
  remoteAudio: document.getElementById('remoteAudio'),
  ringbackTone: document.getElementById('ringbackTone'),
  holdMusic: document.getElementById('holdMusic'),
  autoHangupEnabled: document.getElementById('autoHangupEnabled'),
  autoHangupMin: document.getElementById('autoHangupMin'),
  autoHangupMax: document.getElementById('autoHangupMax'),
  autoDialerEnabled: document.getElementById('autoDialerEnabled'),
  autoDialerWorkingHoursStart: document.getElementById('autoDialerWorkingHoursStart'),
  autoDialerWorkingHoursEnd: document.getElementById('autoDialerWorkingHoursEnd'),
  autoDialerMinInterval: document.getElementById('autoDialerMinInterval'),
  autoDialerMaxInterval: document.getElementById('autoDialerMaxInterval'),
  autoDialerMaxActiveCalls: document.getElementById('autoDialerMaxActiveCalls'),
  startAutoDialerBtn: document.getElementById('startAutoDialerBtn'),
  stopAutoDialerBtn: document.getElementById('stopAutoDialerBtn'),
  autoDialerStatus: document.getElementById('autoDialerStatus'),
  autoDialerNumbersList: document.getElementById('autoDialerNumbersList'),
  autoDialerActiveCallsList: document.getElementById('autoDialerActiveCallsList'),
  activeCallsCount: document.getElementById('activeCallsCount'),
  ivrMessageEnabled: document.getElementById('ivrMessageEnabled'),
  ivrMessageText: document.getElementById('ivrMessageText'),
  ivrVoice: document.getElementById('ivrVoice'),
  ivrRepeat: document.getElementById('ivrRepeat'),
  ivrRate: document.getElementById('ivrRate'),
  ivrRateValue: document.getElementById('ivrRateValue'),
  ivrPitch: document.getElementById('ivrPitch'),
  ivrPitchValue: document.getElementById('ivrPitchValue'),
  testIvrBtn: document.getElementById('testIvrBtn'),
  asteriskTrunkHost: document.getElementById('asteriskTrunkHost'),
  asteriskTrunkPort: document.getElementById('asteriskTrunkPort'),
  asteriskRegisterUser: document.getElementById('asteriskRegisterUser'),
  asteriskRegisterPassword: document.getElementById('asteriskRegisterPassword'),
  asteriskCallerId: document.getElementById('asteriskCallerId'),
  asteriskCodecs: document.getElementById('asteriskCodecs'),
  asteriskWebRTCPort: document.getElementById('asteriskWebRTCPort'),
  applyAsteriskConfigBtn: document.getElementById('applyAsteriskConfigBtn'),
  regenerateAsteriskConfigBtn: document.getElementById('regenerateAsteriskConfigBtn'),
  restartAsteriskBtn: document.getElementById('restartAsteriskBtn'),
  asteriskConfigStatus: document.getElementById('asteriskConfigStatus'),
  pjsipConfigPreview: document.getElementById('pjsipConfigPreview'),
  extensionsConfigPreview: document.getElementById('extensionsConfigPreview')
};

// Load data from localStorage
function loadData() {
  const savedNumbers = localStorage.getItem('dialerNumbers');
  if (savedNumbers) {
    state.numbers = JSON.parse(savedNumbers);
  } else {
    // Add some default numbers
    state.numbers = [
      { number: '100', label: 'Test Number 1' },
      { number: '200', label: 'Test Number 2' },
      { number: '300', label: 'Test Number 3' },
      { number: '*97', label: 'Voicemail' }
    ];
  }

  const savedHistory = localStorage.getItem('dialerHistory');
  if (savedHistory) {
    state.callHistory = JSON.parse(savedHistory);
  }

  const savedConfig = localStorage.getItem('dialerConfig');
  if (savedConfig) {
    const config = JSON.parse(savedConfig);
    elements.sipServer.value = config.sipServer || 'wss://';
    elements.username.value = config.username || '';
    elements.realm.value = config.realm || '';
  }
}

// Save data to localStorage
function saveNumbers() {
  localStorage.setItem('dialerNumbers', JSON.stringify(state.numbers));
}

function saveHistory() {
  localStorage.setItem('dialerHistory', JSON.stringify(state.callHistory));
}

function saveConfig() {
  const config = {
    sipServer: elements.sipServer.value,
    username: elements.username.value,
    realm: elements.realm.value
  };
  localStorage.setItem('dialerConfig', JSON.stringify(config));
}

// Initialize JsSIP User Agent
function initUserAgent(sipServer, username, password, realm) {
  try {
    // Check if JsSIP is loaded
    if (typeof JsSIP === 'undefined') {
      throw new Error('JsSIP library not loaded. Please check your internet connection and refresh the page.');
    }

    // Create JsSIP URI
    const uri = `sip:${username}@${realm || sipServer.replace(/^wss?:\/\//, '').split(':')[0]}`;

    console.log('Initializing JsSIP with:', { sipServer, uri, username });

    const configuration = {
      sockets: [new JsSIP.WebSocketInterface(sipServer)],
      uri: uri,
      password: password,
      register: true,
      session_timers: false,
      register_expires: 600
    };

    console.log('JsSIP Configuration:', configuration);

    // Create user agent
    const ua = new JsSIP.UA(configuration);

    // Event handlers
    ua.on('connected', (e) => {
      console.log('✅ WebSocket connected successfully!', e);
    });

    ua.on('disconnected', (e) => {
      console.log('❌ WebSocket disconnected:', e);
      if (state.connected) {
        updateConnectionStatus('Disconnected', false);
      }
    });

    ua.on('registered', (e) => {
      console.log('✅ Successfully registered to SIP server');
      updateConnectionStatus('Connected & Registered', true);
    });

    ua.on('unregistered', (e) => {
      console.log('⚠️ Unregistered from SIP server');
    });

    ua.on('registrationFailed', (e) => {
      console.error('❌ Registration failed:', e.cause, e);
      updateConnectionStatus('Registration Failed: ' + e.cause, false);
    });

    ua.on('registrationFailed', (e) => {
      console.error('Registration failed:', e.cause);
      updateConnectionStatus(`Registration Failed: ${e.cause}`, false);
      elements.connectBtn.disabled = false;
      elements.disconnectBtn.disabled = true;
    });

    ua.on('newRTCSession', (e) => {
      const session = e.session;

      // Incoming call
      if (session.direction === 'incoming') {
        handleIncomingCall(session);
      }
    });

    return ua;
  } catch (error) {
    console.error('Error initializing User Agent:', error);
    alert('Error initializing SIP client: ' + error.message);
    return null;
  }
}

// Handle incoming calls
function handleIncomingCall(session) {
  if (state.activeSession) {
    session.terminate();
    return;
  }

  const callerNumber = session.remote_identity.uri.user;
  const callerName = session.remote_identity.display_name || callerNumber;

  if (confirm(`Incoming call from ${callerName} (${callerNumber})\n\nAnswer?`)) {
    state.activeSession = session;
    setupSessionHandlers(session);

    const answerOptions = {
      mediaConstraints: {
        audio: true,
        video: false
      }
    };

    session.answer(answerOptions);
  } else {
    session.terminate();
  }
}

// Update connection status
function updateConnectionStatus(message, isConnected) {
  state.connected = isConnected;
  elements.connectionStatus.textContent = message;
  elements.connectionStatus.classList.remove('connected', 'disconnected');
  elements.connectionStatus.classList.add(isConnected ? 'connected' : 'disconnected');

  if (isConnected) {
    elements.connectBtn.disabled = true;
    elements.disconnectBtn.disabled = false;
  } else {
    elements.connectBtn.disabled = false;
    elements.disconnectBtn.disabled = true;
  }
}

// Connect to Softswitch
function connect() {
  const sipServer = elements.sipServer.value.trim();
  const username = elements.username.value.trim();
  const password = elements.password.value.trim();
  const realm = elements.realm.value.trim();

  if (!sipServer || !username || !password) {
    alert('Please fill in SIP Server, Username, and Password');
    return;
  }

  if (!sipServer.startsWith('ws://') && !sipServer.startsWith('wss://')) {
    alert('SIP Server must start with ws:// or wss://');
    return;
  }

  // Save config
  state.config = { sipServer, username, password, realm };
  saveConfig();

  elements.connectionStatus.textContent = 'Connecting...';
  elements.connectBtn.disabled = true;

  try {
    state.userAgent = initUserAgent(sipServer, username, password, realm);

    if (state.userAgent) {
      state.userAgent.start();
      console.log('User Agent started, attempting to register...');

      // Warm up WebRTC: prefetch microphone and pre-gather ICE to reduce call setup time
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((stream) => {
          state.localStream = stream;
          console.log('Microphone stream acquired for faster call setup');
        })
        .catch((err) => {
          console.warn('Could not pre-acquire microphone:', err?.message || err);
        });
    } else {
      elements.connectBtn.disabled = false;
    }
  } catch (error) {
    console.error('Connection error:', error);
    alert('Failed to connect: ' + error.message);
    elements.connectBtn.disabled = false;
    elements.connectionStatus.textContent = 'Connection Failed';
  }
}

// Disconnect from SIP server
function disconnect() {
  if (state.activeSession) {
    hangup();
  }

  if (state.userAgent) {
    state.userAgent.stop();
    state.userAgent = null;
  }

  updateConnectionStatus('Not Connected', false);
  console.log('Disconnected from SIP server');
}

// Make a call
function makeCall(number, label, numberIndex) {
  if (!state.connected) {
    alert('Please connect to the SIP server first!');
    return;
  }

  if (!state.userAgent) {
    alert('User agent not initialized!');
    return;
  }

  console.log('Making call to:', number, `(Active calls: ${state.activeCalls.length})`);

  // Normalize number: keep digits and + sign
  const normalizedNumber = number.replace(/[^\d+]/g, '');

  console.log('Normalized number for SIP:', normalizedNumber);

  // Get duration settings for this number
  let minDuration = state.autoHangupConfig.minSeconds;
  let maxDuration = state.autoHangupConfig.maxSeconds;

  if (numberIndex !== undefined && state.numbers[numberIndex]) {
    const numberConfig = state.numbers[numberIndex];
    minDuration = numberConfig.minDuration || minDuration;
    maxDuration = numberConfig.maxDuration || maxDuration;
  }

  const callData = {
    id: Date.now() + Math.random(),  // Unique ID for this call
    number: normalizedNumber,
    label,
    numberIndex,  // Store index to update stats later
    startTime: new Date(),
    status: 'calling',
    minDuration,
    maxDuration,
    session: null,
    autoHangupTimer: null,
    callTimerInterval: null,
    countdownInterval: null,
    startTime: new Date() // Track when call attempt started
  };

  console.log('[TIMING] Call initiated at', Date.now());

  const callOptions = {
    // If we have a pre-acquired microphone stream, use it to avoid getUserMedia delay
    mediaStream: state.localStream || undefined,
    mediaConstraints: state.localStream ? undefined : { audio: true, video: false },
    pcConfig: {
      // Remove STUN servers - they cause 40s delay in ICE gathering
      // Asterisk is on localhost, we don't need ICE/STUN
      iceServers: [],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    },
    rtcOfferConstraints: {
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    }
  };

  try {
    console.log('[TIMING] Calling JsSIP.call() at', Date.now());
    const session = state.userAgent.call(`sip:${normalizedNumber}@${state.config.realm || state.config.sipServer.replace(/^wss?:\/\//, '').split(':')[0]}`, callOptions);
    console.log('[TIMING] JsSIP.call() returned at', Date.now());

    callData.session = session;
    state.activeCalls.push(callData);

    updateCallDisplay();
    setupSessionHandlers(session, callData);
  } catch (error) {
    console.error('Error making call:', error);
    alert('Failed to make call: ' + error.message);
    updateCallDisplay();
  }
}

// Update call display to show active calls count
function updateCallDisplay() {
  const activeCount = state.activeCalls.length;

  if (activeCount === 0) {
    elements.callStatus.textContent = 'No active calls';
    elements.callStatus.classList.remove('calling', 'connected');
    elements.activeCallsList.innerHTML = '';
  } else {
    elements.callStatus.textContent = `${activeCount} active call${activeCount > 1 ? 's' : ''}`;
    elements.callStatus.classList.add('connected');

    // Render individual call cards
    renderActiveCallCards();
  }
}

// Render individual call cards with controls
function renderActiveCallCards() {
  elements.activeCallsList.innerHTML = '';

  state.activeCalls.forEach(callData => {
    const card = document.createElement('div');
    card.className = 'active-call-card';
    if (state.listeningToCallId === callData.id) {
      card.classList.add('listening');
    }

    // Click anywhere on card to listen to this call
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      // Don't trigger if clicking on hangup button
      if (!e.target.closest('.btn-hangup-single')) {
        listenToCall(callData.id);
      }
    });

    const elapsed = callData.connectTime
      ? Math.floor((Date.now() - callData.connectTime.getTime()) / 1000)
      : 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const timerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const remaining = callData.autoHangupAt
      ? Math.max(0, Math.floor((callData.autoHangupAt - Date.now()) / 1000))
      : 0;
    const remMinutes = Math.floor(remaining / 60);
    const remSeconds = remaining % 60;
    const countdownText = remaining > 0
      ? `⏱️ ${remMinutes}:${String(remSeconds).padStart(2, '0')}`
      : '';

    card.innerHTML = `
      <div class="active-call-header">
        <div class="active-call-number">${callData.label || callData.number}</div>
        <div class="active-call-status">${callData.status}</div>
      </div>
      <div class="active-call-info">
        <div class="active-call-timer">⏱ ${timerText}</div>
        <div class="active-call-countdown">${countdownText}</div>
      </div>
      <div class="active-call-actions">
        <button class="btn-hangup-single" onclick="hangupSingleCall('${callData.id}')">
          ❌ Hangup
        </button>
      </div>
    `;

    elements.activeCallsList.appendChild(card);
  });

  // Also update Auto Dialer active calls display
  renderAutoDialerActiveCalls();
}

// Render active calls in Auto Dialer tab
function renderAutoDialerActiveCalls() {
  // Update count
  elements.activeCallsCount.textContent = state.activeCalls.length;

  if (state.activeCalls.length === 0) {
    elements.autoDialerActiveCallsList.innerHTML = '<p style="color: #666; font-style: italic; text-align: center;">No active calls</p>';
    return;
  }

  // Use table layout for compact display
  let html = `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: white;">
      <thead>
        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <th style="padding: 10px; text-align: left; border: 1px solid #ddd; font-weight: bold;">Number</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; width: 80px;">Status</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; width: 90px;">Duration</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; width: 110px;">Auto-Hangup</th>
          <th style="padding: 10px; text-align: center; border: 1px solid #ddd; font-weight: bold; width: 120px;">Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.activeCalls.forEach((callData, index) => {
    const elapsed = callData.connectTime
      ? Math.floor((Date.now() - callData.connectTime.getTime()) / 1000)
      : 0;
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    const duration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const remaining = callData.autoHangupAt
      ? Math.max(0, Math.floor((callData.autoHangupAt - Date.now()) / 1000))
      : 0;
    const remMinutes = Math.floor(remaining / 60);
    const remSeconds = remaining % 60;
    const countdown = remaining > 0 ? `${remMinutes}:${String(remSeconds).padStart(2, '0')}` : '-';

    const statusColor = callData.status === 'connected' ? '#28a745' :
      callData.status === 'ringing' ? '#ffc107' : '#666';
    const statusBadge = callData.status === 'connected'
      ? '<span style="background: #28a745; color: white; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">LIVE</span>'
      : '<span style="background: #ffc107; color: #333; padding: 3px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">RING</span>';

    const isListening = state.listeningToCallId === callData.id;
    const rowBg = isListening ? '#e8f5e9' : (index % 2 === 0 ? '#ffffff' : '#f9f9f9');
    const listeningIcon = isListening ? '🔊' : '🔇';
    const listeningText = isListening ? 'Listening' : 'On Hold';
    const listeningColor = isListening ? '#28a745' : '#666';

    html += `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #ddd; transition: background 0.3s ease;" 
          onmouseover="this.style.background='#f0f8ff'" 
          onmouseout="this.style.background='${rowBg}'">
        <td style="padding: 10px; border: 1px solid #ddd;">
          <div>
            <strong style="color: #333; font-size: 14px;">${callData.label || callData.number}</strong>
            <div style="font-size: 11px; color: #666; margin-top: 2px;">${callData.number}</div>
          </div>
        </td>
        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">
          ${statusBadge}
        </td>
        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">
          <strong style="font-family: monospace; font-size: 14px; color: #333;">${duration}</strong>
        </td>
        <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">
          <span style="font-family: monospace; font-size: 13px; color: ${remaining > 30 ? '#333' : '#dc3545'}; font-weight: ${remaining <= 30 ? 'bold' : 'normal'};">
            ${countdown}
          </span>
        </td>
        <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">
          <div style="display: flex; gap: 5px; justify-content: center; align-items: center;">
            <button onclick="listenToCall('${callData.id}')" 
                    style="background: ${listeningColor}; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;"
                    title="${listeningText}">
              ${listeningIcon}
            </button>
            <button onclick="hangupSingleCall('${callData.id}')" 
                    style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;"
                    title="Hangup">
              ❌
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  elements.autoDialerActiveCallsList.innerHTML = html;
}

// Start call duration timer for a specific call
function startCallTimer(callData) {
  callData.callTimerInterval = setInterval(() => {
    if (callData.connectTime) {
      // Just trigger UI refresh - the renderActiveCallCards will show updated time
      updateCallDisplay();
    }
  }, 1000);
}

// Start countdown timer for a specific call
function startCountdownTimer(callData) {
  callData.countdownInterval = setInterval(() => {
    if (callData.autoHangupAt) {
      const remaining = Math.max(0, Math.floor((callData.autoHangupAt - Date.now()) / 1000));

      // Just trigger UI refresh - the renderActiveCallCards will show updated countdown
      updateCallDisplay();

      // Auto-hangup when time is up
      if (remaining === 0) {
        console.log(`[AUTO-HANGUP] Time's up for ${callData.number}, hanging up...`);
        hangupCall(callData);
      }
    }
  }, 1000);
}

// Stop timers for a specific call
function stopCallTimers(callData) {
  if (callData.callTimerInterval) {
    clearInterval(callData.callTimerInterval);
    callData.callTimerInterval = null;
  }

  if (callData.countdownInterval) {
    clearInterval(callData.countdownInterval);
    callData.countdownInterval = null;
  }

  if (callData.autoHangupTimer) {
    clearTimeout(callData.autoHangupTimer);
    callData.autoHangupTimer = null;
  }
}

// Hang up all calls
function hangup() {
  // Make a copy of the active calls array to avoid issues when array is modified during iteration
  const callsToHangup = [...state.activeCalls];

  console.log('Hanging up all calls:', callsToHangup.length);

  callsToHangup.forEach(callData => {
    if (callData.session) {
      try {
        console.log('Terminating call:', callData.number);
        callData.session.terminate();
      } catch (error) {
        console.error('Error hanging up call:', callData.number, error);
      }
    }
  });
}

// Hang up a specific call by ID (called from UI)
function hangupSingleCall(callId) {
  const callData = state.activeCalls.find(c => c.id == callId);
  if (callData) {
    hangupCall(callData);
  }
}

// Hang up a specific call
function hangupCall(callData) {
  if (callData && callData.session) {
    try {
      callData.session.terminate();
    } catch (error) {
      console.error('Error hanging up call:', error);
      endCall(callData, 'Error');
    }
  }
}

// Send hold music to a call (music goes to caller, not PC speakers)
async function sendHoldMusicToCall(callData) {
  if (!callData.session) {
    console.log('⚠️ No session, skipping hold music');
    return;
  }

  try {
    // Check if connection is still open before trying to replace track
    const connectionState = callData.session.connection?.connectionState;
    console.log('🔍 Connection state:', connectionState, 'for', callData.number);

    if (connectionState === 'closed' || connectionState === 'failed') {
      console.log('⚠️ Connection already closed, skipping hold music');
      return;
    }

    // Create hold music using Web Audio API (generated tone)
    if (!window.holdMusicAudioContext) {
      console.log('🎵 Creating audio context for hold music');
      window.holdMusicAudioContext = new AudioContext();
      window.holdMusicDestination = window.holdMusicAudioContext.createMediaStreamDestination();

      // Create a simple pleasant hold music tone (two frequencies for a chord)
      const oscillator1 = window.holdMusicAudioContext.createOscillator();
      const oscillator2 = window.holdMusicAudioContext.createOscillator();
      const gainNode = window.holdMusicAudioContext.createGain();

      // Set frequencies (C and E notes for a pleasant sound)
      oscillator1.frequency.value = 523.25; // C5
      oscillator2.frequency.value = 659.25; // E5
      oscillator1.type = 'sine';
      oscillator2.type = 'sine';

      // Set volume
      gainNode.gain.value = 0.15; // Soft volume

      // Connect oscillators to gain and then to destination
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(window.holdMusicDestination);

      // Start oscillators
      oscillator1.start();
      oscillator2.start();

      console.log('🎵 Hold music tone generated');
    }

    // Get hold music stream
    const holdMusicStream = window.holdMusicDestination.stream;
    console.log('🎵 Hold music stream tracks:', holdMusicStream.getAudioTracks().length);

    // Replace the outgoing audio track with hold music
    const senders = callData.session.connection.getSenders();
    console.log('🔍 Total senders:', senders.length);

    const sender = senders.find(s => s.track && s.track.kind === 'audio');
    console.log('🔍 Audio sender found:', !!sender);

    if (sender && holdMusicStream.getAudioTracks().length > 0) {
      console.log('🔄 Replacing track with hold music...');
      await sender.replaceTrack(holdMusicStream.getAudioTracks()[0]);

      // Mark that this call is playing hold music
      callData.isPlayingHoldMusic = true;

      console.log('✅ Hold music sent to caller');
    } else {
      console.log('⚠️ Could not send hold music - sender:', !!sender, 'tracks:', holdMusicStream.getAudioTracks().length);
    }
  } catch (error) {
    console.error('❌ Error sending hold music to call:', error);
    // Fallback to standard hold
    if (callData.session) {
      callData.session.hold();
    }
  }
}

// Generate IVR message using Text-to-Speech
async function generateIVRMessage() {
  return new Promise((resolve, reject) => {
    if (!elements.ivrMessageEnabled.checked || !elements.ivrMessageText.value.trim()) {
      resolve(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(elements.ivrMessageText.value);
    const selectedVoiceIndex = elements.ivrVoice.selectedIndex;
    const voices = speechSynthesis.getVoices();

    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }

    utterance.rate = parseFloat(elements.ivrRate.value);
    utterance.pitch = parseFloat(elements.ivrPitch.value);

    // Create audio context to capture speech
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    // We'll use a workaround: create an oscillator with very low volume and capture the stream
    // Then we'll play the speech normally but also send the stream
    // This is a limitation of Web Speech API - it doesn't provide direct audio stream access

    console.log('🎙️ IVR: Using speech synthesis for hold message');
    resolve(destination.stream);

    // Play the speech (this will be heard by the caller through the stream)
    speechSynthesis.speak(utterance);

    if (elements.ivrRepeat.checked) {
      utterance.onend = () => {
        // Repeat the message
        setTimeout(() => {
          if (elements.ivrMessageEnabled.checked) {
            const newUtterance = utterance.cloneNode ? utterance.cloneNode() : new SpeechSynthesisUtterance(elements.ivrMessageText.value);
            newUtterance.voice = utterance.voice;
            newUtterance.rate = utterance.rate;
            newUtterance.pitch = utterance.pitch;
            newUtterance.onend = utterance.onend;
            speechSynthesis.speak(newUtterance);
          }
        }, 500);
      };
    }
  });
}

// Send TTS IVR message to call
async function sendTTSIVRToCall(callData) {
  if (!callData.session) {
    console.log('⚠️ No session, skipping TTS IVR');
    return;
  }

  if (!elements.ivrMessageEnabled.checked) {
    console.log('⚠️ IVR message disabled, using tone');
    return sendHoldMusicToCall(callData);
  }

  try {
    const connectionState = callData.session.connection?.connectionState;
    console.log('🔍 Connection state for TTS:', connectionState, 'for', callData.number);

    if (connectionState === 'closed' || connectionState === 'failed') {
      console.log('⚠️ Connection already closed, skipping TTS IVR');
      return;
    }

    // Create audio context for TTS if not exists
    if (!window.ttsAudioContext) {
      console.log('🎙️ Creating TTS audio context');
      window.ttsAudioContext = new AudioContext();
      window.ttsDestination = window.ttsAudioContext.createMediaStreamDestination();
    }

    // Function to generate and play TTS audio through WebRTC
    const playTTSMessage = async () => {
      if (!callData.isPlayingHoldMusic) return;

      try {
        console.log('🎙️ Generating TTS audio for caller');

        const message = elements.ivrMessageText.value;
        const rate = parseFloat(elements.ivrRate.value);

        // Use our local TTS proxy endpoint (no CORS issues!)
        const encodedText = encodeURIComponent(message);
        const ttsUrl = `http://localhost:3000/api/tts?text=${encodedText}&speed=${rate}&lang=en`;

        // Create audio element and load TTS
        const audioElement = document.createElement('audio');
        audioElement.src = ttsUrl;

        // Wait for audio to load
        await new Promise((resolve, reject) => {
          audioElement.addEventListener('loadedmetadata', resolve, { once: true });
          audioElement.addEventListener('error', reject, { once: true });
          audioElement.load();
        });

        // Create media stream from audio element
        const audioSource = window.ttsAudioContext.createMediaElementSource(audioElement);
        const gainNode = window.ttsAudioContext.createGain();
        gainNode.gain.value = 1.0;

        // Disconnect previous connections
        if (window.ttsSource) {
          try {
            window.ttsSource.disconnect();
          } catch (e) { }
        }

        // Connect: audioElement -> gainNode -> destination
        audioSource.connect(gainNode);
        gainNode.connect(window.ttsDestination);
        window.ttsSource = audioSource;

        // Play audio
        await audioElement.play();

        console.log('✅ TTS audio playing to caller');

        // Handle repeat
        if (elements.ivrRepeat.checked) {
          audioElement.onended = () => {
            setTimeout(() => {
              if (callData.isPlayingHoldMusic && elements.ivrMessageEnabled.checked) {
                playTTSMessage();
              }
            }, 1000); // 1 second pause
          };
        }

      } catch (error) {
        console.error('❌ Error playing TTS:', error);
        console.log('⚠️ Falling back to hold tone');
        // Fallback to tone if TTS fails
        return sendHoldMusicToCall(callData);
      }
    };

    // Get TTS stream
    const ttsStream = window.ttsDestination.stream;
    console.log('🎙️ TTS stream tracks:', ttsStream.getAudioTracks().length);

    // Replace the outgoing audio track with TTS
    const sender = callData.session.connection.getSenders().find(s => s.track && s.track.kind === 'audio');

    if (sender) {
      // If no audio track yet, create a silent one
      if (ttsStream.getAudioTracks().length === 0) {
        const silentOsc = window.ttsAudioContext.createOscillator();
        const gainNode = window.ttsAudioContext.createGain();
        gainNode.gain.value = 0.001;
        silentOsc.connect(gainNode);
        gainNode.connect(window.ttsDestination);
        silentOsc.start();
      }

      console.log('🔄 Replacing track with TTS stream...');
      await sender.replaceTrack(ttsStream.getAudioTracks()[0]);

      callData.isPlayingHoldMusic = true;

      // Start playing TTS
      playTTSMessage();

      console.log('✅ TTS IVR message sent to caller');
    } else {
      console.log('⚠️ Could not send TTS - falling back to tone');
      return sendHoldMusicToCall(callData);
    }
  } catch (error) {
    console.error('❌ Error sending TTS IVR:', error);
    return sendHoldMusicToCall(callData);
  }
}

// Stop hold music and restore microphone audio to call
async function stopHoldMusicForCall(callData) {
  if (!callData.session) return;

  try {
    // Mark that hold music is no longer playing
    callData.isPlayingHoldMusic = false;

    // Stop any ongoing speech synthesis
    speechSynthesis.cancel();

    // Stop TTS audio source if exists
    if (window.ttsSource) {
      try {
        window.ttsSource.disconnect();
        window.ttsSource = null;
      } catch (e) {
        console.log('TTS source already disconnected');
      }
    }

    // Note: We don't stop the oscillators since they're shared and always running
    // The hold music is stopped by replacing the track with microphone audio

    // Check if connection is still open before trying to replace track
    const connectionState = callData.session.connection?.connectionState;
    if (connectionState === 'closed' || connectionState === 'failed') {
      console.log('⚠️ Connection already closed, skipping track replacement');
      return;
    }

    // Restore microphone audio track only if connection is still active
    if (state.localStream && callData.session.connection) {
      const sender = callData.session.connection.getSenders().find(s => s.track && s.track.kind === 'audio');
      if (sender && state.localStream.getAudioTracks().length > 0) {
        await sender.replaceTrack(state.localStream.getAudioTracks()[0]);
        console.log('✅ Microphone audio restored to call');
      }
    }
  } catch (error) {
    console.error('Error stopping hold music:', error);
  }
}

// Listen to a specific call's audio
async function listenToCall(callId) {
  console.log('listenToCall called with callId:', callId);
  console.log('Active calls:', state.activeCalls.map(c => ({ id: c.id, number: c.number, hasStream: !!c.remoteStream })));

  const callData = state.activeCalls.find(c => c.id == callId);
  console.log('Found call data:', callData ? callData.number : 'NOT FOUND');

  if (!callData) {
    console.error('Call not found for id:', callId);
    return;
  }

  if (!callData.remoteStream) {
    console.error('No remote stream for call:', callData.number);
    return;
  }

  // Toggle: If already listening to this call, put it on hold
  if (state.listeningToCallId === callData.id) {
    console.log('🔇 Putting current call on hold:', callData.number);

    // Mute audio from PC speakers
    elements.remoteAudio.pause();
    elements.remoteAudio.srcObject = null;

    // Clear listening state
    state.listeningToCallId = null;

    // Send TTS IVR or hold music TO the call (not to PC speakers)
    await sendTTSIVRToCall(callData);

    console.log('✅ Call on hold, IVR/hold music sent to caller');
    updateCallDisplay();
    return;
  }

  // Put ALL other calls on hold first (send IVR/hold music to them)
  for (const call of state.activeCalls) {
    if (call.id !== callData.id && call.session) {
      console.log('📞 Putting on hold:', call.number);
      await sendTTSIVRToCall(call);
    }
  }

  // Stop hold music and resume the selected call
  if (callData.session) {
    console.log('▶️ Resuming call:', callData.number);
    await stopHoldMusicForCall(callData);
  }

  // Switch audio to this call
  state.listeningToCallId = callData.id;

  // Attach the audio stream to the audio element
  elements.remoteAudio.srcObject = callData.remoteStream;
  elements.remoteAudio.volume = elements.volumeControl.value / 100;
  elements.remoteAudio.muted = false;
  elements.remoteAudio.play().catch(err => {
    console.warn('Could not play audio:', err);
  });

  console.log('✅ Now listening to:', callData.number);
  updateCallDisplay();
}

// End call helper
function endCall(callData, reason) {
  if (!callData) return;

  // Stop ringback tone
  elements.ringbackTone.pause();
  elements.ringbackTone.currentTime = 0;

  // Stop hold music if this call was using it
  if (callData.isPlayingHoldMusic) {
    stopHoldMusicForCall(callData);
  }

  // Stop timers for this call
  stopCallTimers(callData);

  const endTime = new Date();
  const duration = callData.connectTime
    ? Math.floor((endTime - callData.connectTime) / 1000)
    : 0;

  // Update stats: add total minutes for connected calls
  if (callData.numberIndex !== undefined && state.numbers[callData.numberIndex] && callData.status === 'connected' && duration > 0) {
    if (!state.numbers[callData.numberIndex].stats) {
      state.numbers[callData.numberIndex].stats = {
        totalCalls: 0, connectedCalls: 0, failedCalls: 0, totalMinutes: 0,
        lastCallTime: null, lastCallStatus: null, lastSipError: null
      };
    }
    const minutes = duration / 60;
    state.numbers[callData.numberIndex].stats.totalMinutes += minutes;
    saveNumbers();
    updateAutoDialerNumbersList();
  }

  // Add to history
  const startTime = callData.connectTime || callData.startTime || new Date(Date.now() - duration * 1000);

  state.callHistory.unshift({
    number: callData.number,
    label: callData.label,
    time: endTime.toLocaleString('en-GB', { hour12: false }),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: duration,
    status: callData.status === 'connected' ? 'success' : 'failed',
    reason: reason || 'Normal'
  });

  // Keep only last 50 calls
  if (state.callHistory.length > 50) {
    state.callHistory = state.callHistory.slice(0, 50);
  }

  saveHistory();
  renderHistory();

  console.log('Call ended:', callData.number, '- Duration:', duration, 'seconds');

  // Remove from active calls
  const index = state.activeCalls.findIndex(c => c.id === callData.id);
  if (index !== -1) {
    state.activeCalls.splice(index, 1);
  }

  // Stop hold music if no more active calls
  if (state.activeCalls.length === 0) {
    elements.holdMusic.pause();
    elements.holdMusic.currentTime = 0;
  }

  // Update display
  updateCallDisplay();
  renderAutoDialerActiveCalls(); // Update active calls display

  // Update button states
  elements.hangupBtn.disabled = state.activeCalls.length === 0;
  elements.muteBtn.disabled = state.activeCalls.length === 0;
  elements.volumeControl.disabled = state.activeCalls.length === 0;
}

// Toggle mute
function toggleMute() {
  if (!state.activeSession) return;

  state.isMuted = !state.isMuted;

  if (state.isMuted) {
    state.activeSession.mute();
    elements.muteBtn.textContent = '🔊 Unmute';
    console.log('Microphone muted');
  } else {
    state.activeSession.unmute();
    elements.muteBtn.textContent = '🔇 Mute';
    console.log('Microphone unmuted');
  }
}

// Adjust volume
function adjustVolume() {
  const volume = elements.volumeControl.value / 100;
  elements.remoteAudio.volume = volume;
  console.log('Volume set to:', volume);
}

// Add a new number
function addNumber() {
  const number = elements.newNumber.value.trim();
  const label = elements.newNumberLabel.value.trim();
  const minDuration = parseInt(elements.newNumberMinDuration.value) || 180;
  const maxDuration = parseInt(elements.newNumberMaxDuration.value) || 240;

  if (!number) {
    alert('Please enter a phone number');
    return;
  }

  if (maxDuration < minDuration) {
    alert('Max duration must be greater than or equal to min duration');
    return;
  }

  state.numbers.push({
    number,
    label: label || number,
    minDuration,
    maxDuration,
    stats: {
      totalCalls: 0,
      connectedCalls: 0,
      failedCalls: 0,
      totalMinutes: 0,
      lastCallTime: null,
      lastCallStatus: null,
      lastSipError: null
    }
  });
  saveNumbers();
  renderNumbers();

  elements.newNumber.value = '';
  elements.newNumberLabel.value = '';
  elements.newNumberMinDuration.value = '180';
  elements.newNumberMaxDuration.value = '240';
}

// Import numbers from Excel/CSV file
function importFromExcel() {
  const file = elements.excelFileInput.files[0];

  if (!file) {
    alert('Please select a file to import');
    return;
  }

  elements.importStatus.textContent = 'Reading file...';
  elements.importStatus.style.color = '#666';

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const text = e.target.result;

      // Check if file is binary Excel file (starts with PK which is ZIP signature)
      if (text.startsWith('PK') || text.includes('<?xml')) {
        throw new Error('This appears to be an Excel file (.xlsx/.xls). Please save it as CSV first!\n\nIn Excel: File → Save As → CSV (Comma delimited)');
      }

      const lines = text.split('\n').map(line => line.trim()).filter(line => line);

      if (lines.length === 0) {
        throw new Error('File is empty');
      }

      let imported = 0;
      let skipped = 0;

      // Process each line (skip header if it contains "Phone Number")
      lines.forEach((line, index) => {
        // Skip header row
        if (index === 0 && (line.toLowerCase().includes('phone') || line.toLowerCase().includes('number'))) {
          return;
        }

        // Parse CSV line (simple split by comma, tab, or semicolon)
        const parts = line.split(/[,;\t]/).map(p => p.trim());

        if (parts.length < 1 || !parts[0]) {
          skipped++;
          return;
        }

        const number = parts[0];
        const label = parts[1] || number;
        const minDuration = parseInt(parts[2]) || 180;
        const maxDuration = parseInt(parts[3]) || 240;

        // Check for duplicate
        const isDuplicate = state.numbers.some(n => n.number === number);
        if (isDuplicate) {
          console.warn(`Skipping ${number}: already exists`);
          skipped++;
          return;
        }

        // Validate
        if (maxDuration < minDuration) {
          console.warn(`Skipping ${number}: max duration < min duration`);
          skipped++;
          return;
        }

        state.numbers.push({
          number,
          label,
          minDuration,
          maxDuration,
          stats: {
            totalCalls: 0,
            connectedCalls: 0,
            failedCalls: 0,
            totalMinutes: 0,
            lastCallTime: null,
            lastCallStatus: null,
            lastSipError: null
          }
        });
        imported++;
      });

      saveNumbers();
      renderNumbers();

      elements.importStatus.textContent = `✅ Import complete! Added ${imported} numbers. Skipped ${skipped} invalid rows.`;
      elements.importStatus.style.color = '#28a745';

      // Clear file input
      elements.excelFileInput.value = '';

      console.log(`[IMPORT] Successfully imported ${imported} numbers`);

    } catch (error) {
      console.error('[IMPORT] Error:', error);
      elements.importStatus.textContent = `❌ Error: ${error.message}`;
      elements.importStatus.style.color = '#dc3545';
    }
  };

  reader.onerror = function () {
    elements.importStatus.textContent = '❌ Error reading file';
    elements.importStatus.style.color = '#dc3545';
  };

  // Read as text (works for both CSV and simple Excel exports)
  reader.readAsText(file);
}

// Remove a number
function removeNumber(index) {
  if (confirm('Are you sure you want to remove this number?')) {
    state.numbers.splice(index, 1);
    saveNumbers();
    renderNumbers();
  }
}

// Call all selected numbers
function callSelectedNumbers() {
  if (!state.connected) {
    alert('Please connect to the SIP server first!');
    return;
  }

  const checkboxes = document.querySelectorAll('.number-checkbox:checked');

  if (checkboxes.length === 0) {
    alert('Please select at least one number to call');
    return;
  }

  // Get batch duration settings
  const batchMinDuration = parseInt(elements.batchMinDuration.value) || 180;
  const batchMaxDuration = parseInt(elements.batchMaxDuration.value) || 240;

  if (batchMaxDuration < batchMinDuration) {
    alert('Max duration must be greater than or equal to min duration');
    return;
  }

  console.log(`Calling ${checkboxes.length} selected numbers with duration ${batchMinDuration}-${batchMaxDuration}s...`);

  checkboxes.forEach((checkbox, idx) => {
    const index = parseInt(checkbox.dataset.index);
    const numberData = state.numbers[index];
    if (numberData) {
      // Override individual number durations with batch settings
      const tempNumberData = {
        ...numberData,
        minDuration: batchMinDuration,
        maxDuration: batchMaxDuration
      };

      // Small delay between calls to avoid overwhelming the system
      setTimeout(() => {
        // Temporarily update the number's duration in state
        const originalMin = state.numbers[index].minDuration;
        const originalMax = state.numbers[index].maxDuration;
        state.numbers[index].minDuration = batchMinDuration;
        state.numbers[index].maxDuration = batchMaxDuration;

        makeCall(numberData.number, numberData.label, index);

        // Restore original durations
        state.numbers[index].minDuration = originalMin;
        state.numbers[index].maxDuration = originalMax;
      }, idx * 100); // 100ms delay between each call
    }
  });
}

// Select all numbers
function selectAllNumbers() {
  const checkboxes = document.querySelectorAll('.number-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = true;
  });
  updateAutoDialerNumbersList();
}

// Deselect all numbers
function deselectAllNumbers() {
  const checkboxes = document.querySelectorAll('.number-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  updateAutoDialerNumbersList();
}

// Check if current time is within working hours
function isWithinWorkingHours(startTime, endTime) {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes since midnight

  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Format current time for display
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMin = String(now.getMinutes()).padStart(2, '0');
  const currentTimeStr = `${currentHour}:${currentMin}`;

  const isWithin = currentTime >= startMinutes && currentTime < endMinutes;

  console.log(`[WORKING HOURS] Current: ${currentTimeStr}, Range: ${startTime} - ${endTime}, Within: ${isWithin}`);

  return isWithin;
}

// Start Auto Dialer
function startAutoDialer() {
  if (!state.connected) {
    alert('Please connect to the SIP server first!');
    return;
  }

  if (!elements.autoDialerEnabled.checked) {
    alert('Please enable Auto Dialer first!');
    return;
  }

  // Get selected numbers
  const checkboxes = document.querySelectorAll('.number-checkbox:checked');
  if (checkboxes.length === 0) {
    alert('Please select at least one number for Auto Dialer!');
    return;
  }

  // Get settings
  const workingHoursStart = elements.autoDialerWorkingHoursStart.value || '09:00';
  const workingHoursEnd = elements.autoDialerWorkingHoursEnd.value || '18:00';
  const minInterval = parseInt(elements.autoDialerMinInterval.value) || 5;
  const maxInterval = parseInt(elements.autoDialerMaxInterval.value) || 15;
  const maxActiveCalls = parseInt(elements.autoDialerMaxActiveCalls.value) || 1;

  // Allow starting auto dialer outside working hours - it will wait until working hours begin
  if (!isWithinWorkingHours(workingHoursStart, workingHoursEnd)) {
    console.log(`[AUTO-DIALER] Starting outside working hours (${workingHoursStart} - ${workingHoursEnd}). Will wait until working hours begin.`);
  }

  if (maxInterval < minInterval) {
    alert('Max interval must be greater than or equal to min interval');
    return;
  }

  if (maxActiveCalls < 1) {
    alert('Maximum active calls must be at least 1');
    return;
  }

  // Build selected numbers array
  state.autoDialer.selectedNumbers = [];
  checkboxes.forEach(checkbox => {
    const index = parseInt(checkbox.dataset.index);
    const numberData = state.numbers[index];
    if (numberData) {
      state.autoDialer.selectedNumbers.push({ ...numberData, index });
    }
  });

  state.autoDialer.running = true;
  state.autoDialer.currentIndex = 0;
  state.autoDialer.lastCallConnectTime = null;

  elements.startAutoDialerBtn.disabled = true;
  elements.stopAutoDialerBtn.disabled = false;
  updateAutoDialerStatus('Running - waiting to call next number...');
  updateAutoDialerNumbersList(); // Update to show ACTIVE badges

  console.log(`[AUTO-DIALER] Started with ${state.autoDialer.selectedNumbers.length} numbers`);
  console.log(`[AUTO-DIALER] Working hours: ${workingHoursStart} - ${workingHoursEnd}`);
  console.log(`[AUTO-DIALER] Interval between calls: ${minInterval}-${maxInterval}s`);
  console.log(`[AUTO-DIALER] Max active calls: ${maxActiveCalls}`);

  // Start the auto dialer loop
  scheduleNextCall(workingHoursStart, workingHoursEnd, minInterval, maxInterval, maxActiveCalls);
}

// Stop Auto Dialer
function stopAutoDialer() {
  if (state.autoDialer.timer) {
    clearTimeout(state.autoDialer.timer);
    state.autoDialer.timer = null;
  }

  if (state.autoDialer.countdownInterval) {
    clearInterval(state.autoDialer.countdownInterval);
    state.autoDialer.countdownInterval = null;
  }

  state.autoDialer.running = false;
  state.autoDialer.selectedNumbers = [];
  state.autoDialer.currentIndex = 0;
  state.autoDialer.lastCallConnectTime = null;
  state.autoDialer.nextCallTime = null;

  elements.startAutoDialerBtn.disabled = false;
  elements.stopAutoDialerBtn.disabled = true;
  updateAutoDialerStatus('Stopped');
  updateAutoDialerNumbersList(); // Update to remove ACTIVE badges

  console.log('[AUTO-DIALER] Stopped');
}

// Schedule next auto dialer call
function scheduleNextCall(workingHoursStart, workingHoursEnd, minInterval, maxInterval, maxActiveCalls) {
  if (!state.autoDialer.running) {
    return;
  }

  // Check if we're still within working hours
  if (!isWithinWorkingHours(workingHoursStart, workingHoursEnd)) {
    updateAutoDialerStatus(`Outside working hours (${workingHoursStart} - ${workingHoursEnd}). Pausing...`);
    console.log('[AUTO-DIALER] Outside working hours, pausing...');

    // Check again in 1 minute
    state.autoDialer.timer = setTimeout(() => {
      scheduleNextCall(workingHoursStart, workingHoursEnd, minInterval, maxInterval, maxActiveCalls);
    }, 60000);
    return;
  }

  // Check if we've reached max active calls - if so, wait and check again
  if (state.activeCalls.length >= maxActiveCalls) {
    updateAutoDialerStatus(`Waiting - ${state.activeCalls.length}/${maxActiveCalls} active calls...`);
    state.autoDialer.timer = setTimeout(() => {
      scheduleNextCall(workingHoursStart, workingHoursEnd, minInterval, maxInterval, maxActiveCalls);
    }, 1000); // Check again in 1 second
    return;
  }

  // Clear any existing countdown interval
  if (state.autoDialer.countdownInterval) {
    clearInterval(state.autoDialer.countdownInterval);
    state.autoDialer.countdownInterval = null;
  }

  // Calculate random interval between calls
  const randomInterval = Math.floor(Math.random() * (maxInterval - minInterval + 1)) + minInterval;

  // Set next call time
  state.autoDialer.nextCallTime = Date.now() + (randomInterval * 1000);

  // Start real-time countdown
  state.autoDialer.countdownInterval = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((state.autoDialer.nextCallTime - Date.now()) / 1000));
    updateAutoDialerStatus(`Next call in ${remaining}s...`);

    if (remaining === 0) {
      clearInterval(state.autoDialer.countdownInterval);
      state.autoDialer.countdownInterval = null;
    }
  }, 1000);

  updateAutoDialerStatus(`Next call in ${randomInterval}s...`);

  // Schedule the next call
  state.autoDialer.timer = setTimeout(() => {
    if (state.autoDialer.countdownInterval) {
      clearInterval(state.autoDialer.countdownInterval);
      state.autoDialer.countdownInterval = null;
    }
    makeNextAutoDialerCall(workingHoursStart, workingHoursEnd, minInterval, maxInterval, maxActiveCalls);
  }, randomInterval * 1000);
}

// Make the next call in auto dialer sequence
function makeNextAutoDialerCall(workingHoursStart, workingHoursEnd, minInterval, maxInterval, maxActiveCalls) {
  if (!state.autoDialer.running || state.autoDialer.selectedNumbers.length === 0) {
    return;
  }

  // Find the number with the least total calls
  let selectedNumber = state.autoDialer.selectedNumbers[0];
  let minCalls = state.numbers[selectedNumber.index].stats?.totalCalls || 0;

  for (let i = 1; i < state.autoDialer.selectedNumbers.length; i++) {
    const numberData = state.autoDialer.selectedNumbers[i];
    const totalCalls = state.numbers[numberData.index].stats?.totalCalls || 0;

    if (totalCalls < minCalls) {
      minCalls = totalCalls;
      selectedNumber = numberData;
    }
  }

  const numberData = selectedNumber;
  console.log(`[AUTO-DIALER] Calling ${numberData.number} (${numberData.label}) - Total calls: ${minCalls}`);
  updateAutoDialerStatus(`Calling ${numberData.label || numberData.number}...`);

  // Override with batch duration settings
  const batchMinDuration = parseInt(elements.batchMinDuration.value) || 180;
  const batchMaxDuration = parseInt(elements.batchMaxDuration.value) || 240;

  const originalMin = state.numbers[numberData.index].minDuration;
  const originalMax = state.numbers[numberData.index].maxDuration;
  state.numbers[numberData.index].minDuration = batchMinDuration;
  state.numbers[numberData.index].maxDuration = batchMaxDuration;

  makeCall(numberData.number, numberData.label, numberData.index);

  // Restore original durations
  state.numbers[numberData.index].minDuration = originalMin;
  state.numbers[numberData.index].maxDuration = originalMax;

  // Schedule next call
  scheduleNextCall(workingHoursStart, workingHoursEnd, minInterval, maxInterval, maxActiveCalls);
}

// Update auto dialer status display
function updateAutoDialerStatus(message) {
  elements.autoDialerStatus.textContent = `Auto Dialer: ${message}`;
  elements.autoDialerStatus.style.color = state.autoDialer.running ? '#28a745' : '#666';
}

// Update Auto Dialer Numbers List Display
function updateAutoDialerNumbersList() {
  if (state.numbers.length === 0) {
    elements.autoDialerNumbersList.innerHTML = '<p style="color: #666; font-style: italic;">No numbers added yet. Go to Numbers tab to add numbers.</p>';
    return;
  }

  const checkboxes = document.querySelectorAll('.number-checkbox');
  const checkedCount = document.querySelectorAll('.number-checkbox:checked').length;

  // Build array of number items with their data
  const numberItems = [];
  checkboxes.forEach((checkbox, idx) => {
    const index = parseInt(checkbox.dataset.index);
    const numberData = state.numbers[index];
    if (numberData) {
      const isSelected = checkbox.checked;
      const isCurrentlyDialing = state.autoDialer.running &&
        state.autoDialer.selectedNumbers.some(n => n.index === index);

      // Check if this number has an active call
      const hasActiveCall = state.activeCalls.some(call => call.number === numberData.number);

      numberItems.push({
        index,
        idx,
        numberData,
        isSelected,
        isCurrentlyDialing,
        hasActiveCall
      });
    }
  });

  // Sort: active calls first, then by original order
  numberItems.sort((a, b) => {
    if (a.hasActiveCall && !b.hasActiveCall) return -1;
    if (!a.hasActiveCall && b.hasActiveCall) return 1;
    return a.idx - b.idx;
  });

  let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';

  numberItems.forEach(item => {
    const { idx, numberData, isSelected, isCurrentlyDialing, hasActiveCall } = item;

    // Highlight active calls with different colors
    const bgColor = hasActiveCall ? '#e8f5e9' : (isSelected ? 'white' : '#f5f5f5');
    const borderColor = hasActiveCall ? '#4caf50' : (isSelected ? '#28a745' : '#ddd');
    const borderWidth = hasActiveCall ? '3px' : (isSelected ? '2px' : '1px');
    const checkMark = isSelected ? '✓ ' : '';
    const statusBadge = isCurrentlyDialing ? '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px;">ACTIVE</span>' : '';
    const activeCallBadge = hasActiveCall ? '<span style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px; animation: pulse 2s infinite;">🔴 LIVE CALL</span>' : '';

    // Build statistics display
    let statsHtml = '';
    if (numberData.stats && numberData.stats.totalCalls > 0) {
      const stats = numberData.stats;
      const successRate = stats.totalCalls > 0 ? Math.round((stats.connectedCalls / stats.totalCalls) * 100) : 0;
      const rateColor = successRate >= 80 ? '#28a745' : successRate >= 50 ? '#ffc107' : '#dc3545';
      const totalMin = stats.totalMinutes.toFixed(1);

      // Format last call time
      let lastCallStr = '';
      if (stats.lastCallTime) {
        const lastTime = new Date(stats.lastCallTime);
        const minutesAgo = Math.floor((new Date() - lastTime) / 60000);
        if (minutesAgo < 1) lastCallStr = 'just now';
        else if (minutesAgo < 60) lastCallStr = `${minutesAgo} min ago`;
        else if (minutesAgo < 1440) lastCallStr = `${Math.floor(minutesAgo / 60)} hours ago`;
        else lastCallStr = `${Math.floor(minutesAgo / 1440)} days ago`;
      }

      statsHtml = `
        <div style="font-size: 11px; color: #666; margin-top: 4px;">
          <span style="margin-right: 12px;">📞 Calls: <strong>${stats.totalCalls}</strong></span>
          <span style="margin-right: 12px;">✅ Connected: <strong style="color: ${rateColor};">${stats.connectedCalls} (${successRate}%)</strong></span>
          <span style="margin-right: 12px;">❌ Failed: <strong>${stats.failedCalls}</strong></span>
          <span style="margin-right: 12px;">⏱️ Total: <strong>${totalMin} min</strong></span>
          ${lastCallStr ? `<span style="margin-right: 12px;">🕒 Last: ${lastCallStr}</span>` : ''}
          ${stats.lastSipError ? `<span style="background: #dc3545; color: white; padding: 1px 6px; border-radius: 3px;">⚠️ ${stats.lastSipError}</span>` : ''}
        </div>
      `;
    }

    html += `
      <div style="padding: 8px 12px; background: ${bgColor}; border: ${borderWidth} solid ${borderColor}; border-radius: 4px; opacity: ${isSelected ? '1' : '0.6'}; transition: all 0.3s ease; cursor: pointer;" onclick="showNumberDetails(${item.index})">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #333;">${checkMark}${idx + 1}. ${numberData.label || 'Unnamed'}</strong>
            <span style="color: #666; margin-left: 10px;">${numberData.number}</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="font-size: 12px; color: #666;">Auto-hangup: ${numberData.minDuration || 180}-${numberData.maxDuration || 240}s</span>
            ${activeCallBadge}
            ${statusBadge}
          </div>
        </div>
        ${statsHtml}
      </div>
    `;
  });

  html += '</div>';
  html += `<p style="margin-top: 10px; color: #666; font-size: 13px;"><strong>Selected:</strong> ${checkedCount} of ${state.numbers.length} number(s)</p>`;

  elements.autoDialerNumbersList.innerHTML = html;
}

// Show detailed information for a number
function showNumberDetails(index) {
  const numberData = state.numbers[index];
  if (!numberData) return;

  const panel = document.getElementById('numberDetailsPanel');
  const stats = numberData.stats || {
    totalCalls: 0,
    connectedCalls: 0,
    failedCalls: 0,
    totalMinutes: 0,
    lastCallTime: null,
    lastCallStatus: null,
    lastSipError: null
  };

  // Update panel title
  document.getElementById('detailNumberTitle').textContent = `${numberData.label || 'Unnamed'} - ${numberData.number}`;
  document.getElementById('detailNumberSubtitle').textContent = 'Click "Close Details" to hide this panel';

  // Contact Information
  document.getElementById('detailLabel').textContent = numberData.label || 'Not set';
  document.getElementById('detailNumber').textContent = numberData.number;

  // Check if currently calling
  const hasActiveCall = state.activeCalls.some(call => call.number === numberData.number);
  const statusText = hasActiveCall ? '🔴 Currently on call' : '✅ Available';
  const statusColor = hasActiveCall ? '#dc3545' : '#28a745';
  document.getElementById('detailStatus').innerHTML = `<span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>`;

  // Call Statistics
  document.getElementById('detailTotalCalls').textContent = stats.totalCalls;
  document.getElementById('detailConnectedCalls').textContent = stats.connectedCalls;
  document.getElementById('detailFailedCalls').textContent = stats.failedCalls;

  const successRate = stats.totalCalls > 0 ? Math.round((stats.connectedCalls / stats.totalCalls) * 100) : 0;
  const rateColor = successRate >= 80 ? '#28a745' : successRate >= 50 ? '#ffc107' : '#dc3545';
  document.getElementById('detailSuccessRate').innerHTML = `<span style="color: ${rateColor}; font-weight: bold;">${successRate}%</span>`;

  // Duration Information
  document.getElementById('detailTotalMinutes').textContent = stats.totalMinutes.toFixed(1) + ' min';

  const avgDuration = stats.connectedCalls > 0 ? (stats.totalMinutes / stats.connectedCalls).toFixed(1) : 0;
  document.getElementById('detailAvgDuration').textContent = avgDuration + ' min';

  document.getElementById('detailMinDuration').textContent = (numberData.minDuration || 180) + ' sec';
  document.getElementById('detailMaxDuration').textContent = (numberData.maxDuration || 240) + ' sec';

  // Last Call Information
  if (stats.lastCallTime) {
    const lastTime = new Date(stats.lastCallTime);
    const timeStr = lastTime.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const minutesAgo = Math.floor((new Date() - lastTime) / 60000);
    let agoText = '';
    if (minutesAgo < 1) agoText = '(just now)';
    else if (minutesAgo < 60) agoText = `(${minutesAgo} min ago)`;
    else if (minutesAgo < 1440) agoText = `(${Math.floor(minutesAgo / 60)} hours ago)`;
    else agoText = `(${Math.floor(minutesAgo / 1440)} days ago)`;

    document.getElementById('detailLastCallTime').innerHTML = `${timeStr} <span style="color: #666; font-size: 12px;">${agoText}</span>`;
  } else {
    document.getElementById('detailLastCallTime').textContent = 'Never called';
  }

  const lastStatus = stats.lastCallStatus || 'N/A';
  const lastStatusColor = lastStatus === 'connected' ? '#28a745' : lastStatus === 'failed' ? '#dc3545' : '#666';
  document.getElementById('detailLastCallStatus').innerHTML = `<span style="color: ${lastStatusColor}; font-weight: bold; text-transform: uppercase;">${lastStatus}</span>`;

  const sipError = stats.lastSipError || 'None';
  const sipErrorColor = sipError !== 'None' ? '#dc3545' : '#28a745';
  document.getElementById('detailLastSipError').innerHTML = `<span style="color: ${sipErrorColor};">${sipError}</span>`;

  // Store current number for CDR filtering
  window.currentDetailNumber = numberData.number;

  // Show the panel with animation
  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Toggle CDR Records display
function toggleCDRRecords() {
  const cdrSection = document.getElementById('cdrRecordsSection');
  const cdrList = document.getElementById('cdrRecordsList');

  if (cdrSection.style.display === 'none') {
    // Show CDR records
    cdrSection.style.display = 'block';

    // Render the CDR records
    renderCDRRecords();

    // Scroll to CDR section
    cdrSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    // Hide CDR records
    cdrSection.style.display = 'none';
  }
}

// Render CDR Records with optional filtering
function renderCDRRecords() {
  const cdrList = document.getElementById('cdrRecordsList');

  // Filter call history for the current number
  let numberRecords = state.callHistory.filter(call => call.number === window.currentDetailNumber);

  // Apply date/time filter if set
  const filterFrom = document.getElementById('cdrFilterFrom')?.value;
  const filterTo = document.getElementById('cdrFilterTo')?.value;

  if (filterFrom) {
    const fromDate = new Date(filterFrom);
    numberRecords = numberRecords.filter(call => {
      const callDate = call.startTime ? new Date(call.startTime) : new Date(call.time);
      return callDate >= fromDate;
    });
  }

  if (filterTo) {
    const toDate = new Date(filterTo);
    numberRecords = numberRecords.filter(call => {
      const callDate = call.endTime ? new Date(call.endTime) : new Date(call.time);
      return callDate <= toDate;
    });
  }

  if (numberRecords.length === 0) {
    cdrList.innerHTML = '<p style="color: #666; text-align: center; font-style: italic; padding: 20px;">No call records found for this number</p>';
    return;
  }

  let html = '<table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
  html += `
    <thead>
      <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
        <th style="padding: 8px; text-align: left; font-weight: bold; color: #333; width: 40px;">#</th>
        <th style="padding: 8px; text-align: left; font-weight: bold; color: #333;">Start Time</th>
        <th style="padding: 8px; text-align: left; font-weight: bold; color: #333;">End Time</th>
        <th style="padding: 8px; text-align: center; font-weight: bold; color: #333; width: 80px;">Duration</th>
        <th style="padding: 8px; text-align: center; font-weight: bold; color: #333; width: 100px;">Status</th>
        <th style="padding: 8px; text-align: left; font-weight: bold; color: #333;">Reason</th>
      </tr>
    </thead>
    <tbody>
  `;

  numberRecords.forEach((call, index) => {
    const rowBg = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
    const statusBadge = call.status === 'success'
      ? '<span style="background: #28a745; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">✓ CONNECTED</span>'
      : '<span style="background: #dc3545; color: white; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold;">✗ FAILED</span>';

    const durationMin = Math.floor(call.duration / 60);
    const durationSec = call.duration % 60;
    const durationStr = `${durationMin}:${String(durationSec).padStart(2, '0')}`;

    // Format start and end times
    let startTimeStr = 'N/A';
    let endTimeStr = 'N/A';

    if (call.startTime) {
      const startDate = new Date(call.startTime);
      startTimeStr = startDate.toLocaleString('en-GB', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    }

    if (call.endTime) {
      const endDate = new Date(call.endTime);
      endTimeStr = endDate.toLocaleString('en-GB', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      });
    } else if (call.time) {
      endTimeStr = call.time;
    }

    html += `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #dee2e6;">
        <td style="padding: 8px; color: #666;">${index + 1}</td>
        <td style="padding: 8px; color: #333; font-family: monospace; font-size: 11px;">${startTimeStr}</td>
        <td style="padding: 8px; color: #333; font-family: monospace; font-size: 11px;">${endTimeStr}</td>
        <td style="padding: 8px; text-align: center; color: #333; font-weight: bold; font-family: monospace;">${durationStr}</td>
        <td style="padding: 8px; text-align: center;">${statusBadge}</td>
        <td style="padding: 8px; color: #666; font-size: 11px;">${call.reason || 'N/A'}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';

  // Add summary
  const totalCalls = numberRecords.length;
  const connectedCalls = numberRecords.filter(c => c.status === 'success').length;
  const failedCalls = numberRecords.filter(c => c.status === 'failed').length;
  const totalDuration = numberRecords.reduce((sum, c) => sum + c.duration, 0);
  const avgDuration = connectedCalls > 0 ? (totalDuration / connectedCalls / 60).toFixed(1) : 0;

  html += `
    <div style="margin-top: 15px; padding: 12px; background: #e8f5e9; border-radius: 6px; border-left: 4px solid #28a745;">
      <strong style="color: #333;">Summary:</strong>
      <span style="margin-left: 15px; color: #666;">Total Records: <strong>${totalCalls}</strong></span>
      <span style="margin-left: 15px; color: #28a745;">Connected: <strong>${connectedCalls}</strong></span>
      <span style="margin-left: 15px; color: #dc3545;">Failed: <strong>${failedCalls}</strong></span>
      <span style="margin-left: 15px; color: #333;">Avg Duration: <strong>${avgDuration} min</strong></span>
    </div>
  `;

  cdrList.innerHTML = html;
}

// Apply CDR date/time filter
function applyCDRFilter() {
  renderCDRRecords();
}

// Clear CDR filter
function clearCDRFilter() {
  document.getElementById('cdrFilterFrom').value = '';
  document.getElementById('cdrFilterTo').value = '';
  renderCDRRecords();
}

// Close the number details panel
function closeNumberDetails() {
  const panel = document.getElementById('numberDetailsPanel');
  const cdrSection = document.getElementById('cdrRecordsSection');
  panel.style.display = 'none';
  cdrSection.style.display = 'none'; // Also hide CDR when closing
}

// Reset all statistics for all numbers
function resetAllStatistics() {
  // Confirm before resetting
  const confirmReset = confirm('⚠️ Are you sure you want to reset ALL statistics for ALL numbers?\n\nThis will:\n- Clear all call counts\n- Clear total minutes\n- Clear last call information\n- Clear SIP errors\n\nThis action cannot be undone!');

  if (!confirmReset) {
    return;
  }

  // Reset statistics for all numbers
  state.numbers.forEach(number => {
    if (number.stats) {
      number.stats = {
        totalCalls: 0,
        connectedCalls: 0,
        failedCalls: 0,
        totalMinutes: 0,
        lastCallTime: null,
        lastCallStatus: null,
        lastSipError: null
      };
    }
  });

  // Save to localStorage
  saveNumbers();

  // Update the display
  updateAutoDialerNumbersList();

  // Show success message
  alert('✅ All statistics have been reset successfully!');

  console.log('📊 All statistics reset');
}

// Reset all CDR records
function resetAllCDRs() {
  // Confirm before resetting
  const confirmReset = confirm('⚠️ Are you sure you want to delete ALL Call Detail Records (CDRs)?\n\nThis will:\n- Delete all call history\n- Remove all CDR records for all numbers\n- Clear the call history tab\n\nThis action cannot be undone!');

  if (!confirmReset) {
    return;
  }

  // Clear all call history
  state.callHistory = [];

  // Save to localStorage
  saveHistory();

  // Refresh displays
  renderHistory();

  // If CDR panel is open, refresh it
  const cdrSection = document.getElementById('cdrRecordsSection');
  if (cdrSection && cdrSection.style.display !== 'none') {
    renderCDRRecords();
  }

  // Show success message
  alert('✅ All CDR records have been deleted successfully!');

  console.log('🗑️ All CDRs reset');
}

// Reset statistics for a single number (currently shown in details panel)
function resetSingleNumberStatistics() {
  if (!window.currentDetailNumber) {
    alert('❌ No number selected');
    return;
  }

  // Find the number in the state
  const numberData = state.numbers.find(n => n.number === window.currentDetailNumber);

  if (!numberData) {
    alert('❌ Number not found');
    return;
  }

  const label = numberData.label || window.currentDetailNumber;

  // Confirm before resetting
  const confirmReset = confirm(`⚠️ Reset statistics for ${label}?\n\nThis will clear:\n- All call counts\n- Total minutes\n- Last call information\n- SIP errors\n\nThis action cannot be undone!`);

  if (!confirmReset) {
    return;
  }

  // Reset statistics
  numberData.stats = {
    totalCalls: 0,
    connectedCalls: 0,
    failedCalls: 0,
    totalMinutes: 0,
    lastCallTime: null,
    lastCallStatus: null,
    lastSipError: null
  };

  // Save to localStorage
  saveNumbers();

  // Update the display
  updateAutoDialerNumbersList();

  // Refresh the detail panel with new data
  const index = state.numbers.indexOf(numberData);
  showNumberDetails(index);

  // Show success message
  alert(`✅ Statistics reset for ${label}`);

  console.log(`📊 Statistics reset for ${window.currentDetailNumber}`);
}

// Asterisk Configuration Functions
function generatePjsipConfig() {
  const trunkHost = elements.asteriskTrunkHost.value.trim();
  const trunkPort = elements.asteriskTrunkPort.value.trim();
  const registerUser = elements.asteriskRegisterUser.value.trim();
  const registerPassword = elements.asteriskRegisterPassword.value.trim();
  const callerId = elements.asteriskCallerId.value.trim();
  const codecs = elements.asteriskCodecs.value.trim();

  return `; PJSIP Configuration for WebRTC Gateway
; Generated by SIP Dialer

[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:${elements.asteriskWebRTCPort.value}

[transport-udp]
type=transport
protocol=udp
bind=0.0.0.0:5060

; Browser WebRTC Endpoint
[1001]
type=endpoint
context=from-internal
disallow=all
allow=${codecs}
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
server_uri=sip:${trunkHost}:${trunkPort}
client_uri=sip:${registerUser}@${trunkHost}:${trunkPort}
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
allow=${codecs}
transport=transport-udp
from_user=${callerId}
from_domain=${trunkHost}
aors=vos3000-aor
outbound_auth=vos3000-auth
direct_media=no
trust_id_inbound=yes
send_pai=yes

[vos3000-aor]
type=aor
contact=sip:${trunkHost}:${trunkPort}

; Identify incoming calls from VOS3000
[vos3000-identify]
type=identify
endpoint=vos3000-endpoint
match=${trunkHost}
`;
}

function generateExtensionsConfig() {
  const callerId = elements.asteriskCallerId.value.trim();

  return `; Dialplan Configuration
; Generated by SIP Dialer

[from-internal]
; Route calls with + prefix
exten => _+.,1,NoOp(Dialing \${EXTEN})
same => n,Set(CALLERID(num)=${callerId})
same => n,Dial(PJSIP/\${EXTEN}@vos3000-endpoint,60)
same => n,Hangup()

; Route regular numeric calls
exten => _X.,1,NoOp(Dialing \${EXTEN})
same => n,Set(CALLERID(num)=${callerId})
same => n,Dial(PJSIP/\${EXTEN}@vos3000-endpoint,60)
same => n,Hangup()

[from-vos3000]
; Handle incoming calls from VOS3000
exten => _X.,1,NoOp(Incoming call from VOS3000: \${EXTEN})
same => n,Dial(PJSIP/1001)
same => n,Hangup()
`;
}

function updateConfigPreviews() {
  elements.pjsipConfigPreview.textContent = generatePjsipConfig();
  elements.extensionsConfigPreview.textContent = generateExtensionsConfig();
}

function showAsteriskStatus(message, type = 'info') {
  elements.asteriskConfigStatus.style.display = 'block';
  elements.asteriskConfigStatus.textContent = message;

  // Set color based on type
  if (type === 'success') {
    elements.asteriskConfigStatus.style.background = '#d4edda';
    elements.asteriskConfigStatus.style.color = '#155724';
    elements.asteriskConfigStatus.style.border = '1px solid #c3e6cb';
  } else if (type === 'error') {
    elements.asteriskConfigStatus.style.background = '#f8d7da';
    elements.asteriskConfigStatus.style.color = '#721c24';
    elements.asteriskConfigStatus.style.border = '1px solid #f5c6cb';
  } else if (type === 'warning') {
    elements.asteriskConfigStatus.style.background = '#fff3cd';
    elements.asteriskConfigStatus.style.color = '#856404';
    elements.asteriskConfigStatus.style.border = '1px solid #ffeeba';
  } else {
    elements.asteriskConfigStatus.style.background = '#d1ecf1';
    elements.asteriskConfigStatus.style.color = '#0c5460';
    elements.asteriskConfigStatus.style.border = '1px solid #bee5eb';
  }
}

async function applyAsteriskConfig() {
  showAsteriskStatus('Applying configuration...', 'info');
  updateConfigPreviews();

  const configData = {
    trunkHost: elements.asteriskTrunkHost.value.trim(),
    trunkPort: elements.asteriskTrunkPort.value.trim(),
    registerUser: elements.asteriskRegisterUser.value.trim(),
    registerPassword: elements.asteriskRegisterPassword.value.trim(),
    callerId: elements.asteriskCallerId.value.trim(),
    codecs: elements.asteriskCodecs.value.trim(),
    webRTCPort: elements.asteriskWebRTCPort.value.trim()
  };

  // Save to localStorage
  localStorage.setItem('asteriskConfig', JSON.stringify(configData));

  try {
    // Send configuration to backend API
    const response = await fetch('http://localhost:3000/api/asterisk/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(configData)
    });

    const result = await response.json();

    if (result.success) {
      if (result.warning) {
        showAsteriskStatus(`⚠️ ${result.message}\n\nWarning: ${result.warning}`, 'warning');
      } else {
        showAsteriskStatus(`✅ ${result.message}`, 'success');
      }
      console.log('[ASTERISK CONFIG] Configuration applied successfully:', result);
    } else {
      showAsteriskStatus(`❌ Error: ${result.error}`, 'error');
      console.error('[ASTERISK CONFIG] Failed:', result.error);
    }

  } catch (error) {
    console.error('[ASTERISK CONFIG] Network error:', error);
    showAsteriskStatus(
      `❌ Failed to connect to backend server. Make sure the backend is running on http://localhost:3000\n\nError: ${error.message}`,
      'error'
    );
  }
}

function regenerateAsteriskConfig() {
  showAsteriskStatus('Regenerating configuration files...', 'info');
  updateConfigPreviews();

  showAsteriskStatus(
    '✅ Configuration files regenerated! Check the preview below.',
    'success'
  );
}

async function restartAsterisk() {
  showAsteriskStatus('Attempting to restart Asterisk...', 'info');

  try {
    const response = await fetch('http://localhost:3000/api/asterisk/restart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (result.success) {
      showAsteriskStatus(`✅ ${result.message}`, 'success');
      console.log('[ASTERISK] Restarted successfully');

      // Wait a bit and reconnect if disconnected
      setTimeout(() => {
        if (!state.connected) {
          showAsteriskStatus('✅ Asterisk restarted. You can now reconnect.', 'success');
        }
      }, 3000);
    } else {
      showAsteriskStatus(`❌ Error: ${result.error}`, 'error');
      console.error('[ASTERISK] Restart failed:', result.error);
    }

  } catch (error) {
    console.error('[ASTERISK] Network error:', error);
    showAsteriskStatus(
      `❌ Failed to connect to backend server.\n\nManual restart: docker compose restart asterisk\n\nError: ${error.message}`,
      'error'
    );
  }
}

function loadAsteriskConfig() {
  const saved = localStorage.getItem('asteriskConfig');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      elements.asteriskTrunkHost.value = config.trunkHost || '104.248.249.40';
      elements.asteriskTrunkPort.value = config.trunkPort || '5060';
      elements.asteriskRegisterUser.value = config.registerUser || '4942139974006';
      elements.asteriskRegisterPassword.value = config.registerPassword || 'msowu204$';
      elements.asteriskCallerId.value = config.callerId || '4942139974006';
      elements.asteriskCodecs.value = config.codecs || 'alaw,ulaw';
      elements.asteriskWebRTCPort.value = config.webRTCPort || '8088';

      console.log('[ASTERISK CONFIG] Loaded from localStorage');
    } catch (e) {
      console.error('[ASTERISK CONFIG] Failed to load:', e);
    }
  }
}

// Render numbers list
function renderNumbers() {
  elements.numbersList.innerHTML = '';

  if (state.numbers.length === 0) {
    elements.numbersList.innerHTML = '<p style="text-align: center; color: #999;">No numbers added yet. Add some numbers above!</p>';
    return;
  }

  state.numbers.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'number-card';
    const minDur = item.minDuration || 180;
    const maxDur = item.maxDuration || 240;
    card.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 10px;">
        <input type="checkbox" class="number-checkbox" data-index="${index}" style="margin-top: 5px; width: 20px; height: 20px; cursor: pointer;">
        <div style="flex: 1;">
          <div class="number">${item.number}</div>
          <div class="label">${item.label}</div>
          <div style="font-size: 11px; color: #666; margin: 5px 0;">
            Auto-hangup: ${Math.floor(minDur / 60)}m${minDur % 60}s - ${Math.floor(maxDur / 60)}m${maxDur % 60}s
          </div>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-success" onclick="makeCall('${item.number}', '${item.label}', ${index})">
          📞 Call
        </button>
        <button class="btn btn-danger" onclick="removeNumber(${index})">
          🗑️
        </button>
      </div>
    `;
    elements.numbersList.appendChild(card);
  });

  // Add event listeners to checkboxes to update auto dialer list
  document.querySelectorAll('.number-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', updateAutoDialerNumbersList);
  });

  // Update auto dialer numbers list
  updateAutoDialerNumbersList();
}

// Render call history
function renderHistory() {
  elements.callHistory.innerHTML = '';

  if (state.callHistory.length === 0) {
    elements.callHistory.innerHTML = '<p style="text-align: center; color: #999;">No call history yet</p>';
    return;
  }

  state.callHistory.forEach(call => {
    const item = document.createElement('div');
    item.className = `history-item ${call.status}`;

    const durationText = call.duration > 0
      ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
      : 'Not answered';

    item.innerHTML = `
      <div>
        <div class="number">${call.label || call.number}</div>
        <div class="time">${call.time}</div>
      </div>
      <div class="duration">${durationText}</div>
    `;
    elements.callHistory.appendChild(item);
  });
}

// Event Listeners
elements.connectBtn.addEventListener('click', connect);
elements.disconnectBtn.addEventListener('click', disconnect);
elements.addNumberBtn.addEventListener('click', addNumber);
elements.importExcelBtn.addEventListener('click', importFromExcel);
elements.callSelectedBtn.addEventListener('click', callSelectedNumbers);
elements.selectAllBtn.addEventListener('click', selectAllNumbers);
elements.deselectAllBtn.addEventListener('click', deselectAllNumbers);
elements.startAutoDialerBtn.addEventListener('click', startAutoDialer);
elements.stopAutoDialerBtn.addEventListener('click', stopAutoDialer);
elements.hangupBtn.addEventListener('click', hangup);
elements.muteBtn.addEventListener('click', toggleMute);
elements.volumeControl.addEventListener('input', adjustVolume);

// Auto-format time inputs to HH:MM format
function formatTimeInput(input) {
  let value = input.value.replace(/[^0-9]/g, ''); // Remove non-digits

  if (value.length >= 2) {
    let hours = value.substring(0, 2);
    let minutes = value.substring(2, 4);

    // Validate hours (00-23)
    if (parseInt(hours) > 23) hours = '23';

    // Validate minutes (00-59)
    if (minutes && parseInt(minutes) > 59) minutes = '59';

    if (minutes) {
      input.value = hours + ':' + minutes;
    } else if (value.length > 2) {
      input.value = hours + ':';
    }
  }
}

elements.autoDialerWorkingHoursStart.addEventListener('input', (e) => {
  formatTimeInput(e.target);
});

elements.autoDialerWorkingHoursEnd.addEventListener('input', (e) => {
  formatTimeInput(e.target);
});

// Asterisk configuration event listeners
elements.applyAsteriskConfigBtn.addEventListener('click', applyAsteriskConfig);
elements.regenerateAsteriskConfigBtn.addEventListener('click', regenerateAsteriskConfig);
elements.restartAsteriskBtn.addEventListener('click', restartAsterisk);

// Update config previews when values change
const asteriskInputs = [
  elements.asteriskTrunkHost,
  elements.asteriskTrunkPort,
  elements.asteriskRegisterUser,
  elements.asteriskRegisterPassword,
  elements.asteriskCallerId,
  elements.asteriskCodecs,
  elements.asteriskWebRTCPort
];

asteriskInputs.forEach(input => {
  input.addEventListener('input', updateConfigPreviews);
});

// Enter key support
elements.newNumber.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addNumber();
});

elements.newNumberLabel.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addNumber();
});

elements.password.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') connect();
});

// Initialize when DOM and JsSIP are ready
function initialize() {
  // Check if JsSIP is loaded
  if (typeof JsSIP === 'undefined') {
    console.error('JsSIP library failed to load. Please check your internet connection.');
    elements.connectionStatus.textContent = 'Error: JsSIP library not loaded';
    elements.connectionStatus.classList.add('disconnected');
    elements.connectBtn.disabled = true;
    return;
  }

  loadData();
  renderNumbers();
  renderHistory();
  renderAutoDialerActiveCalls(); // Initialize active calls display
  elements.connectionStatus.classList.add('disconnected');

  // Load and initialize Asterisk configuration
  loadAsteriskConfig();
  updateConfigPreviews();

  // Set initial volume
  elements.remoteAudio.volume = 0.8;

  // Auto-hangup event listeners
  elements.autoHangupEnabled.addEventListener('change', (e) => {
    state.autoHangupConfig.enabled = e.target.checked;
    console.log('Auto-hangup:', state.autoHangupConfig.enabled ? 'enabled' : 'disabled');
  });

  elements.autoHangupMin.addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    if (value > 0) {
      state.autoHangupConfig.minSeconds = value;
      console.log('Auto-hangup min set to:', value, 'seconds');
    }
  });

  elements.autoHangupMax.addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && value >= state.autoHangupConfig.minSeconds) {
      state.autoHangupConfig.maxSeconds = value;
      console.log('Auto-hangup max set to:', value, 'seconds');
    } else if (value < state.autoHangupConfig.minSeconds) {
      alert('Max duration must be greater than or equal to min duration');
      e.target.value = state.autoHangupConfig.maxSeconds;
    }
  });

  // Initialize TTS voices
  function loadVoices() {
    const voices = speechSynthesis.getVoices();
    elements.ivrVoice.innerHTML = '';
    voices.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${voice.name} (${voice.lang})`;
      if (voice.default) {
        option.selected = true;
      }
      elements.ivrVoice.appendChild(option);
    });
  }

  // Load voices (may need to wait for them to be ready)
  loadVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // TTS rate slider
  elements.ivrRate.addEventListener('input', (e) => {
    elements.ivrRateValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  // TTS pitch slider
  elements.ivrPitch.addEventListener('input', (e) => {
    elements.ivrPitchValue.textContent = parseFloat(e.target.value).toFixed(1);
  });

  // Test IVR button
  elements.testIvrBtn.addEventListener('click', () => {
    const utterance = new SpeechSynthesisUtterance(elements.ivrMessageText.value);
    const selectedVoiceIndex = elements.ivrVoice.selectedIndex;
    const voices = speechSynthesis.getVoices();

    if (voices[selectedVoiceIndex]) {
      utterance.voice = voices[selectedVoiceIndex];
    }

    utterance.rate = parseFloat(elements.ivrRate.value);
    utterance.pitch = parseFloat(elements.ivrPitch.value);

    speechSynthesis.cancel(); // Stop any ongoing speech
    speechSynthesis.speak(utterance);

    console.log('🔊 Testing IVR message');
  });

  console.log('Production SIP Dialer initialized with JsSIP');
  console.log('Ready to make real SIP calls with audio!');
}

// Run initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Setup session event handlers after other functions to avoid hoisting issues
function setupSessionHandlers(session, callData) {
  session.on('sending', (e) => {
    console.log('[TIMING] INVITE sent at', Date.now(), 'for', callData.number);

    // Update stats: increment total calls
    if (callData.numberIndex !== undefined && state.numbers[callData.numberIndex]) {
      if (!state.numbers[callData.numberIndex].stats) {
        state.numbers[callData.numberIndex].stats = {
          totalCalls: 0, connectedCalls: 0, failedCalls: 0, totalMinutes: 0,
          lastCallTime: null, lastCallStatus: null, lastSipError: null
        };
      }
      state.numbers[callData.numberIndex].stats.totalCalls++;
      saveNumbers();
      updateAutoDialerNumbersList();
    }
  });

  session.on('progress', (e) => {
    console.log('[TIMING] Call in progress (180/183 received) at', Date.now(), 'for', callData.number);
    callData.status = 'ringing';
    updateCallDisplay();
    // Ringback tone disabled - no sound when call is ringing
    // elements.ringbackTone.play().catch(() => { });
  });

  session.on('accepted', (e) => {
    console.log('[TIMING] Call accepted (200 OK) at', Date.now(), 'for', callData.number);
    elements.ringbackTone.pause();
    elements.ringbackTone.currentTime = 0;

    callData.status = 'connected';
    callData.connectTime = new Date();

    // Update stats: increment connected calls
    if (callData.numberIndex !== undefined && state.numbers[callData.numberIndex]) {
      if (!state.numbers[callData.numberIndex].stats) {
        state.numbers[callData.numberIndex].stats = {
          totalCalls: 0, connectedCalls: 0, failedCalls: 0, totalMinutes: 0,
          lastCallTime: null, lastCallStatus: null, lastSipError: null
        };
      }
      state.numbers[callData.numberIndex].stats.connectedCalls++;
      state.numbers[callData.numberIndex].stats.lastCallTime = new Date();
      state.numbers[callData.numberIndex].stats.lastCallStatus = 'connected';
      state.numbers[callData.numberIndex].stats.lastSipError = null;
      saveNumbers();
      updateAutoDialerNumbersList();
    }

    updateCallDisplay();

    // Start call duration timer
    startCallTimer(callData);

    // Start auto-hangup timer with random duration
    if (state.autoHangupConfig.enabled) {
      const minMs = callData.minDuration * 1000;
      const maxMs = callData.maxDuration * 1000;
      const randomDuration = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
      const durationSeconds = Math.floor(randomDuration / 1000);

      console.log(`[AUTO-HANGUP] Call to ${callData.number} will end in ${durationSeconds} seconds (${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s)`);

      callData.autoHangupAt = Date.now() + randomDuration;

      callData.autoHangupTimer = setTimeout(() => {
        console.log('[AUTO-HANGUP] Automatically ending call to', callData.number);
        hangupCall(callData);
      }, randomDuration);

      // Start countdown display
      startCountdownTimer(callData);
    }
  });

  session.on('confirmed', async (e) => {
    console.log('Call confirmed for', callData.number);

    // Get remote stream and store it with this call
    const remoteStream = new MediaStream();
    const receivers = session.connection.getReceivers();

    receivers.forEach((receiver) => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });

    // Store stream with call data
    callData.remoteStream = remoteStream;

    // Do NOT auto-play audio - user must click on call card to listen
    // Put all new calls on hold by default and send IVR hold music to caller
    console.log('Call connected - on hold by default (click to listen):', callData.number);
    console.log('📞 Sending IVR/hold music to caller:', callData.number);

    // Wait a moment for the connection to be fully established
    setTimeout(async () => {
      // Send TTS IVR or hold music TO the caller (not to PC speakers)
      await sendTTSIVRToCall(callData);
    }, 500);

    // Enable call controls
    elements.hangupBtn.disabled = false;
    elements.muteBtn.disabled = false;

    updateCallDisplay();
  });

  session.on('ended', (e) => {
    console.log('Call ended:', callData.number, e.cause);
    endCall(callData, e.cause);
  });

  session.on('failed', (e) => {
    console.error('❌ Call failed:', callData.number, '- Cause:', e.cause);
    console.error('❌ Call failed - Full event:', e);
    const sipError = e.message ? `${e.message.status_code} ${e.message.reason_phrase}` : e.cause;
    if (e.message) {
      console.error('❌ SIP Response:', e.message.status_code, e.message.reason_phrase);
    }

    // Update stats: increment failed calls and store error
    if (callData.numberIndex !== undefined && state.numbers[callData.numberIndex]) {
      if (!state.numbers[callData.numberIndex].stats) {
        state.numbers[callData.numberIndex].stats = {
          totalCalls: 0, connectedCalls: 0, failedCalls: 0, totalMinutes: 0,
          lastCallTime: null, lastCallStatus: null, lastSipError: null
        };
      }
      state.numbers[callData.numberIndex].stats.failedCalls++;
      state.numbers[callData.numberIndex].stats.lastCallTime = new Date();
      state.numbers[callData.numberIndex].stats.lastCallStatus = 'failed';
      state.numbers[callData.numberIndex].stats.lastSipError = sipError;
      saveNumbers();
      updateAutoDialerNumbersList();
    }

    // Stop ringback tone on failure
    elements.ringbackTone.pause();
    elements.ringbackTone.currentTime = 0;
    endCall(callData, 'Call Failed: ' + e.cause + (e.message ? ' (' + e.message.status_code + ')' : ''));
  });

  session.on('peerconnection', (e) => {
    console.log('Peer connection created');

    e.peerconnection.addEventListener('addstream', (event) => {
      console.log('Remote stream added');
      // Do NOT auto-assign stream to audio element - this is handled in 'confirmed' event
      // elements.remoteAudio.srcObject = event.stream;
    });

    // Extra ICE diagnostics to pinpoint setup delay
    const pc = e.peerconnection;
    const t0 = performance.now();
    pc.addEventListener('icegatheringstatechange', () => {
      console.log('[ICE] gathering ->', pc.iceGatheringState, Math.round(performance.now() - t0) + 'ms');
    });
    pc.addEventListener('iceconnectionstatechange', () => {
      console.log('[ICE] connection ->', pc.iceConnectionState, Math.round(performance.now() - t0) + 'ms');
    });
    pc.addEventListener('connectionstatechange', () => {
      console.log('[ICE] overall connection ->', pc.connectionState, Math.round(performance.now() - t0) + 'ms');
    });
  });
}

// ==================== AI VOICE CONVERSATION ====================

// AI Voice State
const aiVoiceState = {
  session: null,
  conversationSteps: [],
  keywordBranches: [],
  currentStepIndex: 0,
  isRunning: false,
  audioContext: null,
  mediaStreamDestination: null,
  mode: 'script', // 'script', 'dynamic', 'keyword'
  recognition: null,
  isListening: false,
  isSpeaking: false, // Track when AI is speaking to prevent echo
  isProcessing: false, // Track when AI is processing to prevent multiple simultaneous responses
  messageQueue: [], // Queue for messages received while AI is busy
  lastSpokenText: '', // Track last AI speech to detect echo
  lastSpokenTime: 0, // Timestamp of last AI speech
  conversationHistory: [],
  currentBranch: 'main',
  aiConfig: {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-3.5-turbo',
    conversationLanguage: 'en',
    systemPrompt: 'You are a helpful and professional AI assistant conducting a phone conversation. Be concise, friendly, and natural in your responses.'
  },
  ttsConfig: {
    voice: 'alloy',
    model: 'tts-1',
    speed: 1.0
  }
};

// Initialize AI Voice UI
function initAIVoiceUI() {
  // Set up event listeners
  document.getElementById('startAICallBtn').addEventListener('click', startAICall);
  document.getElementById('hangupAICallBtn').addEventListener('click', hangupAICall);
  document.getElementById('addConversationStepBtn').addEventListener('click', addConversationStep);
  document.getElementById('addKeywordBranchBtn').addEventListener('click', addKeywordBranch);
  document.getElementById('testAIVoiceBtn').addEventListener('click', testAIVoice);
  document.getElementById('testAIConnectionBtn').addEventListener('click', testAIConnection);
  document.getElementById('clearAILogBtn').addEventListener('click', clearAILog);

  // AI Mode selection
  document.getElementById('aiMode').addEventListener('change', (e) => {
    aiVoiceState.mode = e.target.value;
    updateAIModeUI();
  });

  // OpenAI TTS Settings
  document.getElementById('openaiTTSVoice').addEventListener('change', (e) => {
    aiVoiceState.ttsConfig.voice = e.target.value;
    saveTTSConfig();
  });

  document.getElementById('openaiTTSModel').addEventListener('change', (e) => {
    aiVoiceState.ttsConfig.model = e.target.value;
    saveTTSConfig();
  });

  document.getElementById('openaiTTSSpeed').addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    aiVoiceState.ttsConfig.speed = speed;
    document.getElementById('openaiTTSSpeedValue').textContent = speed.toFixed(2);
    saveTTSConfig();
  });

  // AI Config listeners
  document.getElementById('aiProvider').addEventListener('change', (e) => {
    aiVoiceState.aiConfig.provider = e.target.value;
    updateAIModelOptions();
  });

  document.getElementById('aiApiKey').addEventListener('change', (e) => {
    aiVoiceState.aiConfig.apiKey = e.target.value;
    saveAIConfig();
  });

  document.getElementById('aiModel').addEventListener('change', (e) => {
    aiVoiceState.aiConfig.model = e.target.value;
    saveAIConfig();
  });

  document.getElementById('aiSystemPrompt').addEventListener('change', (e) => {
    aiVoiceState.aiConfig.systemPrompt = e.target.value;
    saveAIConfig();
  });

  // Conversation language listener
  document.getElementById('aiConversationLanguage').addEventListener('change', (e) => {
    const language = e.target.value;
    aiVoiceState.aiConfig.conversationLanguage = language;
    updateRecognitionLanguage(language);
    saveAIConfig();
  });

  // Use language template button
  document.getElementById('useLanguageTemplateBtn').addEventListener('click', () => {
    const language = document.getElementById('aiConversationLanguage').value;
    const template = getNativeLanguageTemplate(language);
    document.getElementById('aiSystemPrompt').value = template;
    aiVoiceState.aiConfig.systemPrompt = template;
    saveAIConfig();
  });

  // Load saved data
  loadConversationSteps();
  loadKeywordBranches();
  loadAIConfig();
  loadTTSConfig();
  renderConversationSteps();
  renderKeywordBranches();
  updateAIModeUI();
}

// Update AI Mode UI
function updateAIModeUI() {
  const mode = aiVoiceState.mode;
  const description = document.getElementById('aiModeDescription');

  // Hide all mode-specific sections
  document.getElementById('scriptedModeConfig').style.display = 'none';
  document.getElementById('dynamicAIConfig').style.display = 'none';
  document.getElementById('keywordModeConfig').style.display = 'none';
  document.getElementById('speechRecognitionSettings').style.display = 'none';

  // Show relevant sections based on mode
  if (mode === 'script') {
    description.innerHTML = '📜 Scripted Mode: AI follows pre-defined conversation steps in sequence.';
    description.style.background = '#e8f4f8';
    description.style.color = '#0066cc';
    document.getElementById('scriptedModeConfig').style.display = 'block';
  } else if (mode === 'dynamic') {
    description.innerHTML = '🤖 Dynamic AI Mode: AI uses ChatGPT/Claude to generate real-time responses based on caller input. Speech recognition required.';
    description.style.background = '#f0e8ff';
    description.style.color = '#6600cc';
    document.getElementById('dynamicAIConfig').style.display = 'block';
    document.getElementById('speechRecognitionSettings').style.display = 'block';
  } else if (mode === 'keyword') {
    description.innerHTML = '🔑 Keyword-Based Mode: AI responds based on keywords detected in caller speech. Create branches for different conversation paths.';
    description.style.background = '#e8fff0';
    description.style.color = '#00aa44';
    document.getElementById('keywordModeConfig').style.display = 'block';
    document.getElementById('speechRecognitionSettings').style.display = 'block';
  }
}

// Update AI Model Options
function updateAIModelOptions() {
  const provider = aiVoiceState.aiConfig.provider;
  const modelSelect = document.getElementById('aiModel');

  modelSelect.innerHTML = '';

  if (provider === 'openai') {
    modelSelect.innerHTML = `
      <option value="gpt-4">GPT-4</option>
      <option value="gpt-4-turbo">GPT-4 Turbo</option>
      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
    `;
  } else if (provider === 'anthropic') {
    modelSelect.innerHTML = `
      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
      <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
      <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
    `;
  } else if (provider === 'local') {
    modelSelect.innerHTML = `
      <option value="llama2">Llama 2</option>
      <option value="mistral">Mistral</option>
      <option value="custom">Custom Model</option>
    `;
  }
}

// Get native language template
function getNativeLanguageTemplate(language) {
  const templates = {
    'en': 'You are a helpful and professional AI assistant conducting a phone conversation in English. Be concise, friendly, and natural in your responses. Speak like a native English speaker.',

    'tr': 'Sen profesyonel ve yardımsever bir Türk müşteri temsilcisisin ve telefon görüşmesi yapıyorsun. Doğal, samimi ve kibar bir şekilde konuş. Cevaplarını kısa ve öz tut. Türk kültürüne uygun, sıcak ve içten bir üslup kullan. Türkçe deyimler ve günlük konuşma dilini kullanabilirsin.',

    'sr': 'Ti si profesionalni i ljubazni AI asistent koji vodi telefonski razgovor na srpskom jeziku. Govori prirodno, prijateljski i učtivo. Odgovori treba da budu kratki i jasni. Koristi srpsku kulturu i pristup u komunikaciji. Možeš koristiti srpske izraze i svakodnevni govorni jezik.',

    'mk': 'Ти си професионален и љубезен AI асистент кој води телефонски разговор на македонски јазик. Зборувај природно, пријателски и учтиво. Одговорите треба да бидат кратки и јасни. Користи македонска култура и пристап во комуникацијата. Можеш да користиш македонски изрази и секојдневен говорен јазик.',

    'es': 'Eres un asistente de IA profesional y servicial que mantiene una conversación telefónica en español. Habla de forma natural, amigable y cortés. Mantén tus respuestas breves y claras. Habla como un hablante nativo de español.',

    'fr': 'Vous êtes un assistant IA professionnel et serviable menant une conversation téléphonique en français. Parlez de manière naturelle, amicale et polie. Gardez vos réponses courtes et claires. Parlez comme un locuteur natif français.',

    'de': 'Sie sind ein professioneller und hilfsbereiter KI-Assistent, der ein Telefongespräch auf Deutsch führt. Sprechen Sie natürlich, freundlich und höflich. Halten Sie Ihre Antworten kurz und klar. Sprechen Sie wie ein deutscher Muttersprachler.',

    'it': 'Sei un assistente AI professionale e disponibile che conduce una conversazione telefonica in italiano. Parla in modo naturale, amichevole e cortese. Mantieni le tue risposte brevi e chiare. Parla come un madrelingua italiano.',

    'pt': 'Você é um assistente de IA profissional e prestativo conduzindo uma conversa telefônica em português. Fale de forma natural, amigável e cortês. Mantenha suas respostas curtas e claras. Fale como um falante nativo de português.',

    'zh': '你是一位专业且乐于助人的AI助手，正在用中文进行电话交谈。说话要自然、友好、礼貌。保持回答简短明了。像母语人士一样说话。',

    'ja': 'あなたは日本語で電話会話を行うプロフェッショナルで親切なAIアシスタントです。自然で友好的、丁寧に話してください。回答は簡潔明瞭に保ってください。日本語のネイティブスピーカーのように話してください。',

    'ko': '당신은 한국어로 전화 대화를 진행하는 전문적이고 친절한 AI 어시스턴트입니다. 자연스럽고 친근하며 공손하게 말하세요. 답변은 간결하고 명확하게 유지하세요. 한국어 원어민처럼 말하세요.'
  };

  return templates[language] || templates['en'];
}

// Update recognition language based on conversation language
function updateRecognitionLanguage(conversationLang) {
  const languageMap = {
    'en': 'en-US',
    'tr': 'tr-TR',
    'sr': 'sr-RS',
    'mk': 'mk-MK',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-BR',
    'zh': 'zh-CN',
    'ja': 'ja-JP',
    'ko': 'ko-KR'
  };

  const recognitionLang = languageMap[conversationLang] || 'en-US';
  const recognitionSelect = document.getElementById('recognitionLanguage');
  if (recognitionSelect) {
    recognitionSelect.value = recognitionLang;
  }
}

// Get language code for TTS (Google Translate TTS format)
function getLanguageCode(conversationLang) {
  const languageMap = {
    'en': 'en',
    'tr': 'tr',
    'sr': 'sr',
    'mk': 'mk',
    'es': 'es',
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    'zh': 'zh-CN',
    'ja': 'ja',
    'ko': 'ko'
  };

  return languageMap[conversationLang] || 'en';
}

// Save AI Config
function saveAIConfig() {
  localStorage.setItem('aiVoiceConfig', JSON.stringify(aiVoiceState.aiConfig));
}

// Load AI Config
function loadAIConfig() {
  const saved = localStorage.getItem('aiVoiceConfig');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      aiVoiceState.aiConfig = { ...aiVoiceState.aiConfig, ...config };

      // Update UI
      document.getElementById('aiProvider').value = config.provider || 'openai';
      document.getElementById('aiApiKey').value = config.apiKey || '';
      document.getElementById('aiSystemPrompt').value = config.systemPrompt || aiVoiceState.aiConfig.systemPrompt;

      updateAIModelOptions();
      document.getElementById('aiModel').value = config.model || 'gpt-3.5-turbo';

      // Restore conversation language
      if (config.conversationLanguage) {
        document.getElementById('aiConversationLanguage').value = config.conversationLanguage;
        updateRecognitionLanguage(config.conversationLanguage);
      }
    } catch (e) {
      console.error('Failed to load AI config:', e);
    }
  }
}

// Save TTS Config
function saveTTSConfig() {
  localStorage.setItem('aiTTSConfig', JSON.stringify(aiVoiceState.ttsConfig));
}

// Load TTS Config
function loadTTSConfig() {
  const saved = localStorage.getItem('aiTTSConfig');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      aiVoiceState.ttsConfig = { ...aiVoiceState.ttsConfig, ...config };

      // Update UI
      document.getElementById('openaiTTSVoice').value = config.voice || 'alloy';
      document.getElementById('openaiTTSModel').value = config.model || 'tts-1';
      document.getElementById('openaiTTSSpeed').value = config.speed || 1.0;
      document.getElementById('openaiTTSSpeedValue').textContent = (config.speed || 1.0).toFixed(2);
    } catch (e) {
      console.error('Failed to load TTS config:', e);
    }
  }
}

// Test AI Connection
async function testAIConnection() {
  const provider = aiVoiceState.aiConfig.provider;
  const apiKey = aiVoiceState.aiConfig.apiKey;

  if (!apiKey) {
    alert('Please enter your API key first.');
    return;
  }

  updateAICallStatus('Testing AI connection...');

  try {
    const response = await callAI('Hello, this is a test message.', []);

    if (response) {
      alert('✅ AI Connection Successful!\n\nResponse: ' + response);
      updateAICallStatus('AI connection successful');
    }
  } catch (error) {
    alert('❌ AI Connection Failed!\n\nError: ' + error.message);
    updateAICallStatus('AI connection failed');
  }
}

// Call AI API
async function callAI(userMessage, conversationHistory) {
  const { provider, apiKey, model, systemPrompt } = aiVoiceState.aiConfig;

  if (!apiKey) {
    throw new Error('API key not configured');
  }

  if (provider === 'openai') {
    return await callOpenAI(userMessage, conversationHistory, apiKey, model, systemPrompt);
  } else if (provider === 'anthropic') {
    return await callClaude(userMessage, conversationHistory, apiKey, model, systemPrompt);
  } else {
    throw new Error('Unsupported AI provider: ' + provider);
  }
}

// Call OpenAI API
async function callOpenAI(userMessage, conversationHistory, apiKey, model, systemPrompt) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage }
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      max_tokens: 150,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Call Claude API
async function callClaude(userMessage, conversationHistory, apiKey, model, systemPrompt) {
  const messages = conversationHistory.concat([
    { role: 'user', content: userMessage }
  ]);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 150,
      system: systemPrompt,
      messages: messages
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Claude API request failed');
  }

  const data = await response.json();
  return data.content[0].text;
}

// Load available voices for TTS
function loadVoiceList() {
  const voiceSelect = document.getElementById('aiVoiceSelect');

  function populateVoices() {
    const voices = speechSynthesis.getVoices();
    voiceSelect.innerHTML = '';

    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">No voices available</option>';
      return;
    }

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Auto (Match Conversation Language)';
    voiceSelect.appendChild(defaultOption);

    // Get current conversation language
    const currentLang = aiVoiceState.aiConfig.conversationLanguage || 'en';
    const langCode = getLanguageCode(currentLang);

    // Separate voices by language match
    const matchingVoices = [];
    const otherVoices = [];

    voices.forEach((voice, index) => {
      if (voice.lang.toLowerCase().startsWith(langCode.toLowerCase())) {
        matchingVoices.push({ voice, index });
      } else {
        otherVoices.push({ voice, index });
      }
    });

    // Add matching voices first (preferred)
    if (matchingVoices.length > 0) {
      const matchingGroup = document.createElement('optgroup');
      matchingGroup.label = `🎯 Recommended for ${currentLang.toUpperCase()}`;
      matchingVoices.forEach(({ voice, index }) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        matchingGroup.appendChild(option);
      });
      voiceSelect.appendChild(matchingGroup);
    }

    // Add all other voices
    if (otherVoices.length > 0) {
      const otherGroup = document.createElement('optgroup');
      otherGroup.label = 'Other Voices';
      otherVoices.forEach(({ voice, index }) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        otherGroup.appendChild(option);
      });
      voiceSelect.appendChild(otherGroup);
    }
  }

  populateVoices();

  // Chrome loads voices asynchronously
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoices;
  }
}

// Add a conversation step
function addConversationStep() {
  const text = prompt('Enter the text for AI to say:');
  if (!text) return;

  const pauseAfter = prompt('Pause after speaking (seconds):', '2');

  aiVoiceState.conversationSteps.push({
    id: Date.now(),
    text: text,
    pauseAfter: parseFloat(pauseAfter) || 2
  });

  saveConversationSteps();
  renderConversationSteps();
}

// Render conversation steps
function renderConversationSteps() {
  const container = document.getElementById('aiConversationSteps');

  if (aiVoiceState.conversationSteps.length === 0) {
    container.innerHTML = '<p style="color: #999; font-style: italic;">No conversation steps added. Click "Add Conversation Step" to create your script.</p>';
    return;
  }

  container.innerHTML = aiVoiceState.conversationSteps.map((step, index) => `
    <div style="background: white; padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #007bff;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <strong style="color: #007bff;">Step ${index + 1}</strong>
        <div>
          <button onclick="editConversationStep(${index})" style="background: #ffc107; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px;">✏️ Edit</button>
          <button onclick="deleteConversationStep(${index})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🗑️ Delete</button>
        </div>
      </div>
      <div style="color: #333; margin-bottom: 5px;">${escapeHtml(step.text)}</div>
      <div style="color: #666; font-size: 12px;">⏱️ Pause after: ${step.pauseAfter}s</div>
    </div>
  `).join('');
}

// Edit conversation step
function editConversationStep(index) {
  const step = aiVoiceState.conversationSteps[index];
  const newText = prompt('Edit text:', step.text);
  if (newText === null) return;

  const newPause = prompt('Pause after speaking (seconds):', step.pauseAfter);

  aiVoiceState.conversationSteps[index].text = newText;
  aiVoiceState.conversationSteps[index].pauseAfter = parseFloat(newPause) || step.pauseAfter;

  saveConversationSteps();
  renderConversationSteps();
}

// Add keyword branch
function addKeywordBranch() {
  const keywords = prompt('Enter keywords (comma-separated) to trigger this branch:\nExample: yes, sure, okay');
  if (!keywords) return;

  const response = prompt('Enter AI response for this branch:');
  if (!response) return;

  const nextAction = prompt('After response, what should happen?\n1. Continue listening\n2. End call\n3. Go to main flow\n\nEnter 1, 2, or 3:', '1');

  aiVoiceState.keywordBranches.push({
    id: Date.now(),
    keywords: keywords.split(',').map(k => k.trim().toLowerCase()),
    response: response,
    nextAction: nextAction === '2' ? 'end' : nextAction === '3' ? 'main' : 'continue'
  });

  saveKeywordBranches();
  renderKeywordBranches();
}

// Render keyword branches
function renderKeywordBranches() {
  const container = document.getElementById('keywordBranches');

  if (aiVoiceState.keywordBranches.length === 0) {
    container.innerHTML = '<p style="color: #999; font-style: italic;">No keyword branches added. Click "Add Keyword Branch" to create conversation paths.</p>';
    return;
  }

  container.innerHTML = aiVoiceState.keywordBranches.map((branch, index) => `
    <div style="background: white; padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid #28a745;">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
        <strong style="color: #28a745;">Branch ${index + 1}</strong>
        <div>
          <button onclick="editKeywordBranch(${index})" style="background: #ffc107; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px;">✏️ Edit</button>
          <button onclick="deleteKeywordBranch(${index})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">🗑️ Delete</button>
        </div>
      </div>
      <div style="color: #666; font-size: 12px; margin-bottom: 5px;">
        🔑 Keywords: <strong>${branch.keywords.join(', ')}</strong>
      </div>
      <div style="color: #333; margin-bottom: 5px;">💬 Response: ${escapeHtml(branch.response)}</div>
      <div style="color: #666; font-size: 12px;">
        ➡️ Then: ${branch.nextAction === 'end' ? 'End Call' : branch.nextAction === 'main' ? 'Return to Main Flow' : 'Continue Listening'}
      </div>
    </div>
  `).join('');
}

// Edit keyword branch
function editKeywordBranch(index) {
  const branch = aiVoiceState.keywordBranches[index];
  const keywords = prompt('Edit keywords (comma-separated):', branch.keywords.join(', '));
  if (keywords === null) return;

  const response = prompt('Edit AI response:', branch.response);
  if (response === null) return;

  const nextAction = prompt('After response:\n1. Continue listening\n2. End call\n3. Go to main flow\n\nEnter 1, 2, or 3:',
    branch.nextAction === 'end' ? '2' : branch.nextAction === 'main' ? '3' : '1');

  aiVoiceState.keywordBranches[index].keywords = keywords.split(',').map(k => k.trim().toLowerCase());
  aiVoiceState.keywordBranches[index].response = response;
  aiVoiceState.keywordBranches[index].nextAction = nextAction === '2' ? 'end' : nextAction === '3' ? 'main' : 'continue';

  saveKeywordBranches();
  renderKeywordBranches();
}

// Delete keyword branch
function deleteKeywordBranch(index) {
  if (!confirm('Delete this keyword branch?')) return;

  aiVoiceState.keywordBranches.splice(index, 1);
  saveKeywordBranches();
  renderKeywordBranches();
}

// Save keyword branches
function saveKeywordBranches() {
  localStorage.setItem('aiKeywordBranches', JSON.stringify(aiVoiceState.keywordBranches));
}

// Load keyword branches
function loadKeywordBranches() {
  const saved = localStorage.getItem('aiKeywordBranches');
  if (saved) {
    try {
      aiVoiceState.keywordBranches = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load keyword branches:', e);
      aiVoiceState.keywordBranches = [];
    }
  }
}

// Initialize Speech Recognition with OpenAI Whisper or Browser API
function initSpeechRecognition() {
  const method = document.getElementById('recognitionMethod').value;
  const language = document.getElementById('recognitionLanguage').value;
  const continuous = document.getElementById('recognitionContinuous').checked;

  // For AI calls, strongly recommend Whisper to avoid echo
  if (aiVoiceState.session && method === 'browser') {
    console.warn('[SPEECH] WARNING: Browser recognition may cause echo during calls. Whisper is recommended.');
    logAIConversation('⚠️ WARNING', 'Browser recognition may echo. Consider switching to Whisper.');
  }

  // Use Browser Speech Recognition (fallback/default)
  if (method === 'browser') {
    return initBrowserSpeechRecognition(language, continuous);
  } else {
    // Use OpenAI Whisper
    return initWhisperSpeechRecognition(language, continuous);
  }
}

// Browser Speech Recognition (Google)
function initBrowserSpeechRecognition(language, continuous) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    logAIConversation('❌ ERROR', 'Speech recognition not supported in this browser');
    return null;
  }

  const recognition = new SpeechRecognition();
  const interimResults = document.getElementById('recognitionInterimResults').checked;

  recognition.lang = language;
  recognition.continuous = continuous;
  recognition.interimResults = interimResults;
  recognition.maxAlternatives = 3; // Increased from 1 for better accuracy

  // Enhanced settings for better recognition
  if ('grammars' in recognition) {
    // Can add custom grammars if needed
  }

  recognition.onstart = () => {
    aiVoiceState.isListening = true;
    console.log('[SPEECH] Browser speech recognition started - listening...');
    logAIConversation('🎤 SYSTEM', 'Browser speech recognition started - listening...');
  };

  recognition.onresult = (event) => {
    const results = event.results;
    const lastResult = results[results.length - 1];

    // Get the best transcript (highest confidence)
    let transcript = lastResult[0].transcript;
    let confidence = lastResult[0].confidence;

    // Check alternatives for better confidence
    for (let i = 1; i < lastResult.length; i++) {
      if (lastResult[i].confidence > confidence) {
        transcript = lastResult[i].transcript;
        confidence = lastResult[i].confidence;
      }
    }

    if (lastResult.isFinal) {
      console.log('[SPEECH] Final transcript:', transcript, 'Confidence:', confidence);

      // Only ignore if AI is currently speaking (not just processing)
      // This allows queuing of user questions while AI is thinking
      if (aiVoiceState.isSpeaking) {
        console.log('[SPEECH] Ignoring - AI is speaking:', transcript);
        return;
      }

      // Filter out very short or low confidence results
      if (transcript.trim().length < 2) {
        console.log('[SPEECH] Ignoring - too short:', transcript);
        return;
      }

      logAIConversation('👤 CALLER', transcript + (confidence ? ` (${Math.round(confidence * 100)}%)` : ''));
      handleCallerSpeech(transcript);
    } else if (interimResults) {
      console.log('[SPEECH] Interim:', transcript);
      logAIConversation('🎤 INTERIM', transcript);
    }
  };

  recognition.onerror = (event) => {
    console.error('[SPEECH] Error:', event.error);

    // Don't log every no-speech error to avoid spam
    if (event.error !== 'no-speech') {
      logAIConversation('❌ ERROR', 'Speech recognition error: ' + event.error);
    }

    // Auto-restart on common recoverable errors
    if (['no-speech', 'audio-capture', 'network'].includes(event.error) && aiVoiceState.isRunning) {
      console.log('[SPEECH] Auto-restarting after error:', event.error);
      setTimeout(() => {
        if (aiVoiceState.isRunning && aiVoiceState.recognition) {
          try {
            aiVoiceState.recognition.start();
          } catch (e) {
            console.error('[SPEECH] Failed to restart:', e);
          }
        }
      }, 1000);
    }
  };

  recognition.onend = () => {
    aiVoiceState.isListening = false;
    console.log('[SPEECH] Recognition ended');
    logAIConversation('🎤 SYSTEM', 'Speech recognition ended');

    // Auto-restart if conversation is still running
    if (aiVoiceState.isRunning && continuous) {
      console.log('[SPEECH] Auto-restarting continuous recognition');
      setTimeout(() => {
        if (aiVoiceState.isRunning && aiVoiceState.recognition) {
          try {
            aiVoiceState.recognition.start();
          } catch (e) {
            console.error('[SPEECH] Failed to restart:', e);
            // Try again after longer delay
            setTimeout(() => {
              if (aiVoiceState.isRunning && aiVoiceState.recognition) {
                try {
                  aiVoiceState.recognition.start();
                } catch (e2) {
                  console.error('[SPEECH] Failed to restart again:', e2);
                }
              }
            }, 2000);
          }
        }
      }, 500);
    }
  };

  return recognition;
}

// OpenAI Whisper Speech Recognition
function initWhisperSpeechRecognition(language, continuous) {
  // Create audio recording setup for Whisper
  const whisperRecognition = {
    lang: language,
    continuous: continuous,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    recordingInterval: null,

    start: async function () {
      try {
        // Get audio stream from the call (remote audio)
        if (!aiVoiceState.session || !aiVoiceState.session.connection) {
          logAIConversation('❌ ERROR', 'No active call to listen to');
          return;
        }

        const pc = aiVoiceState.session.connection;
        const receivers = pc.getReceivers();
        const audioReceiver = receivers.find(r => r.track && r.track.kind === 'audio');

        if (!audioReceiver) {
          logAIConversation('❌ ERROR', 'No audio stream available');
          return;
        }

        // Create media stream from remote audio
        const stream = new MediaStream([audioReceiver.track]);

        // Create MediaRecorder with appropriate format
        const options = { mimeType: 'audio/webm' };
        this.mediaRecorder = new MediaRecorder(stream, options);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = async () => {
          if (this.audioChunks.length > 0) {
            const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            console.log('[WHISPER] Audio blob created:', audioBlob.size, 'bytes from', this.audioChunks.length, 'chunks');
            this.audioChunks = [];

            // Only send if we have meaningful data
            if (audioBlob.size > 0) {
              // Send to OpenAI Whisper for transcription
              await this.transcribeAudio(audioBlob);
            }
          } else {
            console.log('[WHISPER] No audio chunks collected');
          }
        };

        // Start recording
        this.isRecording = true;
        this.mediaRecorder.start();

        // Process audio in chunks (every 3 seconds for continuous recognition)
        if (this.continuous) {
          this.recordingInterval = setInterval(() => {
            if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording') {
              console.log('[WHISPER] Processing audio chunk...');
              this.mediaRecorder.stop();
              // Small delay before restarting to ensure clean chunk separation
              setTimeout(() => {
                if (this.isRecording && this.mediaRecorder) {
                  this.mediaRecorder.start();
                }
              }, 100);
            }
          }, 2500); // Reduced to 2.5 seconds for more responsive detection
        }

        aiVoiceState.isListening = true;
        logAIConversation('🎤 SYSTEM', 'OpenAI Whisper speech recognition started - listening for caller...');

        if (this.onstart) this.onstart();

      } catch (error) {
        console.error('Failed to start Whisper recognition:', error);
        logAIConversation('❌ ERROR', 'Failed to start speech recognition: ' + error.message);
        if (this.onerror) this.onerror({ error: error.message });
      }
    },

    stop: function () {
      this.isRecording = false;

      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }

      aiVoiceState.isListening = false;
      logAIConversation('🎤 SYSTEM', 'Speech recognition ended');

      if (this.onend) this.onend();
    },

    transcribeAudio: async function (audioBlob) {
      try {
        // Validate audio blob
        if (!audioBlob || audioBlob.size === 0) {
          console.log('[WHISPER] Skipping empty audio blob');
          return;
        }

        // Skip if blob is too small (less than 1KB likely means no speech)
        if (audioBlob.size < 1024) {
          console.log('[WHISPER] Skipping too small audio blob:', audioBlob.size, 'bytes');
          return;
        }

        console.log('[WHISPER] Sending audio blob:', audioBlob.size, 'bytes');

        // Create form data properly
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('language', this.lang.split('-')[0]); // Convert 'tr-TR' to 'tr'

        // Send to backend for Whisper transcription
        const response = await fetch('http://localhost:3000/api/whisper-transcribe', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Whisper transcription failed: ${errorText}`);
        }

        const data = await response.json();

        if (data.text && data.text.trim()) {
          const transcript = data.text.trim();
          console.log('[WHISPER] Transcribed:', transcript);

          // Only ignore if AI is currently speaking (to prevent echo)
          if (aiVoiceState.isSpeaking) {
            console.log('[WHISPER] Ignoring - AI is speaking:', transcript);
            return;
          }

          // If AI is processing, queue the message
          if (aiVoiceState.isProcessing) {
            console.log('[WHISPER] Queuing message - AI is busy:', transcript);
            aiVoiceState.messageQueue.push(transcript);
            logAIConversation('📥 QUEUED', transcript);
            return;
          }

          // Call the result handler
          if (this.onresult) {
            const event = {
              results: [[{
                transcript: transcript,
                confidence: 1.0
              }]],
              resultIndex: 0
            };
            event.results[0].isFinal = true;
            this.onresult(event);
          } else {
            // Direct handling
            logAIConversation('👤 CALLER', transcript);
            await handleCallerSpeech(transcript);
          }
        }

      } catch (error) {
        console.error('Whisper transcription error:', error);
        logAIConversation('❌ ERROR', 'Transcription failed: ' + error.message);

        // Restart recognition on error if continuous
        if (this.isRecording && this.continuous && aiVoiceState.isRunning) {
          setTimeout(() => {
            if (aiVoiceState.isRunning && this.isRecording) {
              // Already running, just continue
            }
          }, 1000);
        }

        if (this.onerror) this.onerror({ error: error.message });
      }
    },

    onstart: null,
    onresult: null,
    onerror: null,
    onend: null
  };

  return whisperRecognition;
}

// Handle caller speech
async function handleCallerSpeech(transcript) {
  // Only ignore if AI is currently speaking (to prevent echo)
  if (aiVoiceState.isSpeaking) {
    console.log('[SPEECH] Ignoring - AI is speaking:', transcript);
    return;
  }

  // Echo detection: Check if transcript matches what AI just said
  const timeSinceLastSpeech = Date.now() - aiVoiceState.lastSpokenTime;
  if (timeSinceLastSpeech < 5000) { // Within 5 seconds of AI speaking
    const similarity = calculateSimilarity(transcript.toLowerCase(), aiVoiceState.lastSpokenText.toLowerCase());
    if (similarity > 0.6) { // More than 60% similar
      console.log('[SPEECH] ECHO DETECTED - Ignoring (similarity:', Math.round(similarity * 100) + '%):', transcript);
      logAIConversation('🔇 ECHO BLOCKED', transcript);
      return;
    }
  }

  // If AI is processing, queue the message for later
  if (aiVoiceState.isProcessing) {
    console.log('[SPEECH] Queuing message - AI is busy:', transcript);
    aiVoiceState.messageQueue.push(transcript);
    logAIConversation('📥 QUEUED', transcript);
    return;
  }

  const mode = aiVoiceState.mode;

  if (mode === 'dynamic') {
    // Dynamic AI mode - get AI response
    await handleDynamicAIResponse(transcript);
  } else if (mode === 'keyword') {
    // Keyword mode - check for keyword matches
    await handleKeywordResponse(transcript);
  }

  // Process next queued message if any
  await processMessageQueue();
}

// Calculate similarity between two strings (simple Levenshtein-based)
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  // Simple word-based comparison for speed
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);

  let matches = 0;
  const totalWords = Math.max(words1.length, words2.length);

  words1.forEach(word1 => {
    if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
      matches++;
    }
  });

  return matches / totalWords;
}

// Process queued messages
async function processMessageQueue() {
  if (aiVoiceState.messageQueue.length > 0 && !aiVoiceState.isProcessing && !aiVoiceState.isSpeaking) {
    const nextMessage = aiVoiceState.messageQueue.shift();
    console.log('[SPEECH] Processing queued message:', nextMessage);
    logAIConversation('📤 PROCESSING QUEUE', nextMessage);

    const mode = aiVoiceState.mode;
    if (mode === 'dynamic') {
      await handleDynamicAIResponse(nextMessage);
    } else if (mode === 'keyword') {
      await handleKeywordResponse(nextMessage);
    }

    // Check if there are more messages
    if (aiVoiceState.messageQueue.length > 0) {
      await processMessageQueue();
    }
  }
}

// Handle dynamic AI response
async function handleDynamicAIResponse(userMessage) {
  // Set processing flag to prevent multiple simultaneous responses
  aiVoiceState.isProcessing = true;

  try {
    updateAICallStatus('🤖 AI is thinking...');

    // Add user message to conversation history
    aiVoiceState.conversationHistory.push({
      role: 'user',
      content: userMessage
    });

    // Get AI response
    const aiResponse = await callAI(userMessage, aiVoiceState.conversationHistory);

    // Add AI response to conversation history
    aiVoiceState.conversationHistory.push({
      role: 'assistant',
      content: aiResponse
    });

    // Speak the response
    updateAICallStatus('🤖 AI is speaking...');
    await speakText(aiResponse, true);

    updateAICallStatus('🎤 Listening for caller response...');

  } catch (error) {
    console.error('Error getting AI response:', error);
    logAIConversation('❌ ERROR', 'Failed to get AI response: ' + error.message);
    updateAICallStatus('❌ AI Error');
  } finally {
    // Always clear processing flag
    aiVoiceState.isProcessing = false;

    // Process any queued messages
    setTimeout(() => processMessageQueue(), 500);
  }
}

// Handle keyword response
async function handleKeywordResponse(transcript) {
  const lowerTranscript = transcript.toLowerCase();

  // Find matching keyword branch
  const matchingBranch = aiVoiceState.keywordBranches.find(branch => {
    return branch.keywords.some(keyword => lowerTranscript.includes(keyword));
  });

  if (matchingBranch) {
    logAIConversation('🔑 SYSTEM', 'Keyword detected - triggering branch');

    // Speak the branch response
    await speakText(matchingBranch.response, true);

    // Handle next action
    if (matchingBranch.nextAction === 'end') {
      logAIConversation('📞 SYSTEM', 'Branch action: Ending call');
      setTimeout(() => hangupAICall(), 2000);
    } else if (matchingBranch.nextAction === 'main') {
      logAIConversation('🔄 SYSTEM', 'Branch action: Returning to main flow');
      aiVoiceState.currentBranch = 'main';
    } else {
      logAIConversation('👂 SYSTEM', 'Branch action: Continuing to listen');
    }
  } else {
    // No keyword match - use default response
    const defaultResponse = "I understand. Is there anything else I can help you with?";
    await speakText(defaultResponse, true);
  }
}

// Delete conversation step
function deleteConversationStep(index) {
  if (!confirm('Delete this conversation step?')) return;

  aiVoiceState.conversationSteps.splice(index, 1);
  saveConversationSteps();
  renderConversationSteps();
}

// Save conversation steps to localStorage
function saveConversationSteps() {
  localStorage.setItem('aiConversationSteps', JSON.stringify(aiVoiceState.conversationSteps));
}

// Load conversation steps from localStorage
function loadConversationSteps() {
  const saved = localStorage.getItem('aiConversationSteps');
  if (saved) {
    try {
      aiVoiceState.conversationSteps = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load conversation steps:', e);
      aiVoiceState.conversationSteps = [];
    }
  }
}

// Test AI voice with OpenAI TTS
async function testAIVoice() {
  const testText = 'Hello, this is a test of the OpenAI text-to-speech system. I am speaking in ' + aiVoiceState.ttsConfig.voice + ' voice.';

  try {
    logAIConversation('🔊 TEST', 'Testing OpenAI TTS with voice: ' + aiVoiceState.ttsConfig.voice);

    // Fetch TTS audio from OpenAI via backend
    const response = await fetch('http://localhost:3000/api/openai-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: testText,
        voice: aiVoiceState.ttsConfig.voice,
        model: aiVoiceState.ttsConfig.model,
        speed: aiVoiceState.ttsConfig.speed
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI TTS Error Response:', errorText);
      throw new Error(`OpenAI TTS failed: ${response.status} - ${errorText}`);
    }

    const audioBlob = await response.blob();

    if (audioBlob.size === 0) {
      throw new Error('Received empty audio blob');
    }

    console.log('Received audio blob:', audioBlob.size, 'bytes');
    const audioUrl = URL.createObjectURL(audioBlob);

    // Play the audio locally
    const audio = new Audio(audioUrl);

    audio.onerror = (e) => {
      console.error('Audio playback error:', e);
      logAIConversation('❌ ERROR', 'Audio playback failed');
    };

    await audio.play();

    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      logAIConversation('✅ TEST', 'Test completed successfully');
    };

  } catch (error) {
    console.error('Error testing OpenAI TTS:', error);
    logAIConversation('❌ ERROR', 'Test failed: ' + error.message);
    alert('Failed to test OpenAI TTS. Error: ' + error.message + '\n\nCheck browser console for details.');
  }
}

// Speak text using OpenAI TTS
async function speakText(text, sendToCall = true) {
  // Set speaking flag to prevent echo
  aiVoiceState.isSpeaking = true;

  // Track what AI is saying for echo detection
  aiVoiceState.lastSpokenText = text;
  aiVoiceState.lastSpokenTime = Date.now();

  try {
    if (sendToCall && aiVoiceState.session) {
      // Send TTS to active call using OpenAI TTS (with Google fallback)
      await sendAITTSToCall(text);
    } else {
      // Test locally - try OpenAI TTS first, fallback to Google TTS
      try {
        const response = await fetch('http://localhost:3000/api/openai-tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: text,
            voice: aiVoiceState.ttsConfig.voice,
            model: aiVoiceState.ttsConfig.model,
            speed: aiVoiceState.ttsConfig.speed
          })
        });

        if (!response.ok) {
          throw new Error('OpenAI TTS failed');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        // Play the audio locally
        const audio = new Audio(audioUrl);

        // Wait for audio to finish before clearing isSpeaking flag
        await new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.play();
        });
      } catch (openaiError) {
        // Fallback to Google TTS
        console.warn('[TTS] OpenAI TTS failed for testing, using Google TTS:', openaiError.message);

        try {
          const language = aiVoiceState.aiConfig.conversationLanguage || 'en';
          const langCode = getLanguageCode(language);
          const speed = aiVoiceState.ttsConfig.speed || 1.0;

          const googleTTSUrl = `http://localhost:3000/api/tts?text=${encodeURIComponent(text)}&speed=${speed}&lang=${langCode}`;
          const googleResponse = await fetch(googleTTSUrl);

          if (!googleResponse.ok) {
            throw new Error('Google TTS also failed');
          }

          const audioBlob = await googleResponse.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          const audio = new Audio(audioUrl);

          // Wait for audio to finish before clearing isSpeaking flag
          await new Promise((resolve) => {
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(audioUrl);
              resolve();
            };
            audio.play();
          });
        } catch (googleError) {
          console.error('Both TTS methods failed:', googleError);
          logAIConversation('❌ ERROR', 'TTS failed: ' + googleError.message);
        }
      }
    }

    // Log to conversation
    logAIConversation('🤖 AI', text);
  } finally {
    // Always clear speaking flag after TTS completes
    aiVoiceState.isSpeaking = false;
  }
}

// Send TTS to call using OpenAI TTS API via backend
async function sendAITTSToCall(text) {
  if (!aiVoiceState.session || aiVoiceState.session.isEnded()) {
    console.error('No active AI call session');
    return;
  }

  try {
    // Reuse existing audio context or create new one
    if (!aiVoiceState.audioContext) {
      aiVoiceState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      aiVoiceState.mediaStreamDestination = aiVoiceState.audioContext.createMediaStreamDestination();
    }

    const audioContext = aiVoiceState.audioContext;
    const destination = aiVoiceState.mediaStreamDestination;

    let audioBlob;
    let audioUrl;

    try {
      // Use OpenAI TTS settings from config
      const voice = aiVoiceState.ttsConfig.voice;
      const model = aiVoiceState.ttsConfig.model;
      const ttsSpeed = aiVoiceState.ttsConfig.speed;

      // Fetch TTS audio from OpenAI via backend
      const ttsUrl = `http://localhost:3000/api/openai-tts`;
      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: voice,
          model: model,
          speed: ttsSpeed
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI TTS request failed');
      }

      audioBlob = await response.blob();
      console.log('[TTS] Using OpenAI TTS');
    } catch (openaiError) {
      // Fallback to Google TTS if OpenAI fails
      console.warn('[TTS] OpenAI TTS failed, falling back to Google TTS:', openaiError.message);
      logAIConversation('⚠️ WARNING', 'OpenAI TTS unavailable, using Google TTS fallback');

      const language = aiVoiceState.aiConfig.conversationLanguage || 'en';
      const langCode = getLanguageCode(language);
      const speed = aiVoiceState.ttsConfig.speed || 1.0;

      const googleTTSUrl = `http://localhost:3000/api/tts?text=${encodeURIComponent(text)}&speed=${speed}&lang=${langCode}`;
      const googleResponse = await fetch(googleTTSUrl);

      if (!googleResponse.ok) {
        throw new Error('Both OpenAI and Google TTS failed');
      }

      audioBlob = await googleResponse.blob();
      console.log('[TTS] Using Google TTS fallback');
    }

    audioUrl = URL.createObjectURL(audioBlob);

    // Create audio element
    const audio = new Audio(audioUrl);

    // Create source from audio element
    const source = audioContext.createMediaElementSource(audio);
    source.connect(destination);

    // Get audio track and add to call session
    const audioTrack = destination.stream.getAudioTracks()[0];
    const pc = aiVoiceState.session.connection;

    if (pc) {
      const senders = pc.getSenders();
      const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');

      if (audioSender) {
        await audioSender.replaceTrack(audioTrack);
      }
    }

    // Play audio
    await audio.play();

    // Wait for audio to finish
    await new Promise(resolve => {
      audio.onended = resolve;
    });

    // Restore original microphone track
    if (state.localStream && pc) {
      const originalAudioTrack = state.localStream.getAudioTracks()[0];
      const senders = pc.getSenders();
      const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');

      if (audioSender && originalAudioTrack) {
        await audioSender.replaceTrack(originalAudioTrack);
      }
    }

    // Clean up
    URL.revokeObjectURL(audioUrl);

  } catch (error) {
    console.error('Error sending AI TTS to call:', error);
    logAIConversation('❌ ERROR', 'Failed to send TTS: ' + error.message);
  }
}

// Start AI call
async function startAICall() {
  const number = document.getElementById('aiVoiceNumber').value.trim();
  const label = document.getElementById('aiVoiceLabel').value.trim();
  const mode = aiVoiceState.mode;

  if (!number) {
    alert('Please enter a phone number to call.');
    return;
  }

  if (!state.connected) {
    alert('Please connect to SIP server first (Configuration tab).');
    return;
  }

  // Validate mode-specific requirements
  if (mode === 'script' && aiVoiceState.conversationSteps.length === 0) {
    alert('Please add at least one conversation step first.');
    return;
  }

  if (mode === 'dynamic') {
    if (!aiVoiceState.aiConfig.apiKey) {
      alert('Please enter your AI API key in the Dynamic AI Configuration section.');
      return;
    }
    if (!document.getElementById('aiEnableSpeechRecognition').checked) {
      if (!confirm('Speech recognition is disabled. Dynamic AI mode works best with speech recognition enabled. Continue anyway?')) {
        return;
      }
    }
  }

  if (mode === 'keyword' && aiVoiceState.keywordBranches.length === 0) {
    alert('Please add at least one keyword branch first.');
    return;
  }

  // Clear previous state
  clearAILog();
  aiVoiceState.conversationHistory = [];
  aiVoiceState.currentBranch = 'main';

  // Update UI
  updateAICallStatus('📞 Calling ' + number + '...');
  document.getElementById('startAICallBtn').disabled = true;
  document.getElementById('hangupAICallBtn').disabled = false;

  // Make the call
  logAIConversation('📞 SYSTEM', `Initiating call to ${number} (Mode: ${mode})`);

  const callOptions = {
    mediaConstraints: {
      audio: true,
      video: false
    },
    pcConfig: {
      iceServers: []
    }
  };

  try {
    aiVoiceState.session = state.userAgent.call('sip:' + number + '@' + state.config.realm, callOptions);

    if (!aiVoiceState.session) {
      throw new Error('Failed to create call session');
    }

    // Set up session event handlers
    aiVoiceState.session.on('accepted', () => {
      logAIConversation('✅ SYSTEM', 'Call connected');
      updateAICallStatus('✅ Connected - AI conversation starting...');

      // Start AI conversation based on mode
      if (mode === 'script') {
        startScriptedConversation();
      } else if (mode === 'dynamic') {
        startDynamicConversation();
      } else if (mode === 'keyword') {
        startKeywordConversation();
      }
    });

    aiVoiceState.session.on('confirmed', () => {
      logAIConversation('📞 SYSTEM', 'Call confirmed');
    });

    aiVoiceState.session.on('ended', () => {
      logAIConversation('📞 SYSTEM', 'Call ended');
      updateAICallStatus('Call ended');
      stopSpeechRecognition();
      resetAICallUI();
    });

    aiVoiceState.session.on('failed', (e) => {
      logAIConversation('❌ ERROR', 'Call failed: ' + (e.cause || 'Unknown error'));
      updateAICallStatus('❌ Call failed');
      stopSpeechRecognition();
      resetAICallUI();
    });

  } catch (error) {
    console.error('Error starting AI call:', error);
    logAIConversation('❌ ERROR', error.message);
    updateAICallStatus('❌ Error: ' + error.message);
    resetAICallUI();
  }
}

// Start scripted conversation
async function startScriptedConversation() {
  aiVoiceState.isRunning = true;
  aiVoiceState.currentStepIndex = 0;

  logAIConversation('🤖 SYSTEM', 'Starting scripted conversation...');

  // Execute conversation steps sequentially
  for (let i = 0; i < aiVoiceState.conversationSteps.length; i++) {
    if (!aiVoiceState.isRunning || !aiVoiceState.session || aiVoiceState.session.isEnded()) {
      logAIConversation('⚠️ SYSTEM', 'Conversation stopped');
      break;
    }

    const step = aiVoiceState.conversationSteps[i];
    aiVoiceState.currentStepIndex = i;

    updateAICallStatus(`🤖 Speaking step ${i + 1}/${aiVoiceState.conversationSteps.length}`);

    // Speak the step
    await speakText(step.text, true);

    // Wait for pause duration
    if (step.pauseAfter > 0) {
      logAIConversation('⏸️ SYSTEM', `Pausing for ${step.pauseAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, step.pauseAfter * 1000));
    }
  }

  // Conversation complete
  if (aiVoiceState.isRunning) {
    logAIConversation('✅ SYSTEM', 'Conversation script completed');
    updateAICallStatus('✅ Conversation complete');

    // Auto hangup after conversation
    setTimeout(() => {
      if (aiVoiceState.session && !aiVoiceState.session.isEnded()) {
        hangupAICall();
      }
    }, 2000);
  }

  aiVoiceState.isRunning = false;
}

// Start dynamic AI conversation
async function startDynamicConversation() {
  aiVoiceState.isRunning = true;

  logAIConversation('🤖 SYSTEM', 'Starting dynamic AI conversation...');

  // Initialize speech recognition if enabled
  const recognitionEnabled = document.getElementById('aiEnableSpeechRecognition').checked;

  if (recognitionEnabled) {
    aiVoiceState.recognition = initSpeechRecognition();
    if (aiVoiceState.recognition) {
      try {
        aiVoiceState.recognition.start();
      } catch (e) {
        logAIConversation('❌ ERROR', 'Failed to start speech recognition: ' + e.message);
      }
    }
  }

  // Start with AI greeting
  const greetingPrompt = aiVoiceState.aiConfig.systemPrompt + '\n\nStart the conversation with a brief, friendly greeting.';

  try {
    const greeting = await callAI('Start the conversation', []);

    aiVoiceState.conversationHistory.push({
      role: 'assistant',
      content: greeting
    });

    await speakText(greeting, true);
    updateAICallStatus('🎤 Listening for caller response...');

  } catch (error) {
    logAIConversation('❌ ERROR', 'Failed to generate greeting: ' + error.message);
    updateAICallStatus('❌ AI Error');
    aiVoiceState.isRunning = false;
  }
}

// Start keyword-based conversation
async function startKeywordConversation() {
  aiVoiceState.isRunning = true;

  logAIConversation('🔑 SYSTEM', 'Starting keyword-based conversation...');

  // Initialize speech recognition if enabled
  const recognitionEnabled = document.getElementById('keywordEnableSpeechRecognition').checked;

  if (recognitionEnabled) {
    aiVoiceState.recognition = initSpeechRecognition();
    if (aiVoiceState.recognition) {
      try {
        aiVoiceState.recognition.start();
      } catch (e) {
        logAIConversation('❌ ERROR', 'Failed to start speech recognition: ' + e.message);
      }
    }
  }

  // Start with a greeting
  const greeting = "Hello! How can I help you today?";
  await speakText(greeting, true);
  updateAICallStatus('🎤 Listening for keywords...');
}

// Stop speech recognition
function stopSpeechRecognition() {
  if (aiVoiceState.recognition) {
    try {
      aiVoiceState.recognition.stop();
    } catch (e) {
      console.error('Error stopping recognition:', e);
    }
    aiVoiceState.recognition = null;
  }
  aiVoiceState.isListening = false;
}

// Start AI conversation (legacy - now split into mode-specific functions)
async function startAIConversation() {
  // This function is kept for backward compatibility
  // New code should use startScriptedConversation, startDynamicConversation, or startKeywordConversation
  const mode = aiVoiceState.mode;

  if (mode === 'script') {
    await startScriptedConversation();
  } else if (mode === 'dynamic') {
    await startDynamicConversation();
  } else if (mode === 'keyword') {
    await startKeywordConversation();
  }
}

// Hangup AI call
function hangupAICall() {
  if (aiVoiceState.session && !aiVoiceState.session.isEnded()) {
    aiVoiceState.session.terminate();
    logAIConversation('📞 SYSTEM', 'Call terminated by user');
  }

  aiVoiceState.isRunning = false;
  stopSpeechRecognition();
  resetAICallUI();
}

// Reset AI call UI
function resetAICallUI() {
  document.getElementById('startAICallBtn').disabled = false;
  document.getElementById('hangupAICallBtn').disabled = true;
  updateAICallStatus('Ready to call');

  // Clean up audio context
  if (aiVoiceState.audioContext) {
    aiVoiceState.audioContext.close();
    aiVoiceState.audioContext = null;
    aiVoiceState.mediaStreamDestination = null;
  }

  aiVoiceState.session = null;
}

// Update AI call status
function updateAICallStatus(status) {
  const queueInfo = aiVoiceState.messageQueue.length > 0
    ? ` (${aiVoiceState.messageQueue.length} queued)`
    : '';
  document.getElementById('aiCallStatus').textContent = status + queueInfo;
}

// Log AI conversation
function logAIConversation(speaker, message) {
  const log = document.getElementById('aiConversationLog');
  const timestamp = new Date().toLocaleTimeString();

  // Remove initial placeholder
  if (log.querySelector('p[style*="italic"]')) {
    log.innerHTML = '';
  }

  const entry = document.createElement('div');
  entry.style.marginBottom = '8px';
  entry.style.paddingBottom = '8px';
  entry.style.borderBottom = '1px solid #eee';

  entry.innerHTML = `
    <div style="color: #666; font-size: 11px;">${timestamp}</div>
    <div><strong style="color: ${getSpeakerColor(speaker)}">${speaker}:</strong> ${escapeHtml(message)}</div>
  `;

  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// Get speaker color
function getSpeakerColor(speaker) {
  if (speaker.includes('AI')) return '#007bff';
  if (speaker.includes('ERROR')) return '#dc3545';
  if (speaker.includes('SYSTEM')) return '#28a745';
  return '#333';
}

// Clear AI log
function clearAILog() {
  const log = document.getElementById('aiConversationLog');
  log.innerHTML = '<p style="color: #666; font-style: italic;">Conversation will appear here...</p>';
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize AI Voice UI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAIVoiceUI);
} else {
  initAIVoiceUI();
}
