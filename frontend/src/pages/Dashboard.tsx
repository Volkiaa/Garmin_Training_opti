import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { useReadinessVersion } from '../hooks/useReadinessVersion';
import { useTriggerSync } from '../hooks/useSync';
import { formatDuration, formatDate, formatLoad, getDisciplineLabel, getIntensityLabel } from '../lib/utils';
import { Activity, RefreshCw, Zap, TrendingUp, Clock } from 'lucide-react';
import { ReadinessToggle } from '../components/ReadinessToggle';
import { MorphingCard, FluidButton, ReadinessGauge } from '../components/morphic';
import { staggerContainer, staggerItem } from '../lib/animations';
import { getGlowColor, getDisciplineGlowColor } from '../lib/morphic-utils';
import { PMCMiniChart } from '../components/PMCMiniChart';

export function Dashboard() {
  const navigate = useNavigate();
  const { version, setReadinessVersion, isLoading: versionLoading } = useReadinessVersion();
  const { data: dashboard, isLoading, error } = useDashboard(version);
  const triggerSync = useTriggerSync();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Failed to load dashboard data</p>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No data available</p>
      </div>
    );
  }

  const { readiness, training_load, fatigue, recent_activities, week_summary } = dashboard;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 p-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          {!versionLoading && (
            <ReadinessToggle version={version} onChange={setReadinessVersion} />
          )}
        </div>
        <FluidButton
          variant="secondary"
          size="sm"
          onClick={() => triggerSync.mutate({ days: 28 })}
          isLoading={triggerSync.isPending}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Sync
        </FluidButton>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Readiness Score */}
        <motion.div variants={staggerItem}>
          <MorphingCard
            glowColor={getGlowColor(readiness.score)}
            expandedContent={
              <div className="space-y-2">
                <p className="text-sm text-gray-400">Factors affecting your score:</p>
                {readiness.factors.map((factor) => (
                  <div key={factor.name} className="flex justify-between text-sm">
                    <span className={factor.status === 'positive' ? 'text-green-400' : factor.status === 'negative' ? 'text-red-400' : 'text-gray-400'}>
                      {factor.name}
                    </span>
                    <span className="text-gray-300">{factor.value}</span>
                  </div>
                ))}
              </div>
            }
          >
            <div className="text-center">
              <h2 className="text-sm font-medium text-gray-400 mb-4">Readiness Score</h2>
              <div className="flex justify-center">
                <ReadinessGauge
                  score={readiness.score}
                  category={readiness.category}
                  size="md"
                />
              </div>
            </div>
          </MorphingCard>
        </motion.div>

        {/* Training Load */}
        <motion.div variants={staggerItem}>
          <MorphingCard glowColor="rgba(139, 92, 246, 0.3)">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" />
                <h2 className="text-sm font-medium text-gray-300">Training Load</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-white">{formatLoad(training_load.acute)}</p>
                  <p className="text-xs text-gray-400">Acute (7d)</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-xl">
                  <p className="text-2xl font-bold text-white">{formatLoad(training_load.chronic)}</p>
                  <p className="text-xs text-gray-400">Chronic (28d)</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <span className="text-sm text-gray-400">ACWR Ratio</span>
                <span className={`text-lg font-bold ${
                  training_load.acwr_status === 'optimal' ? 'text-green-400' : 
                  training_load.acwr_status === 'danger' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {training_load.acwr.toFixed(2)}
                </span>
              </div>
            </div>
          </MorphingCard>
        </motion.div>

        {/* Fatigue */}
        <motion.div variants={staggerItem}>
          <MorphingCard glowColor="rgba(236, 72, 153, 0.3)">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-400" />
                <h2 className="text-sm font-medium text-gray-300">Fatigue Levels</h2>
              </div>
              
              <div className="space-y-3">
                {Object.entries(fatigue).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize text-gray-400">{key}</span>
                      <span className="text-gray-300">{(value * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${value * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          value > 0.7 ? 'bg-gradient-to-r from-red-500 to-pink-500' : 
                          value > 0.5 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                          'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </MorphingCard>
        </motion.div>
      </div>

      {/* PMC Chart */}
      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="rgba(59, 130, 246, 0.3)">
          <div 
            className="space-y-4 cursor-pointer"
            onClick={() => navigate('/trends')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h2 className="text-sm font-medium text-gray-300">Performance Management</h2>
              </div>
              <span className="text-xs text-gray-400">Last 30 days</span>
            </div>
            <PMCMiniChart days={30} />
          </div>
        </MorphingCard>
      </motion.div>

      {/* Guidance Card - Dynamic based on readiness */}
      <motion.div variants={staggerItem}>
        <MorphingCard glowColor={getGlowColor(readiness.score)}>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Today&apos;s Guidance</h2>
            <p className={`text-xl font-medium ${
              readiness.score >= 80 ? 'text-emerald-400' :
              readiness.score >= 60 ? 'text-blue-400' :
              readiness.score >= 40 ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {readiness.guidance.recommendation}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readiness.guidance.avoid.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <span className="text-sm text-red-400 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    Avoid:
                  </span>
                  <p className="text-sm text-gray-300 mt-2">{readiness.guidance.avoid.join(', ')}</p>
                </div>
              )}
              
              {readiness.guidance.suggested.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <span className="text-sm text-emerald-400 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Suggested:
                  </span>
                  <p className="text-sm text-gray-300 mt-2">{readiness.guidance.suggested.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        </MorphingCard>
      </motion.div>

      {/* Recent Activities */}
      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="rgba(139, 92, 246, 0.2)">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Recent Activities</h2>
            </div>
            
            <div className="space-y-2">
              {recent_activities.slice(0, 5).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/activities/${activity.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {activity.activity_name || getDisciplineLabel(activity.discipline)}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(activity.started_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-flex items-center px-2.5 py-1 text-xs rounded-full bg-white/10 text-white border border-white/20"
                      style={{
                        boxShadow: `0 0 8px ${getDisciplineGlowColor(activity.discipline)}40`,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: getDisciplineGlowColor(activity.discipline) }}
                      />
                      {getDisciplineLabel(activity.discipline)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDuration(activity.duration_minutes)} • {getIntensityLabel(activity.intensity_zone)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </MorphingCard>
      </motion.div>

      {/* Week Summary */}
      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="rgba(16, 185, 129, 0.3)">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">This Week</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-xl">
                <p className="text-3xl font-bold text-white">{week_summary.total_hours.toFixed(1)}h</p>
                <p className="text-sm text-gray-400">Total Volume</p>
              </div>
              {Object.entries(week_summary.by_discipline)
                .filter(([_, hours]) => hours > 0)
                .slice(0, 3)
                .map(([discipline, hours]) => (
                  <div key={discipline} className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-blue-400">{hours.toFixed(1)}h</p>
                    <p className="text-sm text-gray-400 capitalize">{discipline}</p>
                  </div>
                ))}
            </div>
          </div>
        </MorphingCard>
      </motion.div>
    </motion.div>
  );
}
