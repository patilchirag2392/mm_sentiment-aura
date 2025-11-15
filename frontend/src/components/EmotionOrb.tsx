import React from 'react';
import { motion } from 'framer-motion';

interface EmotionOrbProps {
  emotion: string;
}

const EmotionOrb: React.FC<EmotionOrbProps> = ({ emotion }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    }}>
      <motion.div 
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(0, 255, 136, 0.3), rgba(107, 70, 193, 0.2), transparent)',
          filter: 'blur(2px)',
          animation: 'liquid-morph 8s ease-in-out infinite, breathe 4s ease-in-out infinite',
        }}
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '150px',
        height: '150px',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 60% 60%, rgba(255, 0, 255, 0.2), rgba(0, 255, 255, 0.1), transparent)',
        animation: 'liquid-morph 6s ease-in-out infinite reverse',
      }} />
    </div>
  );
};

export default EmotionOrb;