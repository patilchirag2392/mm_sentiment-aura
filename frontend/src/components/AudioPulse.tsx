import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioCapture } from '../hooks/useAudioCapture';
import './AudioPulse.css';

interface AudioPulseProps {
  onEmotionDetected: (emotion: string) => void;
  onAudioLevel?: (level: number) => void;
}

const AudioPulse: React.FC<AudioPulseProps> = ({ 
  onEmotionDetected,
  onAudioLevel 
}) => {
  const { audioState, startRecording, stopRecording, getFrequencyData, getWaveformData } = useAudioCapture();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [frequencyBars, setFrequencyBars] = useState<number[]>(new Array(16).fill(0));

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

      ctx.shadowBlur = 20;
      ctx.shadowColor = `rgba(0, 255, 255, ${audioState.audioLevel * 0.3})`;

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

  const handleToggleRecording = () => {
    if (audioState.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="audio-pulse-container">
      {/* Waveform visualization - positioned above with gap */}
      <AnimatePresence>
        {audioState.isRecording && (
          <motion.div
            className="visualization-wrapper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              marginBottom: '60px', 
            }}
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
              <span className="button-text">ANALYZING AURA</span>
            </>
          ) : (
            <>
              <div className="power-icon">⬡</div>
              <span className="button-text">INITIALIZE AURA</span>
            </>
          )}
        </div>
      </motion.button>

      {/* Mini frequency indicator below button */}
      <AnimatePresence>
        {audioState.isRecording && (
          <motion.div
            className="frequency-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              marginTop: '20px',
            }}
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