import { motion } from 'framer-motion';
import { Activity, Filter, ArrowUpDown, Calendar } from 'lucide-react';
import { useActivitiesWithFilters } from '../hooks/useActivitiesWithFilters';
import { Pagination } from '../components/Pagination';
import { DisciplineFilter } from '../components/DisciplineFilter';
import {
  formatDate,
  formatDuration,
  getDisciplineLabel,
  getIntensityLabel,
} from '../lib/utils';
import { MorphingCard, FluidButton } from '../components/morphic';
import { staggerContainer, staggerItem } from '../lib/animations';
import { getGlowColor, getDisciplineGlowColor } from '../lib/morphic-utils';

export function Activities() {
  const {
    activities,
    total,
    totalPages,
    page,
    disciplines,
    sortBy,
    sortOrder,
    isLoading,
    error,
    setPage,
    toggleDiscipline,
    setSortBy,
    toggleSortOrder,
  } = useActivitiesWithFilters();

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
        <p className="text-red-400">Failed to load activities</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 p-6 max-w-7xl mx-auto"
    >
      <motion.div variants={staggerItem} className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Activities
          </h1>
          <span className="text-sm text-gray-400 bg-white/5 px-3 py-1 rounded-full">
            {total} total
          </span>
        </div>
      </motion.div>

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="rgba(139, 92, 246, 0.3)">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Filter by Type</h3>
            </div>
            <DisciplineFilter
              selectedDisciplines={disciplines}
              onToggleDiscipline={toggleDiscipline}
            />

            <div className="flex items-center gap-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date" className="bg-[#151520]">Date</option>
                  <option value="duration" className="bg-[#151520]">Duration</option>
                  <option value="training_load" className="bg-[#151520]">Training Load</option>
                </select>
              </div>

              <FluidButton
                variant="secondary"
                size="sm"
                onClick={toggleSortOrder}
              >
                {sortOrder === 'desc' ? '↓ Descending' : '↑ Ascending'}
              </FluidButton>
            </div>
          </div>
        </MorphingCard>
      </motion.div>

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="rgba(59, 130, 246, 0.2)">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Activity List</h2>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No activities found. Try adjusting your filters.
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
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
                        {formatDuration(activity.duration_minutes)} •{' '}
                        {getIntensityLabel(activity.intensity_zone)}
                        {activity.training_load && ` • Load: ${activity.training_load}`}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="pt-4 border-t border-white/10">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={total}
                  itemsPerPage={10}
                />
              </div>
            )}
          </div>
        </MorphingCard>
      </motion.div>
    </motion.div>
  );
}
