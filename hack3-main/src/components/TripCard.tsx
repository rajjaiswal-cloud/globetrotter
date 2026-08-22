import { Link } from 'react-router-dom';
import { MapPin, Calendar, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Trip, TripStop } from '@/types/database';
import { StatusBadge } from '@/components/ui/Badge';
import { formatDateRange } from '@/lib/utils';

interface TripCardProps {
  trip: Trip;
  stopCount?: number;
  stops?: TripStop[];
  onDelete?: (trip: Trip) => void;
  showActions?: boolean;
}

export function TripCard({ trip, stopCount, stops, onDelete, showActions = true }: TripCardProps) {
  const count = stopCount ?? stops?.length ?? 0;

  return (
    <div className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link to={`/trips/${trip.id}`} className="block relative h-40 overflow-hidden bg-teal-50">
        {trip.cover_photo_url ? (
          <img
            src={trip.cover_photo_url}
            alt={trip.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-50">
            <MapPin className="w-10 h-10 text-teal-400" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <StatusBadge status={trip.status} />
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <Link to={`/trips/${trip.id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-teal-700 transition-colors line-clamp-1">{trip.name}</h3>
        </Link>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{count} {count === 1 ? 'stop' : 'stops'}</span>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
            <Link
              to={`/trips/${trip.id}`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700 font-medium"
            >
              <Eye className="w-4 h-4" />
              View
            </Link>
            <Link
              to={`/trips/${trip.id}/build`}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700 font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </Link>
            {onDelete && (
              <button
                onClick={() => onDelete(trip)}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 font-medium ml-auto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
