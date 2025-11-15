import React, { useRef } from 'react';
import Sketch from 'react-p5';

interface AuraVisualizationProps {
  emotion?: string;
  sentimentScore?: number;
  intensity?: number;
  isActive?: boolean;
}

const EMOTION_PALETTES = {
  joy: {
    primary: [255, 215, 0],      // Gold
    secondary: [255, 165, 0],    // Orange
    accent: [255, 255, 100]      // Light Yellow
  },
  happy: {
    primary: [255, 215, 0],
    secondary: [255, 165, 0],
    accent: [255, 255, 100]
  },
  excited: {
    primary: [255, 20, 147],     // Deep Pink
    secondary: [255, 99, 71],    // Tomato
    accent: [255, 140, 0]        // Orange
  },
  calm: {
    primary: [0, 255, 136],      // Bio Green
    secondary: [107, 70, 193],   // Purple
    accent: [0, 255, 255]        // Cyan
  },
  neutral: {
    primary: [0, 255, 136],
    secondary: [107, 70, 193],
    accent: [0, 255, 255]
  },
  sad: {
    primary: [65, 105, 225],     // Royal Blue
    secondary: [0, 0, 128],      // Navy
    accent: [72, 61, 139]        // Dark Slate Blue
  },
  fear: {
    primary: [147, 112, 219],    // Medium Purple
    secondary: [75, 0, 130],     // Indigo
    accent: [139, 0, 139]        // Dark Magenta
  },
  fearful: {
    primary: [147, 112, 219],
    secondary: [75, 0, 130],
    accent: [139, 0, 139]
  },
  anger: {
    primary: [255, 0, 0],        // Red
    secondary: [139, 0, 0],      // Dark Red
    accent: [255, 69, 0]         // Orange Red
  },
  angry: {
    primary: [255, 0, 0],
    secondary: [139, 0, 0],
    accent: [255, 69, 0]
  },
  surprise: {
    primary: [255, 105, 180],    // Hot Pink
    secondary: [255, 160, 122],  // Light Salmon
    accent: [255, 182, 193]      // Light Pink
  },
  surprised: {
    primary: [255, 105, 180],
    secondary: [255, 160, 122],
    accent: [255, 182, 193]
  },
  disgust: {
    primary: [85, 107, 47],      // Dark Olive Green
    secondary: [107, 142, 35],   // Olive Drab
    accent: [128, 128, 0]        // Olive
  },
  anxious: {
    primary: [255, 140, 0],      // Dark Orange
    secondary: [255, 99, 71],    // Tomato
    accent: [255, 165, 0]        // Orange
  }
};

class Particle {
  pos: any;
  vel: any;
  acc: any;
  maxSpeed: number;
  alpha: number;
  p5: any;

  constructor(p5: any, x?: number, y?: number) {
    this.p5 = p5;
    this.pos = p5.createVector(
      x ?? p5.random(p5.width),
      y ?? p5.random(p5.height)
    );
    this.vel = p5.createVector(0, 0);
    this.acc = p5.createVector(0, 0);
    this.maxSpeed = 2;
    this.alpha = p5.random(50, 150);
  }

  follow(flowField: any[], cols: number, resolution: number) {
    const x = Math.floor(this.pos.x / resolution);
    const y = Math.floor(this.pos.y / resolution);
    const index = x + y * cols;
    
    if (flowField[index]) {
      const force = flowField[index].copy();
      force.mult(0.5);
      this.acc.add(force);
    }
  }

  update() {
    this.vel.add(this.acc);
    this.vel.limit(this.maxSpeed);
    this.pos.add(this.vel);
    this.acc.mult(0);

    if (this.pos.x > this.p5.width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = this.p5.width;
    if (this.pos.y > this.p5.height) this.pos.y = 0;
    if (this.pos.y < 0) this.pos.y = this.p5.height;
  }

  display(colors: typeof EMOTION_PALETTES.neutral, intensity: number) {
    const { p5 } = this;
    
    const colorMix = p5.map(this.pos.x, 0, p5.width, 0, 1);
    const r = p5.lerp(colors.primary[0], colors.secondary[0], colorMix);
    const g = p5.lerp(colors.primary[1], colors.secondary[1], colorMix);
    const b = p5.lerp(colors.primary[2], colors.secondary[2], colorMix);
    
    p5.stroke(r, g, b, this.alpha * (0.3 + intensity * 0.7));
    p5.strokeWeight(1 + intensity);
    p5.point(this.pos.x, this.pos.y);
  }
}

const AuraVisualization: React.FC<AuraVisualizationProps> = ({
  emotion = 'neutral',
  sentimentScore = 0,
  intensity = 0.5,
  isActive = true
}) => {
  const p5Ref = useRef<any>(null);
  
  const stateRef = useRef({
    time: 0,
    flowField: [] as any[],
    particles: [] as Particle[],
    targetColors: EMOTION_PALETTES.neutral,
    currentColors: {
      primary: [...EMOTION_PALETTES.neutral.primary],
      secondary: [...EMOTION_PALETTES.neutral.secondary],
      accent: [...EMOTION_PALETTES.neutral.accent]
    },
    cols: 0,
    rows: 0,
    resolution: 20,
  });

  const setup = (p5: any, canvasParentRef: Element) => {
    p5Ref.current = p5;
    
    const canvas = p5.createCanvas(p5.windowWidth, p5.windowHeight);
    canvas.parent(canvasParentRef);
    
    const state = stateRef.current;
    state.cols = Math.floor(p5.width / state.resolution);
    state.rows = Math.floor(p5.height / state.resolution);
    
    state.flowField = [];
    for (let i = 0; i < state.cols * state.rows; i++) {
      state.flowField[i] = p5.createVector(0, 0);
    }
    
    state.particles = [];
    const particleCount = Math.floor((p5.width * p5.height) / 8000);
    for (let i = 0; i < particleCount; i++) {
      state.particles.push(new Particle(p5));
    }
    
    p5.background(0);
  };

  const draw = (p5: any) => {
    const state = stateRef.current;
    
    p5.fill(0, 0, 0, 25);
    p5.noStroke();
    p5.rect(0, 0, p5.width, p5.height);
    
    const palette = EMOTION_PALETTES[emotion.toLowerCase() as keyof typeof EMOTION_PALETTES] || EMOTION_PALETTES.neutral;
    state.targetColors = palette;
    
    for (let i = 0; i < 3; i++) {
      state.currentColors.primary[i] = p5.lerp(state.currentColors.primary[i], state.targetColors.primary[i], 0.05);
      state.currentColors.secondary[i] = p5.lerp(state.currentColors.secondary[i], state.targetColors.secondary[i], 0.05);
      state.currentColors.accent[i] = p5.lerp(state.currentColors.accent[i], state.targetColors.accent[i], 0.05);
    }
    
    const timeScale = 0.0005 * (0.5 + intensity);
    const spaceScale = 0.1 - (sentimentScore * 0.02);
    
    state.time += timeScale;
    
    let yOff = 0;
    for (let y = 0; y < state.rows; y++) {
      let xOff = 0;
      for (let x = 0; x < state.cols; x++) {
        const index = x + y * state.cols;
        
        const angle = p5.noise(xOff, yOff, state.time) * p5.TWO_PI * 4;
        const angle2 = p5.noise(xOff * 2, yOff * 2, state.time * 1.5) * p5.TWO_PI * 2;
        
        const finalAngle = angle + angle2 * (0.3 + intensity * 0.4);
        
        const vector = p5.constructor.Vector ? p5.constructor.Vector.fromAngle(finalAngle) : p5.createVector(Math.cos(finalAngle), Math.sin(finalAngle));
        vector.setMag(0.5 + intensity * 0.5);
        state.flowField[index] = vector;
        
        xOff += spaceScale;
      }
      yOff += spaceScale;
    }
    
    for (const particle of state.particles) {
      particle.follow(state.flowField, state.cols, state.resolution);
      particle.update();
      particle.display(state.currentColors, intensity);
    }
    
    if (intensity > 0.7 && p5.frameCount % 3 === 0) {
      const accentParticle = new Particle(p5, p5.random(p5.width), p5.random(p5.height));
      accentParticle.alpha = 200;
      accentParticle.maxSpeed = 3;
      state.particles.push(accentParticle);
      
      if (state.particles.length > 3000) {
        state.particles.shift();
      }
    }
  };

  const windowResized = (p5: any) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
    
    const state = stateRef.current;
    state.cols = Math.floor(p5.width / state.resolution);
    state.rows = Math.floor(p5.height / state.resolution);
    
    state.flowField = [];
    for (let i = 0; i < state.cols * state.rows; i++) {
      state.flowField[i] = p5.createVector(0, 0);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <Sketch setup={setup} draw={draw} windowResized={windowResized} />
    </div>
  );
};

export default AuraVisualization;