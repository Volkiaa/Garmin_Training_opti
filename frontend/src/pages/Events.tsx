import { motion } from 'framer-motion';
import { MorphingCard } from '../components/morphic/MorphingCard';
import { EventList } from '../components/EventList';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { Calendar } from 'lucide-react';
import { staggerContainer, staggerItem } from '../lib/animations';

export function Events() {
  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.div
        className="flex items-center gap-3"
        variants={staggerItem}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Events
        </h1>
      </motion.div>

      <motion.div variants={staggerItem}>
        <PhaseIndicator />
      </motion.div>

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="orange">
          <h3 className="text-lg font-semibold text-white mb-4">Upcoming Races</h3>
          <EventList />
        </MorphingCard>
      </motion.div>
    </motion.div>
  );
}
