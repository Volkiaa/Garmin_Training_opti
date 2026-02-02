import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Activity } from 'lucide-react';
import { useActivitiesWithFilters } from '../hooks/useActivitiesWithFilters';
import { Pagination } from '../components/Pagination';
import { DisciplineFilter } from '../components/DisciplineFilter';
import {
  formatDate,
  formatDuration,
  getDisciplineColor,
  getDisciplineLabel,
  getIntensityLabel,
} from '../lib/utils';

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load activities</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <span className="text-sm text-gray-600">{total} total</span>
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Filter by Type</h3>
            <DisciplineFilter
              selectedDisciplines={disciplines}
              onToggleDiscipline={toggleDiscipline}
            />
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="duration">Duration</option>
                <option value="training_load">Training Load</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleSortOrder}
            >
              {sortOrder === 'desc' ? '↓ Descending' : '↑ Ascending'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No activities found. Try adjusting your filters.
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.activity_name || getDisciplineLabel(activity.discipline)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(activity.started_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="default"
                      className={getDisciplineColor(activity.discipline)}
                    >
                      {getDisciplineLabel(activity.discipline)}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDuration(activity.duration_minutes)} •{' '}
                      {getIntensityLabel(activity.intensity_zone)}
                      {activity.training_load && ` • Load: ${activity.training_load}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={total}
              itemsPerPage={10}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
