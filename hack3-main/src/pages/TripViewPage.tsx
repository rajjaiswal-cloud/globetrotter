import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Share2, Copy, Check, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { Trip, TripStop, ItineraryItem } from '@/types/database';
import { ItineraryView } from '@/components/ItineraryView';
import { BudgetCharts } from '@/components/BudgetCharts';
import { Button } from '@/components/ui/Button';
import { InlineSpinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/ui/Badge';
import { formatDateRange } from '@/lib/utils';

export function TripViewPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [items, setItems] = useState<Record<string, ItineraryItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    try {
      const [tripRes, stopsRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
        supabase.from('trip_stops').select('*, city:cities(*)').eq('trip_id', tripId).order('order_index', { ascending: true }),
      ]);
      if (tripRes.error) throw tripRes.error;
      if (stopsRes.error) throw stopsRes.error;
      setTrip(tripRes.data as Trip);
      const stopsData = stopsRes.data as TripStop[];
      setStops(stopsData);

      if (stopsData.length > 0) {
        const stopIds = stopsData.map((s) => s.id);
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
      } else {
        setItems({});
      }
    } catch {
      showToast('Failed to load trip', 'error');
    } finally {
      setLoading(false);
    }
  }, [tripId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription: refetch when itinerary_items or trip_stops change
  useEffect(() => {
    if (!tripId) return;
    const stopIdList = stops.map((s) => s.id).join(',');
    const itemFilter = stopIdList ? `stop_id=in.(${stopIdList})` : undefined;
    const stopsFilter = `trip_id=eq.${tripId}`;
    const tripFilter = `id=eq.${tripId}`;

    let channel = supabase.channel(`trip-${tripId}-updates`);
    if (itemFilter) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_items', filter: itemFilter }, () => { loadData(); });
    }
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: 'trip_stops', filter: stopsFilter }, () => { loadData(); });
    channel = channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trips', filter: tripFilter }, (payload) => { setTrip(payload.new as Trip); });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, stops, loadData]);

  const handleShare = async () => {
    if (!trip) return;
    setSharing(true);
    try {
      if (trip.is_public) {
        // Toggle OFF — make private
        const { error } = await supabase.from('trips').update({ is_public: false }).eq('id', trip.id);
        if (error) throw error;
        setTrip({ ...trip, is_public: false });
        showToast('Trip is now private', 'success');
      } else {
        // Toggle ON — make public
        let slug = trip.share_slug;
        if (!slug) {
          slug = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
        }
        const { error } = await supabase.from('trips').update({ is_public: true, share_slug: slug }).eq('id', trip.id);
        if (error) throw error;
        setTrip({ ...trip, is_public: true, share_slug: slug });
        showToast('Trip is now public!', 'success');
      }
    } catch {
      showToast('Failed to update sharing', 'error');
    } finally {
      setSharing(false);
    }
  };

  const shareUrl = trip?.share_slug ? `${window.location.origin}/t/${trip.share_slug}` : '';

  const copyUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy to clipboard', 'error');
    }
  };

  if (loading) return <InlineSpinner label="Loading trip..." />;

  if (!trip) {
    return (
      <div className="text-center py-16">
        <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Trip not found.</p>
        <Link to="/trips" className="text-teal-700 font-medium hover:underline mt-2 inline-block">Back to Trips</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/trips')} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Trips
      </button>

      {/* Trip header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {trip.cover_photo_url && (
          <div className="h-48 sm:h-64 overflow-hidden bg-teal-50">
            <img src={trip.cover_photo_url} alt={trip.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{trip.name}</h1>
                <StatusBadge status={trip.status} />
              </div>
              <p className="text-sm text-gray-500">{formatDateRange(trip.start_date, trip.end_date)}</p>
              {trip.description && <p className="text-sm text-gray-600 mt-2">{trip.description}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/trips/${trip.id}/build`}>
                <Button variant="outline">
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
              </Link>
              <Button variant={trip.is_public ? 'outline' : 'secondary'} loading={sharing} onClick={handleShare}>
                <Share2 className="w-4 h-4" />
                {trip.is_public ? 'Make Private' : 'Make Public'}
              </Button>
            </div>
          </div>

          {trip.is_public && shareUrl && (
            <div className="mt-4 flex items-center gap-2 bg-teal-50 rounded-lg p-3 border border-teal-100">
              <Link to={`/t/${trip.share_slug}`} className="text-sm text-teal-700 font-medium truncate flex-1 hover:underline">
                {shareUrl}
              </Link>
              <button onClick={copyUrl} className="text-teal-600 hover:text-teal-800 p-1">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
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
    </div>
  );
}
