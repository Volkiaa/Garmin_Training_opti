import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EventList } from '../components/EventList';
import { PhaseIndicator } from '../components/PhaseIndicator';

export function Events() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Events</h1>
      
      <PhaseIndicator />
      
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Races</CardTitle>
        </CardHeader>
        <CardContent>
          <EventList />
        </CardContent>
      </Card>
    </div>
  );
}
