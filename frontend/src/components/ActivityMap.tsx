import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MorphingCard } from './morphic';

interface GPSCoordinate {
  latitude: number;
  longitude: number;
  altitude?: number;
  time?: string;
}

interface ActivityMapProps {
  activityId: number;
}

// Component to fit map bounds to the route
function MapBounds({ coordinates }: { coordinates: GPSCoordinate[] }) {
  const map = useMap();

  if (coordinates.length > 0) {
    const bounds = new LatLngBounds(
      coordinates.map((coord) => [coord.latitude, coord.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [20, 20] });
  }

  return null;
}

export function ActivityMap({ activityId }: ActivityMapProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['activity-gps', activityId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/activities/${activityId}/gps`);
      if (!res.ok) {
        if (res.status === 404) {
          return { coordinates: [] };
        }
        throw new Error('Failed to fetch GPS data');
      }
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <MorphingCard>
        <h2 className="text-lg font-semibold text-white mb-4">Activity Route</h2>
        <div className="flex justify-center items-center h-64">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
          />
        </div>
      </MorphingCard>
    );
  }

  if (error) {
    return (
      <MorphingCard>
        <h2 className="text-lg font-semibold text-white mb-4">Activity Route</h2>
        <div className="flex justify-center items-center h-64">
          <p className="text-red-400">Failed to load GPS data</p>
        </div>
      </MorphingCard>
    );
  }

  const coordinates: GPSCoordinate[] = data?.coordinates || [];

  if (coordinates.length === 0) {
    return (
      <MorphingCard>
        <h2 className="text-lg font-semibold text-white mb-4">Activity Route</h2>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-400">No GPS data available for this activity</p>
        </div>
      </MorphingCard>
    );
  }

  // Calculate center from first coordinate
  const center: [number, number] = [coordinates[0].latitude, coordinates[0].longitude];

  // Convert coordinates to polyline format
  const polylinePositions: [number, number][] = coordinates.map((coord) => [
    coord.latitude,
    coord.longitude,
  ]);

  return (
    <MorphingCard>
      <h2 className="text-lg font-semibold text-white mb-4">Activity Route</h2>
      <div className="h-64 rounded-lg overflow-hidden">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Polyline
            positions={polylinePositions}
            color="#3b82f6"
            weight={4}
            opacity={0.8}
          />
          <MapBounds coordinates={coordinates} />
        </MapContainer>
      </div>
    </MorphingCard>
  );
}
