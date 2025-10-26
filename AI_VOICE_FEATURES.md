# AI Voice Features Documentation

## Overview
The AI Voice tab provides advanced automated voice conversation capabilities with three distinct modes for different use cases.

---

## 🎯 Three AI Modes

### 1. 📜 Scripted Mode (Pre-defined Conversation)
- **Best for**: Standardized messages, surveys, reminders, announcements
- **How it works**: AI follows pre-written conversation steps in sequence
- **Features**:
  - Add multiple conversation steps with custom text
  - Configure pause duration between steps
  - Auto-hangup after completion
  - Fully predictable conversation flow

**Example Use Cases**:
- Appointment reminders
- Payment notifications
- Survey questionnaires
- Service announcements

### 2. 🤖 Dynamic AI Mode (Real-time AI Responses)
- **Best for**: Customer service, sales calls, complex interactions
- **How it works**: Uses ChatGPT or Claude to generate intelligent responses based on caller input
- **Requirements**:
  - API key (OpenAI or Anthropic)
  - Speech recognition enabled (recommended)
- **Features**:
  - Natural conversation flow
  - Context-aware responses
  - Custom AI personality via system prompt
  - Real-time speech recognition
  - Full conversation history tracking

**Example Use Cases**:
- Customer support calls
- Sales qualification
- Information gathering
- Complex inquiries

### 3. 🔑 Keyword-Based Mode (Branching Logic)
- **Best for**: Menu systems, simple decision trees, FAQ handling
- **How it works**: Listens for specific keywords and triggers corresponding responses
- **Features**:
  - Define keyword triggers
  - Custom response for each branch
  - Next action options (continue, end call, return to main)
  - Simple yet powerful branching logic

**Example Use Cases**:
- IVR menu systems
- FAQ automation
- Simple product queries
- Yes/No decision trees

---

## 🚀 Getting Started

### Step 1: Connect to SIP
1. Go to **Configuration** tab
2. Enter your SIP credentials
3. Click **Connect**

### Step 2: Choose AI Mode
1. Go to **AI Voice** tab
2. Select your preferred mode from the dropdown:
   - Scripted Mode
   - Dynamic AI Mode
   - Keyword-Based Mode

### Step 3: Configure Mode-Specific Settings

#### For Scripted Mode:
1. Click **➕ Add Conversation Step**
2. Enter the text AI should say
3. Set pause duration (default: 2 seconds)
4. Add more steps as needed
5. Use **✏️ Edit** or **🗑️ Delete** to modify steps

#### For Dynamic AI Mode:
1. Select AI Provider (OpenAI or Anthropic)
2. Enter your API key
3. Choose model (GPT-4, GPT-3.5, Claude 3, etc.)
4. Customize system prompt (AI personality)
5. Enable speech recognition (recommended)
6. Click **🔌 Test AI Connection** to verify

#### For Keyword-Based Mode:
1. Click **➕ Add Keyword Branch**
2. Enter trigger keywords (comma-separated)
   - Example: `yes, sure, okay, affirmative`
3. Enter AI response for this branch
4. Choose next action:
   - **1**: Continue listening
   - **2**: End call
   - **3**: Return to main flow
5. Add more branches for different keywords

### Step 4: Voice Settings
Configure voice parameters (applies to all modes):
- **Voice**: Select from system voices
- **Speech Rate**: 0.5x to 2x (1.0 = normal)
- **Speech Pitch**: 0 to 2 (1.0 = normal)
- **Pause Between Steps**: 0-10 seconds

### Step 5: Make the Call
1. Enter phone number (with country code)
2. Optional: Add a label
3. Click **📞 Start AI Call**
4. Monitor conversation in real-time via Conversation Log

---

## 🎤 Speech Recognition Settings

Available for Dynamic AI and Keyword-Based modes:

| Setting | Description | Recommended |
|---------|-------------|-------------|
| **Language** | Recognition language | Match caller's language |
| **Timeout** | Max wait time for response | 5 seconds |
| **Continuous** | Keep listening during call | ✅ Enabled |
| **Interim Results** | Show partial transcripts | ✅ Enabled |

**Supported Languages**:
- English (US, UK)
- Spanish, French, German, Italian
- Portuguese, Chinese, Japanese, Korean
- And more...

---

## 💡 Configuration Examples

### Example 1: Appointment Reminder (Scripted)
```
Step 1: "Hello, this is a reminder about your appointment tomorrow at 2 PM."
Pause: 2 seconds

Step 2: "Please call us if you need to reschedule. Thank you."
Pause: 1 second
```

### Example 2: Customer Service (Dynamic AI)
**System Prompt**:
```
You are a friendly customer service representative for ABC Company. 
Help customers with their inquiries about orders, products, and services. 
Be concise, professional, and empathetic. Keep responses under 30 words when possible.
```

**API**: OpenAI GPT-4
**Speech Recognition**: Enabled

### Example 3: Simple Menu (Keyword-Based)
```
Branch 1:
Keywords: "sales, purchase, buy, product"
Response: "I'll transfer you to our sales team. Please hold."
Next Action: End call

Branch 2:
Keywords: "support, help, problem, issue"
Response: "I'll connect you with technical support. One moment please."
Next Action: End call

Branch 3:
Keywords: "billing, payment, invoice"
Response: "Connecting you to our billing department now."
Next Action: End call
```

---

## 🔧 Advanced Features

### AI Configuration
- **Custom System Prompts**: Define AI personality and behavior
- **Model Selection**: Choose between different AI models
  - GPT-4: Most capable, slower, higher cost
  - GPT-3.5 Turbo: Fast, cost-effective
  - Claude 3 Opus: Highest quality Claude model
  - Claude 3 Sonnet: Balanced performance
  - Claude 3 Haiku: Fastest, most affordable

### Conversation Logging
Real-time transcript showing:
- 🤖 AI responses
- 👤 Caller speech (when recognition enabled)
- 📞 System events
- ❌ Errors and warnings
- ⏸️ Pause indicators

Color coding:
- **Blue**: AI messages
- **Green**: System events
- **Red**: Errors
- **Black**: Caller speech

### Test Functions
- **🔊 Test Voice**: Preview TTS settings locally
- **🔌 Test AI Connection**: Verify API credentials work

---

## 📊 Real-time Monitoring

### Call Status Indicators
- `📞 Calling...` - Initiating call
- `✅ Connected - AI conversation starting...` - Call answered
- `🤖 Speaking step X/Y` - Scripted mode progress
- `🤖 AI is thinking...` - Dynamic AI processing
- `🎤 Listening for caller response...` - Awaiting input
- `🎤 Listening for keywords...` - Keyword mode active
- `✅ Conversation complete` - All steps finished
- `❌ Call failed` - Error occurred

### Conversation Log Features
- Timestamps for every event
- Scrollable history
- Auto-scroll to latest
- Clear log button
- Persistent during call

---

## 🔐 Security & Privacy

### API Key Storage
- API keys stored locally in browser (localStorage)
- Never transmitted to our servers
- Only sent directly to OpenAI/Anthropic APIs
- You can clear anytime

### Data Privacy
- Conversation history stored locally
- Speech recognition happens in-browser (Web Speech API)
- No call recordings made
- Full control over data

---

## ⚠️ Important Notes

### Browser Compatibility
- **Chrome/Edge**: Full support ✅
- **Firefox**: Limited speech recognition
- **Safari**: Limited speech recognition
- **Recommended**: Chrome or Edge for best experience

### API Costs
- OpenAI charges per token
- Anthropic charges per token
- Monitor your usage on provider dashboards
- Typical conversation: $0.01-0.10 depending on model

### Speech Recognition Limitations
- Requires quiet environment
- May struggle with accents
- Internet connection required
- Not 100% accurate (expect 80-95%)

### Best Practices
1. **Test First**: Always test before production use
2. **Start Simple**: Begin with scripted mode, advance to dynamic
3. **Monitor Costs**: Keep track of AI API usage
4. **Clear Prompts**: Use specific, concise instructions
5. **Backup Plan**: Have human fallback for complex cases

---

## 🐛 Troubleshooting

### "Speech recognition not supported"
- Use Chrome or Edge browser
- Ensure microphone permissions granted
- Check if HTTPS (required for Web Speech API)

### "AI Connection Failed"
- Verify API key is correct
- Check internet connection
- Ensure API account has credits
- Try different model

### "Call failed"
- Verify SIP connection active
- Check phone number format (+country code)
- Ensure sufficient credits

### Speech not recognized
- Speak clearly and slowly
- Reduce background noise
- Check language setting matches caller
- Increase recognition timeout

### AI responses too slow
- Use GPT-3.5 or Claude Haiku for faster responses
- Reduce max_tokens in API calls
- Check internet speed

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review conversation logs for errors
3. Test with simple scenarios first
4. Verify all prerequisites met

---

## 🎯 Quick Reference

| Feature | Scripted | Dynamic AI | Keyword |
|---------|----------|-----------|---------|
| **Complexity** | Low | High | Medium |
| **Setup Time** | Fast | Moderate | Fast |
| **Cost** | Free | Pay-per-use | Free |
| **Flexibility** | Low | Very High | Medium |
| **API Required** | ❌ | ✅ | ❌ |
| **Speech Recognition** | Optional | Recommended | Recommended |
| **Use Case** | Fixed messages | Conversations | Menus/FAQs |

---

## 🚀 Future Enhancements

Planned features:
- Voice cloning integration
- Multi-language automatic detection
- Call recording and playback
- Advanced analytics
- A/B testing for scripts
- Integration with CRM systems

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Author**: Dialer Development Team
