import { useState } from 'react';
import { motion } from 'framer-motion';

interface ReadinessGaugeProps {
  score: number;
  category: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function ReadinessGauge({
  score,
  category,
  size = 'md',
  onClick,
}: ReadinessGaugeProps) {
  const [isHovered, setIsHovered] = useState(false);

  const sizes = {
    sm: { container: 80, stroke: 6, font: 'text-xl' },
    md: { container: 140, stroke: 8, font: 'text-3xl' },
    lg: { container: 200, stroke: 10, font: 'text-5xl' },
  };

  const { container, stroke, font } = sizes[size];
  const radius = (container - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return ['#10b981', '#34d399'];
    if (score >= 60) return ['#3b82f6', '#60a5fa'];
    if (score >= 40) return ['#f59e0b', '#fbbf24'];
    return ['#ef4444', '#f87171'];
  };

  const [startColor, endColor] = getColor(score);

  return (
    <motion.div
      className="relative cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <svg
        width={container}
        height={container}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={`gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
          <filter id={`glow-${score}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={container / 2}
          cy={container / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
        />

        <motion.circle
          cx={container / 2}
          cy={container / 2}
          r={radius}
          fill="none"
          stroke={`url(#gradient-${score})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - progress,
            filter: isHovered ? `url(#glow-${score})` : 'none',
          }}
          transition={{
            strokeDashoffset: { duration: 1.5, ease: 'easeOut' },
            filter: { duration: 0.3 },
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`${font} font-bold text-white`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          {score}
        </motion.span>
        <motion.span
          className="text-xs text-gray-400 capitalize"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {category}
        </motion.span>
      </div>

      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-gray-400 bg-[#151520] px-2 py-1 rounded-lg border border-white/10"
        >
          Click for details
        </motion.div>
      )}
    </motion.div>
  );
}
