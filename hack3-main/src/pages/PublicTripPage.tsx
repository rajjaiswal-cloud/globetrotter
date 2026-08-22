import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Globe, Copy, Check, Lock, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Trip, TripStop, ItineraryItem } from '@/types/database';
import { ItineraryView } from '@/components/ItineraryView';
import { BudgetCharts } from '@/components/BudgetCharts';
import { Button } from '@/components/ui/Button';
import { InlineSpinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { formatDateRange, generateSlug } from '@/lib/utils';

export function PublicTripPage() {
  const { shareSlug } = useParams<{ shareSlug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [items, setItems] = useState<Record<string, ItineraryItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!shareSlug) return;
    setLoading(true);
    try {
      const { data: tripData, error: tripErr } = await supabase
        .from('trips')
        .select('*')
        .eq('share_slug', shareSlug)
        .eq('is_public', true)
        .maybeSingle();
      if (tripErr) throw tripErr;
      if (!tripData) {
        setTrip(null);
        setLoading(false);
        return;
      }
      setTrip(tripData as Trip);

      const { data: stopsData, error: stopsErr } = await supabase
        .from('trip_stops')
        .select('*, city:cities(*)')
        .eq('trip_id', tripData.id)
        .order('order_index', { ascending: true });
      if (stopsErr) throw stopsErr;
      const stopsRows = stopsData as TripStop[];
      setStops(stopsRows);

      if (stopsRows.length > 0) {
        const stopIds = stopsRows.map((s) => s.id);
        const { data: itemsData, error: itemsErr } = await supabase
          .from('itinerary_items')
          .select('*, activity:activities_catalog(*)')
          .in('stop_id', stopIds)
          .order('order_index', { ascending: true });
        if (itemsErr) throw itemsErr;
        const itemsMap: Record<string, ItineraryItem[]> = {};
        (itemsData as ItineraryItem[]).forEach((item) => {
          if (!itemsMap[item.stop_id]) itemsMap[item.stop_id] = [];
          itemsMap[item.stop_id].push(item);
        });
        setItems(itemsMap);
      }
    } catch {
      showToast('Failed to load shared trip', 'error');
    } finally {
      setLoading(false);
    }
  }, [shareSlug, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyTrip = async () => {
    if (!trip || !user) {
      navigate(`/login?returnTo=${encodeURIComponent(`/t/${shareSlug}`)}`);
      return;
    }
    setCopying(true);
    try {
      // Create new trip
      const newSlug = generateSlug();
      const { data: newTrip, error: tripErr } = await supabase
        .from('trips')
        .insert({
          user_id: user.id,
          name: `${trip.name} (Copy)`,
          description: trip.description,
          cover_photo_url: trip.cover_photo_url,
          start_date: trip.start_date,
          end_date: trip.end_date,
          budget_limit: trip.budget_limit,
          status: 'upcoming',
          is_public: false,
          share_slug: newSlug,
        })
        .select()
        .single();
      if (tripErr) throw tripErr;

      // Copy stops and items
      for (const stop of stops) {
        const { data: newStop, error: stopErr } = await supabase
          .from('trip_stops')
          .insert({
            trip_id: newTrip.id,
            city_id: stop.city_id,
            order_index: stop.order_index,
            start_date: stop.start_date,
            end_date: stop.end_date,
            budget: stop.budget,
            notes: stop.notes,
          })
          .select()
          .single();
        if (stopErr) throw stopErr;

        const stopItems = items[stop.id] ?? [];
        if (stopItems.length > 0) {
          const itemInserts = stopItems.map((item) => ({
            stop_id: newStop.id,
            activity_id: item.activity_id,
            custom_title: item.custom_title,
            day_number: item.day_number,
            time_slot: item.time_slot,
            cost: item.cost,
            category: item.category,
            notes: item.notes,
            order_index: item.order_index,
          }));
          const { error: itemsErr } = await supabase.from('itinerary_items').insert(itemInserts);
          if (itemsErr) throw itemsErr;
        }
      }

      showToast('Trip copied to your account!', 'success');
      navigate(`/trips/${newTrip.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to copy trip', 'error');
    } finally {
      setCopying(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy URL', 'error');
    }
  };

  if (loading) return <InlineSpinner label="Loading shared trip..." />;

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Trip Not Available</h1>
          <p className="text-sm text-gray-500 mb-6">This trip is either private or no longer shared.</p>
          <Link to="/login">
            <Button>Go to GlobeTrotter</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/login" className="flex items-center gap-2 text-teal-700 font-bold text-lg">
            <Globe className="w-6 h-6" />
            <span>GlobeTrotter</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copyUrl}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
            {user ? (
              <Button size="sm" loading={copying} onClick={copyTrip}>
                <Copy className="w-4 h-4" />
                Copy This Trip
              </Button>
            ) : (
              <Link to={`/login?returnTo=${encodeURIComponent(`/t/${shareSlug}`)}`}>
                <Button size="sm">Sign in to Copy</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Trip header */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {trip.cover_photo_url && (
            <div className="h-48 sm:h-64 overflow-hidden bg-teal-50">
              <img src={trip.cover_photo_url} alt={trip.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{trip.name}</h1>
              <StatusBadge status={trip.status} />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              {formatDateRange(trip.start_date, trip.end_date)}
            </div>
            {trip.description && <p className="text-sm text-gray-600 mt-3">{trip.description}</p>}
          </div>
        </div>

        {/* Itinerary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Itinerary</h2>
          <ItineraryView stops={stops} items={items} />
        </div>

        {/* Budget */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Budget</h2>
          <BudgetCharts trip={trip} stops={stops} items={items} />
        </div>
      </main>
    </div>
  );
}
