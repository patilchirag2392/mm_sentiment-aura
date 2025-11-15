import React from 'react';

interface AudioPulseProps {
  onEmotionDetected: (emotion: string) => void;
}

const AudioPulse: React.FC<AudioPulseProps> = ({ onEmotionDetected }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '3rem',
      left: '50%',
      transform: 'translateX(-50%)',
    }}>
      <button 
        onClick={() => onEmotionDetected('joy')}
        style={{
          background: 'none',
          border: '2px solid var(--neon-cyan)',
          padding: '1rem 2rem',
          color: 'var(--neon-cyan)',
          fontSize: '0.9rem',
          fontFamily: 'Orbitron',
          letterSpacing: '0.1em',
          cursor: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--bio-green)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--neon-cyan)';
        }}
      >
        <span className="holographic">INITIALIZE AURA</span>
      </button>
    </div>
  );
};

export default AudioPulse;