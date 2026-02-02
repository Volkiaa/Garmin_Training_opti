import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { useTriggerSync } from '../hooks/useSync';
import { syncApi } from '../lib/api';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, CheckCircle, User, Moon, Activity } from 'lucide-react';

export function Settings() {
  const { data: settings, isLoading: isLoadingSettings } = useSettings();
  const updateSettings = useUpdateSettings();
  const triggerSync = useTriggerSync();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const { data: garminProfile, isLoading: isLoadingProfile } = useQuery({
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = garminProfile?.stats || {};
  const isOverridden = settings?.override_garmin || false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {garminProfile?.user_profile?.full_name && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Garmin Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{garminProfile.user_profile.full_name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Resting HR
                </p>
                <p className="font-medium">{stats.restingHeartRate || 'N/A'} bpm</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Max HR (activities)</p>
                <p className="font-medium">{garminProfile.max_hr_from_activities || 'N/A'} bpm</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> HRV Baseline
                </p>
                <p className="font-medium">{garminProfile.hrv_baseline?.toFixed(1) || 'N/A'} ms</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Moon className="w-3 h-3" /> Sleep Target
                </p>
                <p className="font-medium">
                  {garminProfile.sleep_target ? `${garminProfile.sleep_target}h` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data Synchronization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-900">Sync All Activities</h3>
                <p className="text-sm text-blue-700 mt-1">
                  This will fetch all your historical activities from Garmin Connect. 
                  This may take several minutes depending on how many activities you have.
                </p>
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleFullSync}
            disabled={triggerSync.isPending}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${triggerSync.isPending ? 'animate-spin' : ''}`} />
            {triggerSync.isPending ? 'Syncing All Activities...' : 'Sync All Activities'}
          </Button>

          {syncMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-md ${
              syncMessage.includes('completed') 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : syncMessage.includes('failed')
                ? 'bg-red-50 text-red-800 border border-red-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
            }`}>
              {syncMessage.includes('completed') ? (
                <CheckCircle className="w-4 h-4" />
              ) : syncMessage.includes('failed') ? (
                <AlertCircle className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4 animate-spin" />
              )}
              <span className="text-sm">{syncMessage}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>User Profile Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`border rounded-md p-4 ${isOverridden ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="override-garmin"
                    checked={isOverridden}
                    onChange={(e) => handleOverrideToggle(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="override-garmin" className="font-medium text-gray-900 cursor-pointer">
                    Override Garmin Profile
                  </label>
                </div>
                <span className={`text-sm ${isOverridden ? 'text-yellow-700' : 'text-green-700'}`}>
                  {isOverridden ? 'Using manual values' : 'Using Garmin values'}
                </span>
              </div>
              <p className={`text-sm mt-2 ${isOverridden ? 'text-yellow-600' : 'text-green-600'}`}>
                {isOverridden 
                  ? 'Manual values are being used. Uncheck to automatically sync with your Garmin profile.'
                  : 'Values are automatically synced from your Garmin Connect profile. Check this box to manually override.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Heart Rate
                  {!isOverridden && garminProfile?.max_hr_from_activities && (
                    <span className="text-xs text-green-600 ml-1">(auto: {garminProfile.max_hr_from_activities})</span>
                  )}
                </label>
                <input
                  type="number"
                  value={settings.max_hr}
                  onChange={(e) => isOverridden && updateSettings.mutate({ max_hr: parseInt(e.target.value) })}
                  disabled={!isOverridden}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !isOverridden ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resting Heart Rate
                  {!isOverridden && garminProfile?.stats?.restingHeartRate && (
                    <span className="text-xs text-green-600 ml-1">(auto: {garminProfile.stats.restingHeartRate})</span>
                  )}
                </label>
                <input
                  type="number"
                  value={settings.resting_hr_baseline}
                  onChange={(e) => isOverridden && updateSettings.mutate({ resting_hr_baseline: parseInt(e.target.value) })}
                  disabled={!isOverridden}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !isOverridden ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HRV Baseline
                  {!isOverridden && garminProfile?.hrv_baseline && (
                    <span className="text-xs text-green-600 ml-1">(auto: {garminProfile.hrv_baseline.toFixed(1)})</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.hrv_baseline}
                  onChange={(e) => isOverridden && updateSettings.mutate({ hrv_baseline: parseFloat(e.target.value) })}
                  disabled={!isOverridden}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !isOverridden ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sleep Target (hours)
                  {!isOverridden && garminProfile?.sleep_target && (
                    <span className="text-xs text-green-600 ml-1">(auto: {garminProfile.sleep_target}h)</span>
                  )}
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.sleep_target_hours}
                  onChange={(e) => isOverridden && updateSettings.mutate({ sleep_target_hours: parseFloat(e.target.value) })}
                  disabled={!isOverridden}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    !isOverridden ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
