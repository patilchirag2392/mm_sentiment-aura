# Sentiment Aura - Live AI-Powered Emotion Visualization

A full-stack real-time audio transcription application that visualizes emotional sentiment through generative art. Built with React, FastAPI, Deepgram, and Claude AI.

## Features

- **Real-time Audio Transcription** - Live speech-to-text using Deepgram WebSocket API
- **AI Sentiment Analysis** - Claude AI extracts emotions, sentiment scores, and keywords
- **Perlin Noise Visualization** - Beautiful generative art background that responds to emotions
- **Graceful Keyword Animations** - Keywords fade in one-by-one with smooth transitions
- **Emotion Orb** - Central visual indicator that changes color based on detected emotion
- **Cyberpunk-Organic Theme** - Unique aesthetic with bioluminescent colors

## Architecture

### Three-Part System

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Frontend  │ ◄─────► │   Backend   │ ◄─────► │  External   │
│   (React)   │         │  (FastAPI)  │         │    APIs     │
│             │         │             │         │             │
│  - Audio    │         │  - Proxy    │         │  - Deepgram │
│  - UI/UX    │         │  - Claude   │         │  - Claude   │
│  - P5.js    │         │  - API      │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
```

### Data Flow

1. User speaks → Frontend captures audio (Web Audio API)
2. Audio streams to Backend via WebSocket
3. Backend forwards to Deepgram for transcription
4. Deepgram returns transcript to Backend
5. Backend sends transcript to Frontend
6. Frontend displays transcript
7. When transcript is final, Frontend POSTs to `/api/process_text`
8. Backend calls Claude API for sentiment analysis
9. Claude returns emotion + keywords + scores
10. Frontend updates all visualizations in real-time

##  Tech Stack

### Frontend
- **React** 18.x with TypeScript
- **react-p5** - Perlin noise flow field visualization
- **Framer Motion** - Smooth animations
- **Web Audio API** - AudioWorklet for PCM audio capture
- **WebSocket** - Real-time communication

### Backend
- **FastAPI** - Modern Python web framework
- **Anthropic Claude** - AI sentiment analysis
- **WebSockets** - Proxy for Deepgram
- **Python-dotenv** - Environment management

### External APIs
- **Deepgram** - Real-time speech transcription
- **Claude (Anthropic)** - Sentiment & keyword extraction

##  Getting Started

### Prerequisites

- Node.js 16+ and npm
- Python 3.9+
- Deepgram API key
- Anthropic API key

### Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd sentiment-aura
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:
```env
DEEPGRAM_API_KEY=your_deepgram_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
PORT=8000
HOST=0.0.0.0
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
```

### Running the Application

#### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python main.py
```

Backend runs on: `http://localhost:8000`

#### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

Frontend runs on: `http://localhost:3000`

### Usage

1. Open `http://localhost:3000` in your browser
2. Wait for initialization (1.5 seconds)
3. Click **"INITIALIZE AURA"** button
4. Allow microphone permissions
5. Start speaking!
6. Watch the visualization respond to your emotions

##  Components

### Frontend Components

#### AuraVisualization
- **Perlin noise flow field** background
- Particles follow vector field
- Colors change based on emotion
- Speed changes with intensity
- Flow patterns vary with sentiment score

#### EmotionOrb
- Central visual indicator
- Animated gradient orb
- Color-coded by emotion
- Size responds to sentiment score
- Rotation speed varies with intensity

#### TranscriptDisplay
- Real-time transcript on left side
- Glass-morphism design
- Auto-scrolling
- Differentiates interim vs final transcripts

#### KeywordsDisplay
- Keywords on right side
- **Graceful one-by-one fade-in** (staggered 0.15s)
- Float-up animation
- Interactive hover effects

#### AudioPulse
- Recording button + controls
- Real-time waveform visualization
- Connection status indicator
- Frequency bars

### Backend Services

#### deepgram_proxy.py
- WebSocket proxy to Deepgram
- Handles authentication (browsers can't send auth headers)
- Bidirectional audio/transcript streaming

#### claude_service.py
- Sentiment analysis using Claude API
- Extracts emotions, keywords, and scores
- Multi-emotion detection
- Fallback handling

#### endpoints.py
- `/api/process_text` - Sentiment analysis endpoint
- `/api/health` - Health check
- `/api/ws/transcribe` - WebSocket for Deepgram proxy

##  Emotion-to-Color Mapping

| Emotion | Colors | Visual Effect |
|---------|--------|---------------|
| **Happy/Joy** | Gold, Orange, Yellow | Warm, bright particles |
| **Excited** | Pink, Tomato, Orange | Fast, energetic flow |
| **Calm** | Green, Purple, Cyan | Slow, gentle movement |
| **Neutral** | Cyan, Purple, Green | Default theme colors |
| **Sad** | Royal Blue, Navy | Cool, slower flow |
| **Angry** | Red, Dark Red | Intense, chaotic patterns |
| **Fearful** | Purple, Indigo, Magenta | Dark, mysterious |
| **Surprised** | Hot Pink, Salmon | Bright, dynamic |
| **Anxious** | Orange, Tomato | Quick, jittery movement |

## Configuration

### Audio Settings
- **Sample Rate:** 16kHz (Deepgram requirement)
- **Format:** PCM 16-bit linear
- **Channels:** Mono
- **Buffer Size:** 4096 samples

### Visualization Settings
- **Perlin Noise:** Multi-octave (2 layers)
- **Time Scale:** 0.0005 × (0.5 + intensity)
- **Space Scale:** 0.1 - (sentiment × 0.02)
- **Particle Speed:** 0.5 + intensity × 0.5

## Troubleshooting

### "WebSocket connection failed"
- Check backend is running on port 8000
- Verify `DEEPGRAM_API_KEY` in backend/.env
- Check browser console for detailed errors

### "Microphone access denied"
- Grant microphone permissions in browser
- Check system microphone settings
- Try HTTPS if on remote server

### "No transcription appearing"
- Verify Deepgram API key is valid
- Check Deepgram account has credits
- Speak clearly and loudly
- Check backend logs for errors

### "Orb/Keywords not changing"
- Check browser console for sentiment data
- Verify `ANTHROPIC_API_KEY` in backend/.env
- Check backend logs for Claude API errors

## API Endpoints

### GET /api/health
Health check endpoint
```json
{
  "status": "healthy",
  "service": "sentiment-aura-backend"
}
```

### POST /api/process_text
Analyze text sentiment
```json
// Request
{
  "text": "I'm so happy today!"
}

// Response
{
  "sentiment_score": 0.85,
  "emotion": "joy",
  "intensity": 0.8,
  "keywords": ["happy", "today"],
  "confidence": 0.9
}
```

### WebSocket /api/ws/transcribe
Real-time transcription proxy
```json
// Receives: Audio binary data
// Sends: 
{
  "type": "transcript",
  "transcript": "hello world",
  "is_final": true,
  "confidence": 0.95
}
```

## Resources

- [Perlin Noise Fields](https://sighack.com/post/getting-creative-with-perlin-noise-fields)
- [Deepgram API Docs](https://developers.deepgram.com/)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)


## Acknowledgments

- **Memory Machines** - For the project assignment
- **Deepgram** - Real-time transcription API
- **Anthropic** - Claude AI for sentiment analysis
- **P5.js Community** - Inspiration for generative art

## Author

Chirag Patil - Memory Machines Interview Assignment