import React, { useEffect, useRef } from 'react';

const NeuralBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const nodesRef = useRef<Array<{x: number, y: number, vx: number, vy: number}>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const initNodes = () => {
      nodesRef.current = [];
      const nodeCount = 50;
      for (let i = 0; i < nodeCount; i++) {
        nodesRef.current.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
        });
      }
    };

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      
      if (nodesRef.current.length > 0) {
        nodesRef.current.forEach(node => {
          if (node.x > width) node.x = width - 10;
          if (node.y > height) node.y = height - 10;
          if (node.x < 0) node.x = 10;
          if (node.y < 0) node.y = 10;
        });
      }
    };

    resizeCanvas();
    initNodes();

    const animate = () => {
      const currentWidth = canvas.width;
      const currentHeight = canvas.height;

      ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
      ctx.fillRect(0, 0, currentWidth, currentHeight);

      nodesRef.current.forEach((node, index) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x <= 0 || node.x >= currentWidth) {
          node.vx *= -1;
          node.x = Math.max(0, Math.min(currentWidth, node.x));
        }
        if (node.y <= 0 || node.y >= currentHeight) {
          node.vy *= -1;
          node.y = Math.max(0, Math.min(currentHeight, node.y));
        }

        for (let i = index + 1; i < nodesRef.current.length; i++) {
          const otherNode = nodesRef.current[i];
          const dx = otherNode.x - node.x;
          const dy = otherNode.y - node.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.2;
            ctx.strokeStyle = `rgba(107, 70, 193, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(otherNode.x, otherNode.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = 'rgba(0, 255, 136, 0.6)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        resizeCanvas();
      }, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(resizeTimeout);
    };
  }, []); 

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
};

export default NeuralBackground;