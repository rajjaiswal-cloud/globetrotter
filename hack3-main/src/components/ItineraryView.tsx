import { useMemo } from 'react';
import { MapPin, Clock, DollarSign } from 'lucide-react';
import type { TripStop, ItineraryItem } from '@/types/database';
import { formatDateRange, formatCurrency } from '@/lib/utils';

const categoryColors: Record<string, string> = {
  transport: 'bg-teal-50 text-teal-700 border-teal-200',
  stay: 'bg-amber-50 text-amber-700 border-amber-200',
  activities: 'bg-blue-50 text-blue-700 border-blue-200',
  meals: 'bg-red-50 text-red-700 border-red-200',
};

interface ItineraryViewProps {
  stops: TripStop[];
  items: Record<string, ItineraryItem[]>;
}

export function ItineraryView({ stops, items }: ItineraryViewProps) {
  const grouped = useMemo(() => {
    return stops.map((stop) => {
      const stopItems = items[stop.id] ?? [];
      const byDay: Record<number, ItineraryItem[]> = {};
      stopItems.forEach((item) => {
        const day = item.day_number || 1;
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(item);
      });
      Object.keys(byDay).forEach((day) => {
        byDay[Number(day)].sort((a, b) => (a.time_slot ?? '').localeCompare(b.time_slot ?? '') || a.order_index - b.order_index);
      });
      return { stop, days: byDay };
    });
  }, [stops, items]);

  if (stops.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No stops added yet. Use the builder to add stops and activities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(({ stop, days }, stopIdx) => {
        const dayNumbers = Object.keys(days).map(Number).sort((a, b) => a - b);
        return (
          <div key={stop.id}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center text-sm font-semibold">
                {stopIdx + 1}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{stop.city?.name ?? 'Unspecified City'}</h3>
                <p className="text-sm text-gray-500">
                  {stop.city?.country}
                  {stop.start_date && ` · ${formatDateRange(stop.start_date, stop.end_date)}`}
                </p>
              </div>
            </div>

            {stop.notes && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-4 ml-11">{stop.notes}</p>
            )}

            {dayNumbers.length === 0 ? (
              <p className="text-sm text-gray-400 ml-11 mb-4">No items for this stop.</p>
            ) : (
              <div className="ml-11 space-y-6">
                {dayNumbers.map((day) => (
                  <div key={day}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 text-xs font-medium">Day {day}</span>
                    </h4>
                    <div className="border-l-2 border-gray-100 pl-4 space-y-3">
                      {days[day].map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-100 p-3 flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 pt-1">
                            {item.time_slot && (
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {item.time_slot}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900 text-sm">
                                {item.custom_title ?? item.activity?.name ?? 'Untitled'}
                              </p>
                              {item.category && (
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${categoryColors[item.category] ?? categoryColors.activities}`}>
                                  {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                                </span>
                              )}
                            </div>
                            {item.notes && <p className="text-xs text-gray-500 mt-1">{item.notes}</p>}
                          </div>
                          {item.cost != null && item.cost > 0 && (
                            <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                              {formatCurrency(item.cost)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
