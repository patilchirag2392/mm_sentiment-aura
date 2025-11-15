// import React from 'react';
// import logo from './logo.svg';
// import './App.css';

// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.tsx</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

// export default App;

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './styles/globals.css';
import CustomCursor from './components/CustomCursor';
import NeuralBackground from './components/NeuralBackground';
import EmotionOrb from './components/EmotionOrb';
import AudioPulse from './components/AudioPulse';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const appRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app-container" ref={appRef}>
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
              <div style={{ 
                width: '200px', 
                height: '2px', 
                background: 'var(--aurora-gradient)',
                margin: '0 auto',
                animation: 'pulse-line 1s ease-in-out infinite'
              }} />
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
          <EmotionOrb emotion={currentEmotion} />
          <AudioPulse onEmotionDetected={setCurrentEmotion} />
          
          {/* floating UI elements here */}
          <div className="floating-interface" style={{
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            zIndex: 100,
          }}>
          </div>
        </motion.main>
      )}
    </div>
  );
}

export default App;