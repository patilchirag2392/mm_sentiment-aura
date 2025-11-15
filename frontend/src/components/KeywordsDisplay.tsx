import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './KeywordsDisplay.css';

interface KeywordsDisplayProps {
  keywords: string[];
  isRecording: boolean;
}

interface KeywordItem {
  id: string;
  text: string;
  timestamp: number;
}

const KeywordsDisplay: React.FC<KeywordsDisplayProps> = ({ keywords, isRecording }) => {
  const [displayedKeywords, setDisplayedKeywords] = useState<KeywordItem[]>([]);

  useEffect(() => {
    if (!keywords || keywords.length === 0) return;

    const newKeywords = keywords
      .filter(kw => kw && kw.trim()) 
      .slice(0, 8)
      .map((text, index) => ({
        id: `${text}-${Date.now()}-${index}`,
        text: text.toLowerCase(),
        timestamp: Date.now()
      }));

    setDisplayedKeywords(prev => {
      const existingTexts = new Set(prev.map(k => k.text));
      const trulyNew = newKeywords.filter(k => !existingTexts.has(k.text));
      
      if (trulyNew.length === 0) return prev;
      
      const combined = [...prev, ...trulyNew];
      return combined.slice(-8);
    });
  }, [keywords]);

  useEffect(() => {
    if (!isRecording) {
      const timer = setTimeout(() => {
        setDisplayedKeywords([]);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isRecording]);

  if (!isRecording && displayedKeywords.length === 0) {
    return null;
  }

  return (
    <div className="keywords-display-container">
      <motion.div 
        className="keywords-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <span className="keywords-title">KEYWORDS</span>
        <div className="keywords-count">{displayedKeywords.length}</div>
      </motion.div>

      <div className="keywords-grid">
        <AnimatePresence mode="popLayout">
          {displayedKeywords.map((keyword, index) => (
            <motion.div
              key={keyword.id}
              className="keyword-tag"
              initial={{ 
                opacity: 0, 
                y: 30,
                scale: 0.8,
              }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: 1,
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8,
                transition: { duration: 0.3 }
              }}
              transition={{
                duration: 0.5,
                delay: index * 0.15, 
                ease: [0.43, 0.13, 0.23, 0.96] 
              }}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.4)',
                transition: { duration: 0.2 }
              }}
            >
              <motion.div 
                className="keyword-glow"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2
                }}
              />
              <span className="keyword-text">{keyword.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default KeywordsDisplay;