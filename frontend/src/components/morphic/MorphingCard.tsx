import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface MorphingCardProps {
  children: React.ReactNode;
  className?: string;
  expandedContent?: React.ReactNode;
  glowColor?: string;
  usageFrequency?: number;
}

export function MorphingCard({
  children,
  className,
  expandedContent,
  glowColor = 'rgba(59, 130, 246, 0.3)',
  usageFrequency = 0,
}: MorphingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const baseScale = 1 + usageFrequency * 0.02;

  return (
    <motion.div
      layout
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => expandedContent && setIsExpanded(!isExpanded)}
      initial={false}
      animate={{
        scale: isHovered ? baseScale * 1.02 : baseScale,
        boxShadow: isHovered
          ? `0 0 30px ${glowColor}, 0 10px 40px rgba(0,0,0,0.3)`
          : `0 0 0px ${glowColor}, 0 4px 20px rgba(0,0,0,0.2)`,
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-[#151520]/80 backdrop-blur-xl border border-white/10 cursor-pointer',
        className
      )}
    >
      <motion.div
        layout
        className="p-6"
      >
        {children}
      </motion.div>

      <AnimatePresence>
        {isExpanded && expandedContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 25,
            }}
            className="px-6 pb-6"
          >
            <div className="pt-4 border-t border-white/10">
              {expandedContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        animate={{
          background: isHovered
            ? `radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${glowColor}, transparent 40%)`
            : 'transparent',
        }}
      />
    </motion.div>
  );
}
