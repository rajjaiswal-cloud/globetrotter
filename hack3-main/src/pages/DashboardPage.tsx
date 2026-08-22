import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Compass, ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { City, Trip } from '@/types/database';
import { TripCard } from '@/components/TripCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { costIndexToDollars } from '@/lib/utils';

export function DashboardPage() {
  const { profile } = useAuth();
  const [cities, setCities] = useState<City[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [citiesRes, tripsRes] = await Promise.all([
          supabase.from('cities').select('*').order('popularity', { ascending: false }).limit(6),
          supabase.from('trips').select('*').order('created_at', { ascending: false }).limit(3),
        ]);
        if (citiesRes.error) throw citiesRes.error;
        if (tripsRes.error) throw tripsRes.error;
        setCities(citiesRes.data as City[]);
        setTrips(tripsRes.data as Trip[]);
      } catch {
        // handled by empty states
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const firstName = profile?.first_name || 'Traveler';

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 rounded-2xl p-6 sm:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-teal-100 text-sm font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Welcome back
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">Hello, {firstName}!</h1>
            <p className="text-teal-100 mt-2 text-sm">Ready to plan your next adventure?</p>
          </div>
          <Link to="/trips/new">
            <Button variant="secondary" size="lg" className="shadow-lg">
              <Plus className="w-5 h-5" />
              Plan a New Trip
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Regional Selections */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Compass className="w-5 h-5 text-teal-600" />
            Top Regional Selections
          </h2>
          <Link to="/explore" className="text-sm text-teal-700 font-medium hover:underline flex items-center gap-1">
            Explore all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="min-w-[240px] h-48 flex-shrink-0" />
            ))}
          </div>
        ) : cities.length === 0 ? (
          <p className="text-sm text-gray-500">No cities available yet.</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {cities.map((city) => (
              <Link
                key={city.id}
                to="/explore"
                className="group min-w-[240px] flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="h-28 bg-teal-50 overflow-hidden">
                  {city.image_url ? (
                    <img src={city.image_url} alt={city.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-8 h-8 text-teal-300" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-900 text-sm">{city.name}</h3>
                  <p className="text-xs text-gray-500">{city.country}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{costIndexToDollars(city.cost_index)}</span>
                    <span className="text-xs text-teal-600 font-medium">{city.popularity ?? 0} popular</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Trips */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Trips</h2>
          <Link to="/trips" className="text-sm text-teal-700 font-medium hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No trips yet"
            description="Start planning your first adventure and build a day-by-day itinerary."
            action={
              <Link to="/trips/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Plan a New Trip
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
