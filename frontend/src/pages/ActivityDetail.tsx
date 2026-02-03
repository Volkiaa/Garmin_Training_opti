import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Activity, Zap, Edit2, Save, FileText, Mountain, Timer, RefreshCw } from 'lucide-react';
import { MorphingCard, FluidButton } from '../components/morphic';
import { staggerContainer, staggerItem } from '../lib/animations';
import { formatDate, formatDuration, formatLoad, getDisciplineLabel } from '../lib/utils';
import { getDisciplineGlowColor } from '../lib/morphic-utils';
import { ActivityMap } from '../components/ActivityMap';
import { HRZoneChart } from '../components/HRZoneChart';
import { FatigueImpact } from '../components/FatigueImpact';
import { Heart, Activity as ActivityIcon } from 'lucide-react';
import { ActivityStats } from '../components/ActivityStats';
import { SplitsTable } from '../components/SplitsTable';

export function ActivityDetail() {
  const { activity_id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const { data: activity, isLoading } = useQuery({
    queryKey: ['activity', activity_id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/activities/${activity_id}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
  });

  const { data: gpsData } = useQuery({
    queryKey: ['activity-gps', activity_id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/activities/${activity_id}/gps`);
      if (!res.ok) return { coordinates: [] };
      return res.json();
    },
    enabled: !!activity_id,
  });

  const hasGpsData = gpsData?.coordinates && gpsData.coordinates.length > 0;

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      const res = await fetch(`/api/v1/activities/${activity_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error('Failed to update notes');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity', activity_id] });
      setIsEditingNotes(false);
    },
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const startEditing = () => {
    setNotes(activity?.notes || '');
    setIsEditingNotes(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 1, repeat: Infinity }}
          className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">Activity not found</p>
        <FluidButton variant="secondary" onClick={() => navigate('/activities')} className="mt-4">
          Back to Activities
        </FluidButton>
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
      <motion.div variants={staggerItem} className="flex items-center gap-4">
        <FluidButton variant="ghost" size="sm" onClick={() => navigate('/activities')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </FluidButton>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['activity', activity_id] });
            queryClient.invalidateQueries({ queryKey: ['activities'] });
          }}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <h1 className="text-2xl font-bold text-white">
          {activity.activity_name || getDisciplineLabel(activity.discipline)}
        </h1>
      </motion.div>

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor={getDisciplineGlowColor(activity.discipline)}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Date</p>
                <p className="text-sm font-medium text-white">{formatDate(activity.started_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Duration</p>
                <p className="text-sm font-medium text-white">{formatDuration(activity.duration_minutes)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Distance</p>
                <p className="text-sm font-medium text-white">
                  {activity.distance_meters ? `${(activity.distance_meters / 1000).toFixed(2)} km` : '-'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">Load</p>
                <p className="text-sm font-medium text-white">{formatLoad(activity.training_load)}</p>
              </div>
            </div>
            {activity.elevation_gain && (
              <div className="flex items-center gap-3">
                <Mountain className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-400">Elevation</p>
                  <p className="text-sm font-medium text-white">{Math.round(activity.elevation_gain)} m</p>
                </div>
              </div>
            )}
          </div>
        </MorphingCard>
      </motion.div>

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor={getDisciplineGlowColor(activity.discipline)}>
          <ActivityStats activity={activity} />
        </MorphingCard>
      </motion.div>

      {hasGpsData && (
        <motion.div variants={staggerItem}>
          <ActivityMap activityId={Number(activity_id)} />
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="cyan">
          <div className="flex items-center gap-2 mb-4">
            <Timer className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Splits & Laps</h3>
          </div>
          <SplitsTable activityId={Number(activity_id)} />
        </MorphingCard>
      </motion.div>

      {activity.hr_zones && (
        <motion.div variants={staggerItem}>
          <MorphingCard glowColor="red">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Heart Rate Zones</h3>
            </div>
            <HRZoneChart 
              zones={activity.hr_zones} 
              totalMinutes={activity.duration_minutes} 
            />
          </MorphingCard>
        </motion.div>
      )}

      {activity.fatigue_impact && (
        <motion.div variants={staggerItem}>
          <MorphingCard glowColor="purple">
            <div className="flex items-center gap-2 mb-4">
              <ActivityIcon className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Fatigue Impact</h3>
            </div>
            <FatigueImpact impact={activity.fatigue_impact} />
          </MorphingCard>
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="blue">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Notes</h3>
            </div>
            {!isEditingNotes ? (
              <FluidButton variant="ghost" size="sm" onClick={startEditing}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </FluidButton>
            ) : (
              <FluidButton 
                variant="primary" 
                size="sm" 
                onClick={handleSaveNotes}
                disabled={updateNotesMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateNotesMutation.isPending ? 'Saving...' : 'Save'}
              </FluidButton>
            )}
          </div>
          
          {isEditingNotes ? (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Add notes about this activity..."
            />
          ) : (
            <div className="bg-white/5 rounded-lg p-3 min-h-[60px]">
              {activity?.notes ? (
                <p className="text-gray-300 whitespace-pre-wrap">{activity.notes}</p>
              ) : (
                <p className="text-gray-500 italic">No notes added yet. Click Edit to add notes.</p>
              )}
            </div>
          )}
        </MorphingCard>
      </motion.div>
    </motion.div>
  );
}
