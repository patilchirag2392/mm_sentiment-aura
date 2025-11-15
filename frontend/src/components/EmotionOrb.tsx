import React from 'react';

interface EmotionOrbProps {
  emotion: string;
}

const EmotionOrb: React.FC<EmotionOrbProps> = ({ emotion }) => {
  return (
    <div style={{
      width: '200px',
      height: '200px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, var(--electric-violet), transparent)',
      animation: 'liquid-morph 8s ease-in-out infinite, breathe 4s ease-in-out infinite',
    }}>
      {/* replaced with P5.js visualization later */}
    </div>
  );
};

export default EmotionOrb;