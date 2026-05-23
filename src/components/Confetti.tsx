import React, { useEffect, useState } from 'react';

interface ConfettiProps {
  pieces?: number;
}

const colors = ['#00d4ff', '#00ff88', '#ffd700', '#ff3366', '#0a4a6b', '#ff8c00', '#7ba8cc'];

const Confetti: React.FC<ConfettiProps> = ({ pieces = 40 }) => {
  const [parts, setParts] = useState<{
    id: number;
    left: number;
    delay: number;
    color: string;
    size: number;
    duration: number;
    rotation: number;
  }[]>([]);

  useEffect(() => {
    setParts(
      Array.from({ length: pieces }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        duration: Math.random() * 2 + 2,
        rotation: Math.random() * 360,
      }))
    );
  }, [pieces]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {parts.map(p => (
        <div
          key={p.id}
          className="confetti-piece absolute top-0 rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size > 8 ? '50%' : `${p.size}px`,
            height: p.size > 8 ? '8px' : `${p.size * 0.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotation}deg)`,
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;