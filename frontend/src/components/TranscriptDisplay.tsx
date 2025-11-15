import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TranscriptDisplay.css';

interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  fullTranscript: string[];
  isRecording: boolean;
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  transcript,
  interimTranscript,
  fullTranscript,
  isRecording,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [fullTranscript, interimTranscript]);

  return (
    <AnimatePresence>
      {(isRecording || fullTranscript.length > 0) && (
        <motion.div
          className="transcript-container"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
        >
          <div className="transcript-header">
            <div className="transcript-title">VOICE STREAM</div>
            {isRecording && (
              <motion.div
                className="recording-indicator"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ● LIVE
              </motion.div>
            )}
          </div>
          
          <div className="transcript-content" ref={scrollRef}>
            {fullTranscript.map((text, index) => (
              <motion.div
                key={index}
                className="transcript-line"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {text}
              </motion.div>
            ))}
            
            {interimTranscript && (
              <motion.div
                className="transcript-line interim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
              >
                {interimTranscript}
              </motion.div>
            )}
            
            {fullTranscript.length === 0 && !interimTranscript && isRecording && (
              <div className="waiting-text">Listening for speech...</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TranscriptDisplay;