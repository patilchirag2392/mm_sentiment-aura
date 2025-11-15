import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

interface EmotionOrbProps {
  emotion?: string;
  sentimentScore?: number;
  intensity?: number;
}

const EMOTION_COLORS = {
  joy: {
    primary: 'rgba(255, 215, 0, 0.4)',      // Gold
    secondary: 'rgba(255, 165, 0, 0.3)',    // Orange
    accent: 'rgba(255, 255, 0, 0.2)'        // Yellow
  },
  happy: {
    primary: 'rgba(255, 215, 0, 0.4)',
    secondary: 'rgba(255, 165, 0, 0.3)',
    accent: 'rgba(255, 255, 0, 0.2)'
  },
  excited: {
    primary: 'rgba(255, 20, 147, 0.4)',     // Deep Pink
    secondary: 'rgba(255, 99, 71, 0.3)',    // Tomato
    accent: 'rgba(255, 215, 0, 0.2)'        // Gold
  },
  
  calm: {
    primary: 'rgba(0, 255, 136, 0.3)',      // Bio Green
    secondary: 'rgba(107, 70, 193, 0.2)',   // Purple
    accent: 'rgba(0, 255, 255, 0.1)'        // Cyan
  },
  neutral: {
    primary: 'rgba(0, 255, 136, 0.3)',
    secondary: 'rgba(107, 70, 193, 0.2)',
    accent: 'rgba(0, 255, 255, 0.1)'
  },
  
  sad: {
    primary: 'rgba(65, 105, 225, 0.3)',     // Royal Blue
    secondary: 'rgba(0, 0, 128, 0.2)',      // Navy
    accent: 'rgba(72, 61, 139, 0.1)'        // Dark Slate Blue
  },
  fear: {
    primary: 'rgba(147, 112, 219, 0.3)',    // Medium Purple
    secondary: 'rgba(75, 0, 130, 0.2)',     // Indigo
    accent: 'rgba(139, 0, 139, 0.1)'        // Dark Magenta
  },
  fearful: {
    primary: 'rgba(147, 112, 219, 0.3)',
    secondary: 'rgba(75, 0, 130, 0.2)',
    accent: 'rgba(139, 0, 139, 0.1)'
  },
  
  anger: {
    primary: 'rgba(255, 0, 0, 0.4)',        // Red
    secondary: 'rgba(139, 0, 0, 0.3)',      // Dark Red
    accent: 'rgba(255, 69, 0, 0.2)'         // Orange Red
  },
  angry: {
    primary: 'rgba(255, 0, 0, 0.4)',
    secondary: 'rgba(139, 0, 0, 0.3)',
    accent: 'rgba(255, 69, 0, 0.2)'
  },
  
  surprise: {
    primary: 'rgba(255, 105, 180, 0.4)',    // Hot Pink
    secondary: 'rgba(255, 160, 122, 0.3)',  // Light Salmon
    accent: 'rgba(255, 182, 193, 0.2)'      // Light Pink
  },
  surprised: {
    primary: 'rgba(255, 105, 180, 0.4)',
    secondary: 'rgba(255, 160, 122, 0.3)',
    accent: 'rgba(255, 182, 193, 0.2)'
  },
  
  disgust: {
    primary: 'rgba(85, 107, 47, 0.3)',      // Dark Olive Green
    secondary: 'rgba(107, 142, 35, 0.2)',   // Olive Drab
    accent: 'rgba(128, 128, 0, 0.1)'        // Olive
  },
  
  anxious: {
    primary: 'rgba(255, 140, 0, 0.4)',      // Dark Orange
    secondary: 'rgba(255, 99, 71, 0.3)',    // Tomato
    accent: 'rgba(255, 165, 0, 0.2)'        // Orange
  }
};

const EmotionOrb: React.FC<EmotionOrbProps> = ({ 
  emotion = 'neutral',
  sentimentScore = 0,
  intensity = 0.5 
}) => {
  const colors = useMemo(() => {
    return EMOTION_COLORS[emotion.toLowerCase() as keyof typeof EMOTION_COLORS] || EMOTION_COLORS.neutral;
  }, [emotion]);

  const animationSpeed = useMemo(() => {
    return 6 + (intensity * 4); // 6s to 10s
  }, [intensity]);

  const scaleMultiplier = useMemo(() => {
    return 1.0 + (sentimentScore * 0.15); // 0.85 to 1.15
  }, [sentimentScore]);

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 5,
    }}>
      {/* Outer orb layer */}
      <motion.div 
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${colors.primary}, ${colors.secondary}, transparent)`,
          filter: 'blur(2px)',
        }}
        animate={{
          scale: [scaleMultiplier, scaleMultiplier * 1.1, scaleMultiplier],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: animationSpeed,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Inner orb layer */}
      <motion.div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '150px',
          height: '150px',
          borderRadius: '50%',
          background: `radial-gradient(circle at 60% 60%, ${colors.secondary}, ${colors.accent}, transparent)`,
        }}
        animate={{
          scale: [1, 1.15, 1],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: animationSpeed * 0.7,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Emotion label */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          bottom: '-50px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: 'Orbitron, monospace',
          fontSize: '0.85rem',
          fontWeight: 700,
          letterSpacing: '0.2em',
          color: colors.primary.replace(/[0-9.]+\)$/, '1)'), 
          textShadow: `0 0 20px ${colors.primary}`,
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          transition: 'color 1s ease, text-shadow 1s ease'
        }}
      >
        {emotion}
      </motion.div>
    </div>
  );
};

export default EmotionOrb;

