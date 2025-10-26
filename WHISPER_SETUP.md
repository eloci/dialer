# OpenAI Whisper Speech Recognition Setup

## Overview
Your dialer now uses **OpenAI Whisper API** for speech recognition instead of Google's Web Speech API. Whisper provides superior accuracy for multilingual speech recognition, especially for Turkish, Serbian, and Macedonian.

## What Changed

### 1. **Frontend (script.js)**
- Replaced browser's Web Speech API with custom audio recording
- Records caller's voice from the active call in real-time
- Sends audio chunks to backend every 3 seconds (for continuous mode)
- Processes transcriptions from OpenAI Whisper

### 2. **Backend (server.js)**
- Added `/api/whisper-transcribe` endpoint
- Handles audio upload via multipart form-data
- Sends audio to OpenAI Whisper API
- Returns transcribed text to frontend

### 3. **New Dependencies**
- `multer`: Handles file uploads
- `form-data`: Creates multipart form data for OpenAI API

## Setup Instructions

### Step 1: Get OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the key (starts with `sk-...`)

### Step 2: Configure API Key
1. Open `backend/.env` file
2. Replace `your_openai_api_key_here` with your actual API key:
   ```
   OPENAI_API_KEY=sk-your-actual-key-here
   ```
3. Save the file

### Step 3: Restart Backend
The backend server needs to be restarted to load the new API key:
```bash
# Kill existing node process (if running)
taskkill /F /IM node.exe

# Start the server
node backend/server.js
```

## How It Works

### Audio Recording Flow
```
Active Call → Capture Remote Audio → Record in 3-second chunks →
Send to Backend → OpenAI Whisper API → Transcribe → 
Return Text → Process with AI → Generate Response
```

### Language Support
Whisper supports all 12 languages in your system:
- 🇹🇷 Turkish (tr-TR)
- 🇷🇸 Serbian (sr-RS)
- 🇲🇰 Macedonian (mk-MK)
- 🇺🇸 English (en-US)
- 🇪🇸 Spanish (es-ES)
- 🇫🇷 French (fr-FR)
- 🇩🇪 German (de-DE)
- 🇮🇹 Italian (it-IT)
- 🇵🇹 Portuguese (pt-PT)
- 🇨🇳 Chinese (zh-CN)
- 🇯🇵 Japanese (ja-JP)
- 🇰🇷 Korean (ko-KR)

## Features

### ✅ Advantages over Google Web Speech API
- **Better Accuracy**: Especially for accented and multilingual speech
- **More Languages**: Native support for 97+ languages
- **No Browser Limitations**: Works in all browsers
- **Professional Quality**: Same technology used by major companies
- **Continuous Recording**: Seamless audio capture from active calls

### 📊 Performance
- **Latency**: ~2-4 seconds per transcription
- **Chunk Size**: 3 seconds of audio
- **Audio Format**: WebM (automatically converted)
- **Max File Size**: 10MB per chunk

## Usage

### 1. Configure Speech Recognition
In the **AI Voice** tab:
- Enable **Speech Recognition**
- Select **Recognition Language** (e.g., Turkish)
- Enable **Continuous Recognition** for ongoing conversations
- (Interim Results option is not applicable to Whisper)

### 2. Start AI Call
1. Enter phone number
2. Click **Start AI Call**
3. Wait for call to connect
4. Speech recognition automatically starts
5. Caller speaks → Whisper transcribes → AI responds

### 3. Monitor Transcriptions
Watch the **AI Conversation Log**:
- 🎤 SYSTEM: Recognition started/stopped
- 👤 CALLER: Transcribed speech from caller
- 🤖 AI: AI's response
- ❌ ERROR: Any transcription errors

## Troubleshooting

### "OpenAI API key not configured"
- Check `backend/.env` file has valid API key
- Restart backend server after adding key

### "Whisper transcription failed"
- Check your OpenAI account has credits
- Verify API key is valid
- Check internet connection

### "No audio stream available"
- Ensure call is connected before recognition starts
- Check browser has microphone permissions
- Verify call has active audio stream

### High Latency
- Normal latency is 2-4 seconds
- Reduce chunk interval if needed (in `initSpeechRecognition()`)
- Check internet connection speed

### Audio Quality Issues
- Ensure clear phone connection
- Check audio levels in call
- Verify caller speaks clearly

## Cost Estimation

OpenAI Whisper API Pricing (as of 2024):
- **$0.006 per minute** of audio transcribed
- 3-second chunks = ~$0.0003 per chunk
- 1-minute conversation = ~$0.006
- 10-minute conversation = ~$0.06
- Very affordable for business use!

## API Reference

### Frontend: `initSpeechRecognition()`
```javascript
const recognition = initSpeechRecognition();

recognition.start();   // Start recording and transcribing
recognition.stop();    // Stop recording

// Event handlers (compatible with Web Speech API)
recognition.onstart = () => { /* Started */ };
recognition.onresult = (event) => { /* Transcription received */ };
recognition.onerror = (event) => { /* Error occurred */ };
recognition.onend = () => { /* Stopped */ };
```

### Backend: `/api/whisper-transcribe`
```javascript
POST /api/whisper-transcribe
Content-Type: multipart/form-data

Body:
- audio: Audio file (webm, mp3, wav)
- language: Language code (tr, en, sr, mk, etc.)

Response:
{
  "text": "Transcribed text from audio"
}
```

## Next Steps

1. **Get your OpenAI API Key** from [platform.openai.com](https://platform.openai.com/)
2. **Add it to `backend/.env`**
3. **Restart the backend server**
4. **Test with a call** in Turkish, Serbian, or Macedonian!

## Support

For issues or questions:
- Check OpenAI API status: [status.openai.com](https://status.openai.com/)
- Review API logs in backend console
- Monitor conversation log in frontend
- Check browser console for errors

---

**Enjoy superior speech recognition with OpenAI Whisper! 🎤✨**
