import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Calendar, Trophy, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { EventForm } from './EventForm';

interface Event {
  id: number;
  name: string;
  event_date: string;
  event_type: string;
  distance?: string;
  priority: string;
  notes?: string;
}

interface EventListProps {
  onEventClick?: (event: Event) => void;
}

export function EventList({ onEventClick }: EventListProps) {
  const [showForm, setShowForm] = useState(false);
  
  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/v1/events?upcoming_only=true');
      return res.json() as Promise<Event[]>;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'A': return 'bg-red-100 text-red-800';
      case 'B': return 'bg-yellow-100 text-yellow-800';
      case 'C': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getDaysUntil = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Upcoming Events</h3>
        <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
          + Add Event
        </Button>
      </div>

      {showForm && (
        <EventForm 
          onClose={() => setShowForm(false)} 
          onSuccess={() => {
            setShowForm(false);
            refetch();
          }}
        />
      )}

      <div className="space-y-3">
        {events?.map((event) => {
          const daysUntil = getDaysUntil(event.event_date);
          
          return (
            <div
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
                  <Trophy className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{event.name}</h4>
                    <Badge className={getPriorityColor(event.priority)}>
                      {event.priority}-Race
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(event.event_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span className={daysUntil <= 7 ? 'text-red-600 font-medium' : ''}>
                      {daysUntil} days out
                    </span>
                    {event.distance && (
                      <>
                        <span>•</span>
                        <span>{event.distance}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          );
        })}

        {(!events || events.length === 0) && !showForm && (
          <div className="text-center py-8 text-gray-500">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No upcoming events</p>
            <p className="text-sm mt-1">Add your first race or training goal</p>
          </div>
        )}
      </div>
    </div>
  );
}
