import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface FluidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  glowColor?: string;
}

export function FluidButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  glowColor,
  ...props
}: FluidButtonProps) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500',
    secondary: 'bg-[#1e1e2e] text-white border border-white/10 hover:bg-[#2e2e3e] focus:ring-gray-500',
    ghost: 'text-gray-300 hover:bg-white/5 hover:text-white focus:ring-gray-500',
    gradient: 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hover:opacity-90 focus:ring-purple-500',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  };

  const glowColors = {
    primary: 'rgba(59, 130, 246, 0.5)',
    secondary: 'rgba(255, 255, 255, 0.1)',
    ghost: 'rgba(255, 255, 255, 0.1)',
    gradient: 'rgba(139, 92, 246, 0.5)',
  };

  return (
    <motion.button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      whileHover={{
        scale: 1.05,
        boxShadow: `0 0 20px ${glowColor || glowColors[variant]}`,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17,
      }}
      {...props}
    >
      <span className="relative z-10 flex items-center gap-2">
        {isLoading && (
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
          />
        )}
        {children}
      </span>
      {variant === 'gradient' && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ backgroundSize: '200% 200%' }}
        />
      )}
    </motion.button>
  );
}
