import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/globals.css';
import CustomCursor from './components/CustomCursor';
import NeuralBackground from './components/NeuralBackground';
import EmotionOrb from './components/EmotionOrb';
import AudioPulse from './components/AudioPulse';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-container">
      <CustomCursor />
      <NeuralBackground />
      
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
          {/* Emotion Orb - centered */}
          <EmotionOrb emotion={currentEmotion} />
          
          {/* Audio controls with proper positioning */}
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}>
            <AudioPulse 
              onEmotionDetected={setCurrentEmotion}
              onAudioLevel={setAudioLevel}
            />
          </div>
        </motion.main>
      )}
    </div>
  );
}

export default App;