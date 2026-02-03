import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MorphingCard } from '../components/morphic/MorphingCard';
import { FluidButton } from '../components/morphic/FluidButton';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useTriggerSync } from '../hooks/useSync';
import { syncApi } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, CheckCircle, User, Moon, Activity, Settings as SettingsIcon, Heart } from 'lucide-react';
import { staggerContainer, staggerItem } from '../lib/animations';

export function Settings() {
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();
  const triggerSync = useTriggerSync();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const { data: garminProfile } = useQuery({
    queryKey: ['garmin-profile'],
    queryFn: syncApi.getGarminProfile,
  });

  // Auto-update settings from Garmin when override is disabled
  useEffect(() => {
    if (settings && !settings.override_garmin && garminProfile) {
      const updates: Partial<typeof settings> = {};

      if (garminProfile.max_hr_from_activities && garminProfile.max_hr_from_activities !== settings.max_hr) {
        updates.max_hr = garminProfile.max_hr_from_activities;
      }
      if (garminProfile.stats?.restingHeartRate && garminProfile.stats.restingHeartRate !== settings.resting_hr_baseline) {
        updates.resting_hr_baseline = garminProfile.stats.restingHeartRate;
      }
      if (garminProfile.hrv_baseline && garminProfile.hrv_baseline !== settings.hrv_baseline) {
        updates.hrv_baseline = garminProfile.hrv_baseline;
      }
      if (garminProfile.sleep_target && garminProfile.sleep_target !== settings.sleep_target_hours) {
        updates.sleep_target_hours = garminProfile.sleep_target;
      }

      if (Object.keys(updates).length > 0) {
        updateSettings.mutate(updates);
      }
    }
  }, [settings, garminProfile, updateSettings]);

  const handleFullSync = async () => {
    setSyncMessage('Starting full sync... This may take a few minutes.');
    try {
      const result = await triggerSync.mutateAsync({ days: 365, fullSync: true });
      setSyncMessage(`Full sync completed! Synced ${result.activities_synced} activities.`);
    } catch (error) {
      setSyncMessage('Sync failed. Please check your Garmin connection.');
    }
  };

  const handleOverrideToggle = (checked: boolean) => {
    updateSettings.mutate({ override_garmin: checked });
  };

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const stats = garminProfile?.stats || {};
  const isOverridden = settings?.override_garmin || false;

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
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500 to-slate-500 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Settings
        </h1>
      </motion.div>

      {garminProfile?.user_profile?.full_name && (
        <motion.div variants={staggerItem}>
          <MorphingCard glowColor="slate">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Garmin Profile</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400">Name</p>
                <p className="font-medium text-white">{garminProfile.user_profile.full_name}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Resting HR
                </p>
                <p className="font-medium text-white">{stats.restingHeartRate || 'N/A'} bpm</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400">Max HR (activities)</p>
                <p className="font-medium text-white">{garminProfile.max_hr_from_activities || 'N/A'} bpm</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> HRV Baseline
                </p>
                <p className="font-medium text-white">{garminProfile.hrv_baseline?.toFixed(1) || 'N/A'} ms</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Moon className="w-3 h-3" /> Sleep Target
                </p>
                <p className="font-medium text-white">
                  {garminProfile.sleep_target ? `${garminProfile.sleep_target}h` : 'N/A'}
                </p>
              </div>
            </div>
          </MorphingCard>
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <MorphingCard glowColor="blue">
          <h3 className="text-lg font-semibold text-white mb-4">Data Synchronization</h3>
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-300">Sync All Activities</h3>
                  <p className="text-sm text-blue-400/80 mt-1">
                    This will fetch all your historical activities from Garmin Connect.
                    This may take several minutes depending on how many activities you have.
                  </p>
                </div>
              </div>
            </div>

            <FluidButton
              variant="primary"
              size="lg"
              onClick={handleFullSync}
              disabled={triggerSync.isPending}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
              {triggerSync.isPending ? 'Syncing All Activities...' : 'Sync All Activities'}
            </FluidButton>

            {syncMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 p-3 rounded-xl ${
                  syncMessage.includes('completed')
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : syncMessage.includes('failed')
                    ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                    : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                }`}
              >
                {syncMessage.includes('completed') ? (
                  <CheckCircle className="w-4 h-4" />
                ) : syncMessage.includes('failed') ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                )}
                <span className="text-sm">{syncMessage}</span>
              </motion.div>
            )}
          </div>
        </MorphingCard>
      </motion.div>

      {settings && (
        <motion.div variants={staggerItem}>
          <MorphingCard>
            <h3 className="text-lg font-semibold text-white mb-4">User Profile Settings</h3>
            <div className="space-y-4">
              <div className={`border rounded-xl p-4 ${isOverridden ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="override-garmin"
                      checked={isOverridden}
                      onChange={(e) => handleOverrideToggle(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 bg-white/5 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <label htmlFor="override-garmin" className="font-medium text-white cursor-pointer">
                      Override Garmin Profile
                    </label>
                  </div>
                  <span className={`text-sm ${isOverridden ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isOverridden ? 'Using manual values' : 'Using Garmin values'}
                  </span>
                </div>
                <p className={`text-sm mt-2 ${isOverridden ? 'text-amber-400/80' : 'text-emerald-400/80'}`}>
                  {isOverridden
                    ? 'Manual values are being used. Uncheck to automatically sync with your Garmin profile.'
                    : 'Values are automatically synced from your Garmin Connect profile. Check this box to manually override.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Max Heart Rate
                    {!isOverridden && garminProfile?.max_hr_from_activities && (
                      <span className="text-xs text-emerald-400 ml-1">(auto: {garminProfile.max_hr_from_activities})</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={settings.max_hr}
                    onChange={(e) => isOverridden && updateSettings.mutate({ max_hr: parseInt(e.target.value) })}
                    disabled={!isOverridden}
                    className={`w-full px-3 py-2 rounded-xl border bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isOverridden ? 'opacity-50 cursor-not-allowed' : 'border-white/20'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Resting Heart Rate
                    {!isOverridden && garminProfile?.stats?.restingHeartRate && (
                      <span className="text-xs text-emerald-400 ml-1">(auto: {garminProfile.stats.restingHeartRate})</span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={settings.resting_hr_baseline}
                    onChange={(e) => isOverridden && updateSettings.mutate({ resting_hr_baseline: parseInt(e.target.value) })}
                    disabled={!isOverridden}
                    className={`w-full px-3 py-2 rounded-xl border bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isOverridden ? 'opacity-50 cursor-not-allowed' : 'border-white/20'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    HRV Baseline
                    {!isOverridden && garminProfile?.hrv_baseline && (
                      <span className="text-xs text-emerald-400 ml-1">(auto: {garminProfile.hrv_baseline.toFixed(1)})</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.hrv_baseline}
                    onChange={(e) => isOverridden && updateSettings.mutate({ hrv_baseline: parseFloat(e.target.value) })}
                    disabled={!isOverridden}
                    className={`w-full px-3 py-2 rounded-xl border bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isOverridden ? 'opacity-50 cursor-not-allowed' : 'border-white/20'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Sleep Target (hours)
                    {!isOverridden && garminProfile?.sleep_target && (
                      <span className="text-xs text-emerald-400 ml-1">(auto: {garminProfile.sleep_target}h)</span>
                    )}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.sleep_target_hours}
                    onChange={(e) => isOverridden && updateSettings.mutate({ sleep_target_hours: parseFloat(e.target.value) })}
                    disabled={!isOverridden}
                    className={`w-full px-3 py-2 rounded-xl border bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !isOverridden ? 'opacity-50 cursor-not-allowed' : 'border-white/20'
                    }`}
                  />
                </div>
              </div>
            </div>
          </MorphingCard>
        </motion.div>
      )}

      {settings && (
        <motion.div variants={staggerItem}>
          <HRZoneConfiguration 
            maxHr={settings.max_hr} 
            restingHr={settings.resting_hr_baseline} 
          />
        </motion.div>
      )}
    </motion.div>
  );
}

interface HRZone {
  zone: number;
  name: string;
  min_pct: number;
  max_pct: number;
  min_bpm: number;
  max_bpm: number;
}

interface HRZoneConfigurationProps {
  maxHr: number;
  restingHr: number;
}

function HRZoneConfiguration({ maxHr, restingHr }: HRZoneConfigurationProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customZones, setCustomZones] = useState<HRZone[]>([]);
  const [source, setSource] = useState<'calculated' | 'custom'>('calculated');

  const { data: zonesData, isLoading } = useQuery({
    queryKey: ['hr-zones', maxHr, restingHr],
    queryFn: async () => {
      const res = await fetch(`/api/v1/settings/hr-zones?max_hr=${maxHr}&resting_hr=${restingHr}`);
      if (!res.ok) throw new Error('Failed to fetch HR zones');
      return res.json();
    },
  });

  useEffect(() => {
    if (zonesData) {
      setCustomZones(zonesData.zones);
      setSource(zonesData.source);
    }
  }, [zonesData]);

  const handleSaveCustom = async () => {
    try {
      const res = await fetch('/api/v1/settings/hr-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: customZones }),
      });
      if (!res.ok) throw new Error('Failed to save zones');
      setSource('custom');
      setIsCustom(false);
    } catch (e) {
      console.error('Failed to save custom zones:', e);
    }
  };

  const handleZoneChange = (index: number, field: keyof HRZone, value: number) => {
    setCustomZones(prev => prev.map((zone, i) => 
      i === index ? { ...zone, [field]: value } : zone
    ));
  };

  if (isLoading) {
    return (
      <MorphingCard glowColor="red">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Heart Rate Zones</h3>
        </div>
        <div className="flex justify-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-8 h-8 border-2 border-red-400 border-t-transparent rounded-full"
          />
        </div>
      </MorphingCard>
    );
  }

  const zones = isCustom ? customZones : (zonesData?.zones || []);

  return (
    <MorphingCard glowColor="red">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Heart Rate Zones</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${source === 'custom' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {source === 'custom' ? 'Custom' : 'Auto-calculated'}
          </span>
          <button
            onClick={() => setIsCustom(!isCustom)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isCustom ? 'bg-amber-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isCustom ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-400">Custom</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-2 text-sm font-medium text-gray-400">Zone</th>
              <th className="text-left py-2 text-sm font-medium text-gray-400">% Max HR</th>
              <th className="text-left py-2 text-sm font-medium text-gray-400">BPM</th>
            </tr>
          </thead>
          <tbody>
            {zones.map((zone: {zone: number; name: string; min_pct: number; max_pct: number; min_bpm: number; max_bpm: number}, index: number) => (
              <tr key={zone.zone} className="border-b border-white/5">
                <td className="py-2 text-white">{zone.name}</td>
                <td className="py-2 text-gray-300">
                  {isCustom ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={zone.min_pct}
                        onChange={(e) => handleZoneChange(index, 'min_pct', parseInt(e.target.value))}
                        className="w-12 px-1 py-0.5 rounded bg-white/10 text-white text-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={zone.max_pct}
                        onChange={(e) => handleZoneChange(index, 'max_pct', parseInt(e.target.value))}
                        className="w-12 px-1 py-0.5 rounded bg-white/10 text-white text-sm"
                      />
                      <span>%</span>
                    </div>
                  ) : (
                    `${zone.min_pct}-${zone.max_pct}%`
                  )}
                </td>
                <td className="py-2 text-gray-300">
                  {isCustom ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={zone.min_bpm}
                        onChange={(e) => handleZoneChange(index, 'min_bpm', parseInt(e.target.value))}
                        className="w-14 px-1 py-0.5 rounded bg-white/10 text-white text-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        value={zone.max_bpm}
                        onChange={(e) => handleZoneChange(index, 'max_bpm', parseInt(e.target.value))}
                        className="w-14 px-1 py-0.5 rounded bg-white/10 text-white text-sm"
                      />
                    </div>
                  ) : (
                    `${zone.min_bpm}-${zone.max_bpm}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCustom && (
        <div className="flex gap-2 mt-4">
          <FluidButton variant="primary" size="sm" onClick={handleSaveCustom}>
            Save Custom Zones
          </FluidButton>
          <FluidButton variant="ghost" size="sm" onClick={() => setIsCustom(false)}>
            Cancel
          </FluidButton>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-4">
        Based on Max HR: {maxHr} bpm, Resting HR: {restingHr} bpm
      </p>
    </MorphingCard>
  );
}
