import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { DeepgramService } from '../services/deepgramService';
import './AudioPulse.css';

interface AudioPulseProps {
  onEmotionDetected: (emotion: string) => void;
  onAudioLevel?: (level: number) => void;
  onTranscript?: (transcript: string, isFinal: boolean) => void;
}

const AudioPulse: React.FC<AudioPulseProps> = ({ 
  onEmotionDetected,
  onAudioLevel,
  onTranscript
}) => {
  const { 
    audioState, 
    startRecording, 
    stopRecording, 
    getFrequencyData, 
    getWaveformData,
    startAudioStreaming,
    stopAudioStreaming
  } = useAudioCapture();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const deepgramRef = useRef<DeepgramService | null>(null);
  
  const [frequencyBars, setFrequencyBars] = useState<number[]>(new Array(16).fill(0));
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [transcriptState, setTranscriptState] = useState({
    current: '',
    interim: '',
    full: [] as string[]
  });

  const initializeDeepgram = useCallback(async () => {
    console.log(' Initializing connection to backend...');
    console.log('   Backend should be running at: http://localhost:8000');
    console.log('   WebSocket endpoint: ws://localhost:8000/api/ws/transcribe');

    try {
      setConnectionStatus('connecting');
      
      deepgramRef.current = new DeepgramService();
      
      deepgramRef.current.addEventListener('connected', () => {
        console.log(' Backend connected to Deepgram successfully!');
        setConnectionStatus('connected');
      });

      deepgramRef.current.addEventListener('transcript', (event: any) => {
        const result = event.detail;
        console.log(' Transcript received:', result);
        
        if (result.isFinal) {
          const finalText = result.transcript.trim();
          if (finalText) {
            setTranscriptState(prev => ({
              current: finalText,
              interim: '',
              full: [...prev.full, finalText]
            }));
            if (onTranscript) {
              onTranscript(finalText, true);
            }
          }
        } else {
          setTranscriptState(prev => ({
            ...prev,
            interim: result.transcript
          }));
          if (onTranscript) {
            onTranscript(result.transcript, false);
          }
        }
      });

      deepgramRef.current.addEventListener('error', (event: any) => {
        console.error(' Deepgram error:', event.detail);
        setConnectionStatus('error');
      });

      deepgramRef.current.addEventListener('disconnected', () => {
        console.log(' Deepgram disconnected');
        setConnectionStatus('idle');
      });

      await deepgramRef.current.connect();
      return true;
    } catch (error) {
      console.error(' Failed to initialize:', error);
      console.error('   Make sure the backend is running:');
      console.error('   1. Open terminal');
      console.error('   2. cd backend');
      console.error('   3. python main.py');
      setConnectionStatus('error');
      return false;
    }
  }, [onTranscript]);

  const disconnectDeepgram = useCallback(() => {
    if (deepgramRef.current) {
      deepgramRef.current.disconnect();
      deepgramRef.current = null;
      setConnectionStatus('idle');
    }
  }, []);

  const handleToggleRecording = useCallback(async () => {
    if (audioState.isRecording) {
      console.log(' Stopping recording...');
      stopRecording();
      stopAudioStreaming();
      disconnectDeepgram();
    } else {
      console.log('🎤 Starting recording...');
      
      if (connectionStatus !== 'connected') {
        const connected = await initializeDeepgram();
        if (!connected) {
          console.error(' Failed to connect to backend');
          console.error('   Troubleshooting:');
          console.error('   1. Check backend is running: http://localhost:8000/api/health');
          console.error('   2. Check backend/.env has DEEPGRAM_API_KEY');
          console.error('   3. Check backend logs for errors');
          return;
        }
      }
      
      await startRecording();
      
      startAudioStreaming((audioData) => {
        if (deepgramRef.current && deepgramRef.current.getConnectionStatus()) {
          deepgramRef.current.sendAudio(audioData);
        }
      });
    }
  }, [
    audioState.isRecording,
    connectionStatus,
    startRecording,
    stopRecording,
    startAudioStreaming,
    stopAudioStreaming,
    initializeDeepgram,
    disconnectDeepgram
  ]);

  useEffect(() => {
    if (!canvasRef.current || !audioState.isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 120;

    const drawVisualization = () => {
      const frequencyData = getFrequencyData();
      const waveformData = getWaveformData();
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + audioState.audioLevel * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();

      const sliceWidth = canvas.width / waveformData.length;
      let x = 0;

      for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.stroke();

      const barCount = 40;
      const barWidth = canvas.width / barCount;
      
      for (let i = 0; i < barCount; i++) {
        const freqIndex = Math.floor((i / barCount) * frequencyData.length * 0.4);
        const height = (frequencyData[freqIndex] / 255) * canvas.height * 0.5;
        
        const gradient = ctx.createLinearGradient(
          i * barWidth, 
          canvas.height, 
          i * barWidth, 
          canvas.height - height
        );
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
        gradient.addColorStop(0.5, `rgba(107, 70, 193, ${0.1 * audioState.audioLevel})`);
        gradient.addColorStop(1, `rgba(0, 255, 255, ${0.2 * audioState.audioLevel})`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
          i * barWidth,
          canvas.height - height,
          barWidth - 1,
          height
        );
      }

      const newBars = [];
      for (let i = 0; i < 16; i++) {
        const start = Math.floor((i / 16) * frequencyData.length * 0.6);
        const end = Math.floor(((i + 1) / 16) * frequencyData.length * 0.6);
        let sum = 0;
        for (let j = start; j < end; j++) {
          sum += frequencyData[j];
        }
        newBars.push((sum / (end - start)) / 255);
      }
      setFrequencyBars(newBars);

      animationFrameRef.current = requestAnimationFrame(drawVisualization);
    };

    drawVisualization();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioState.isRecording, audioState.audioLevel, getFrequencyData, getWaveformData]);

  useEffect(() => {
    if (onAudioLevel) {
      onAudioLevel(audioState.audioLevel);
    }
  }, [audioState.audioLevel, onAudioLevel]);

  useEffect(() => {
    return () => {
      disconnectDeepgram();
    };
  }, [disconnectDeepgram]);

  const getButtonText = () => {
    if (audioState.isRecording) {
      return connectionStatus === 'connected' ? 'ANALYZING AURA' : 'CONNECTING...';
    }
    if (connectionStatus === 'connecting') {
      return 'CONNECTING...';
    }
    if (connectionStatus === 'error') {
      return 'CONNECTION ERROR';
    }
    return 'INITIALIZE AURA';
  };

  const getStatusMessage = () => {
    if (connectionStatus === 'connected') return '● Backend Connected to Deepgram';
    if (connectionStatus === 'connecting') return '● Connecting to Backend...';
    if (connectionStatus === 'error') return '● Check Backend Server (port 8000)';
    return '';
  };

  return (
    <div className="audio-pulse-container">
      {/* Waveform visualization */}
      <AnimatePresence>
        {audioState.isRecording && (
          <motion.div
            className="visualization-wrapper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{ marginBottom: '60px' }}
          >
            <canvas ref={canvasRef} className="audio-canvas-redesigned" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record button */}
      <motion.button
        className={`record-button-redesigned ${audioState.isRecording ? 'recording' : ''}`}
        onClick={handleToggleRecording}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={connectionStatus === 'connecting'}
      >
        <motion.div 
          className="button-border"
          animate={audioState.isRecording ? {
            borderColor: ['#00ffff', '#00ff88', '#ff00ff', '#00ffff'],
          } : {}}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="button-content">
          {audioState.isRecording ? (
            <>
              <motion.div 
                className="recording-dot"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="button-text">{getButtonText()}</span>
            </>
          ) : (
            <>
              <div className="power-icon">⬡</div>
              <span className="button-text">{getButtonText()}</span>
            </>
          )}
        </div>
      </motion.button>

      {/* Connection status indicator */}
      {connectionStatus !== 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: '10px',
            fontSize: '0.7rem',
            color: connectionStatus === 'connected' ? 'var(--bio-green)' : 
                   connectionStatus === 'error' ? 'var(--plasma-pink)' : 'var(--neon-cyan)',
            textAlign: 'center',
            fontFamily: 'Space Grotesk'
          }}
        >
          {getStatusMessage()}
        </motion.div>
      )}

      {/* Frequency indicator */}
      <AnimatePresence>
        {audioState.isRecording && (
          <motion.div
            className="frequency-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: '20px' }}
          >
            {frequencyBars.map((height, i) => (
              <motion.div
                key={i}
                className="freq-line"
                animate={{
                  scaleY: Math.max(0.1, height),
                  opacity: 0.3 + height * 0.7,
                }}
                transition={{ duration: 0.05 }}
                style={{
                  background: `linear-gradient(to top, rgba(0, 255, 136, 0.3), rgba(0, 255, 255, ${0.5 + height * 0.5}))`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error display */}
      {audioState.error && (
        <motion.div
          className="error-message-redesigned"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            bottom: '-50px',
          }}
        >
          <span>⚠</span> {audioState.error}
        </motion.div>
      )}
    </div>
  );
};

export default AudioPulse;