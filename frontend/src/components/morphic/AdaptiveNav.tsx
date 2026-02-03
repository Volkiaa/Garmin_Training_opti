import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Settings, Activity, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  usageCount: number;
}

export function AdaptiveNav() {
  const location = useLocation();
  const [navItems, setNavItems] = useState<NavItem[]>([
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', usageCount: 0 },
    { to: '/activities', icon: Activity, label: 'Activities', usageCount: 0 },
    { to: '/events', icon: Trophy, label: 'Events', usageCount: 0 },
    { to: '/trends', icon: TrendingUp, label: 'Trends', usageCount: 0 },
    { to: '/settings', icon: Settings, label: 'Settings', usageCount: 0 },
  ]);

  useEffect(() => {
    const currentPath = location.pathname;
    setNavItems((items) =>
      items.map((item) => ({
        ...item,
        usageCount:
          item.to === currentPath ? item.usageCount + 1 : item.usageCount,
      }))
    );
  }, [location.pathname]);

  const sortedNavItems = [...navItems].sort(
    (a, b) => b.usageCount - a.usageCount
  );

  return (
    <motion.nav
      layout
      className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none"
    >
      <motion.div
        layout
        className="flex items-center gap-2 px-4 py-3 bg-[#151520]/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl pointer-events-auto"
      >
        <AnimatePresence mode="popLayout">
          {sortedNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            const scale = 1 + Math.min(item.usageCount * 0.02, 0.1);

            return (
              <motion.div
                key={item.to}
                layout
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  delay: index * 0.05,
                }}
              >
                <Link to={item.to}>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-xl transition-colors',
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 -z-10"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </motion.nav>
  );
}
