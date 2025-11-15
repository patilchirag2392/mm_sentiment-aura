import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/globals.css';
import CustomCursor from './components/CustomCursor';
import AuraVisualization from './components/AuraVisualization';
import EmotionOrb from './components/EmotionOrb';
import AudioPulse from './components/AudioPulse';
import TranscriptDisplay from './components/TranscriptDisplay';
import KeywordsDisplay from './components/KeywordsDisplay';

interface SentimentData {
  sentiment_score: number;
  emotion: string;
  intensity: number;
  keywords: string[];
  confidence: number;
}

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [fullTranscript, setFullTranscript] = useState<string[]>([]);
  
  const [sentimentData, setSentimentData] = useState<SentimentData | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      setTranscript(text);
      setFullTranscript(prev => [...prev, text]);
      setInterimTranscript('');
    } else {
      setInterimTranscript(text);
    }
  };

  const handleSentimentUpdate = (data: SentimentData) => {
    setSentimentData(data);
    setCurrentEmotion(data.emotion);
    setKeywords(data.keywords || []);
  };

  return (
    <div className="app-container">
      <CustomCursor />

      <AuraVisualization 
        emotion={currentEmotion}
        sentimentScore={sentimentData?.sentiment_score || 0}
        intensity={sentimentData?.intensity || 0.5}
        isActive={isRecording}
      />
      
      <AnimatePresence>
        {!isInitialized ? (
          <motion.div
            key="loader"
            className="initialization-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(20px)" }}
            transition={{ duration: 1 }}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--void-black)',
              zIndex: 1000,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h1 className="holographic" style={{ 
                fontSize: '4rem', 
                fontFamily: 'Orbitron',
                fontWeight: 900,
                marginBottom: '2rem' 
              }}>
                SENTIMENT AURA
              </h1>
              <motion.div 
                animate={{ scaleX: [0, 1] }}
                transition={{ duration: 1.5 }}
                style={{ 
                  width: '200px', 
                  height: '2px', 
                  background: 'var(--aurora-gradient)',
                  margin: '0 auto',
                  transformOrigin: 'left',
                }} 
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {isInitialized && (
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EmotionOrb 
            emotion={currentEmotion}
            sentimentScore={sentimentData?.sentiment_score || 0}
            intensity={sentimentData?.intensity || 0.5}
          />

          <TranscriptDisplay 
            transcript={transcript}
            interimTranscript={interimTranscript}
            fullTranscript={fullTranscript}
            isRecording={isRecording}
          />
          
          <KeywordsDisplay 
            keywords={keywords}
            isRecording={isRecording}
          />
          
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}>
            <AudioPulse 
              onEmotionDetected={setCurrentEmotion}
              onAudioLevel={(level) => {
                setIsRecording(level > 0);
              }}
              onTranscript={handleTranscript}
              onSentimentUpdate={handleSentimentUpdate}
            />
          </div>
        </motion.main>
      )}
    </div>
  );
}

export default App;