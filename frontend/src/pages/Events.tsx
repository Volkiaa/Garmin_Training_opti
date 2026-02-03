import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { MorphingCard } from '../components/morphic';
import { EventList } from '../components/EventList';
import { Calendar, Trophy, Clock, Target, TrendingUp } from 'lucide-react';
import { staggerContainer, staggerItem } from '../lib/animations';

interface Event {
  id: number;
  name: string;
  event_date: string;
  event_type: string;
  distance?: string;
  priority: string;
  notes?: string;
}

export function Events() {
  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/v1/events?upcoming_only=true');
      return res.json() as Promise<Event[]>;
    },
  });

  const nextEvent = events?.[0];

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

      {nextEvent && (
        <motion.div variants={staggerItem}>
          <EventCountdown event={nextEvent} />
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <PhaseTimeline />
      </motion.div>

      <motion.div variants={staggerItem}>
        <WeeklyRecommendations />
      </motion.div>

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="orange">
          <EventList />
        </MorphingCard>
      </motion.div>
    </motion.div>
  );
}

function EventCountdown({ event }: { event: Event }) {
  const daysUntil = (() => {
    const eventDate = new Date(event.event_date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  })();

  const progress = Math.max(0, Math.min(100, (90 - daysUntil) / 90 * 100));

  return (
    <MorphingCard glowColor="orange">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{event.name}</h2>
            <p className="text-gray-400">
              {new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-orange-400">{daysUntil}</div>
          <div className="text-sm text-gray-400">days to go</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Training Progress</span>
          <span className="text-orange-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full bg-gradient-to-r from-orange-500 to-red-500"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-gray-400">Priority: <span className={`font-medium ${
          event.priority === 'A' ? 'text-red-400' : 
          event.priority === 'B' ? 'text-yellow-400' : 'text-gray-400'
        }`}>{event.priority}-Race</span></span>
        {event.distance && (
          <>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400">Target: <span className="text-white">{event.distance}</span></span>
          </>
        )}
        <span className="text-gray-600">•</span>
        <span className="text-gray-400">Current Phase: <span className="text-blue-400">Build</span></span>
      </div>
    </MorphingCard>
  );
}

function PhaseTimeline() {
  const phases = [
    { name: 'Base', active: false, completed: true },
    { name: 'Build', active: true, completed: false },
    { name: 'Peak', active: false, completed: false },
    { name: 'Taper', active: false, completed: false },
    { name: 'Race', active: false, completed: false },
  ];

  return (
    <MorphingCard>
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Training Phase Timeline</h3>
      </div>

      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/10 -translate-y-1/2 rounded-full" />
        <div className="relative flex justify-between">
          {phases.map((phase) => (
            <div key={phase.name} className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full border-2 z-10 ${
                phase.completed ? 'bg-emerald-500 border-emerald-500' :
                phase.active ? 'bg-blue-500 border-blue-500' :
                'bg-gray-700 border-gray-600'
              }`}>
                {phase.completed && (
                  <svg className="w-2.5 h-2.5 text-white mx-auto mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-xs mt-2 ${
                phase.active ? 'text-blue-400 font-medium' :
                phase.completed ? 'text-emerald-400' :
                'text-gray-500'
              }`}>
                {phase.name}
              </span>
              {phase.active && (
                <span className="text-xs text-blue-400">▲ You are here</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </MorphingCard>
  );
}

function WeeklyRecommendations() {
  const recommendations = {
    volume: '8-10h',
    longRun: '28km',
    intensity: '20%',
  };

  return (
    <MorphingCard glowColor="blue">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Recommended This Week</h3>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{recommendations.volume}</p>
          <p className="text-xs text-gray-400">Weekly Volume</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <Target className="w-5 h-5 text-orange-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{recommendations.longRun}</p>
          <p className="text-xs text-gray-400">Long Run</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{recommendations.intensity}</p>
          <p className="text-xs text-gray-400">Intensity</p>
        </div>
      </div>
    </MorphingCard>
  );
}
