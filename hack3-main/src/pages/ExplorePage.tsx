import { useEffect, useState, useCallback } from 'react';
import { MapPin, Plus, DollarSign, Clock, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { City, Activity, Trip, TripStop } from '@/types/database';
import { SearchBar, SortDropdown } from '@/components/SearchBar';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { costIndexToDollars, formatCurrency } from '@/lib/utils';

type TabKey = 'cities' | 'activities';

export function ExplorePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabKey>('cities');
  const [cities, setCities] = useState<City[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [costFilter, setCostFilter] = useState('');
  const [sortBy, setSortBy] = useState('popularity_desc');
  const [modalItem, setModalItem] = useState<{ type: 'city' | 'activity'; data: City | Activity } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [citiesRes, actsRes] = await Promise.all([
          supabase.from('cities').select('*'),
          supabase.from('activities_catalog').select('*, city:cities(*)'),
        ]);
        if (citiesRes.error) throw citiesRes.error;
        if (actsRes.error) throw actsRes.error;
        setCities(citiesRes.data as City[]);
        setActivities(actsRes.data as Activity[]);
      } catch {
        showToast('Failed to load explore data', 'error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const countries = Array.from(new Set(cities.map((c) => c.country).filter((c): c is string => c != null))).sort();
  const activityCategories = Array.from(new Set(activities.map((a) => a.category).filter((c): c is string => c != null))).sort();

  const filteredCities = cities
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.country.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => !countryFilter || c.country === countryFilter)
    .filter((c) => !costFilter || (c.cost_index ?? 0) <= Number(costFilter))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'cost_asc': return (a.cost_index ?? 0) - (b.cost_index ?? 0);
        case 'cost_desc': return (b.cost_index ?? 0) - (a.cost_index ?? 0);
        default: return (b.popularity ?? 0) - (a.popularity ?? 0);
      }
    });

  const filteredActivities = activities
    .filter((a) => a.name.toLowerCase().includes(search.toLowerCase()))
    .filter((a) => !categoryFilter || a.category === categoryFilter)
    .filter((a) => !costFilter || (a.cost ?? 0) <= Number(costFilter))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name_asc': return a.name.localeCompare(b.name);
        case 'cost_asc': return (a.cost ?? 0) - (b.cost ?? 0);
        case 'cost_desc': return (b.cost ?? 0) - (a.cost ?? 0);
        default: return (b.cost ?? 0) - (a.cost ?? 0);
      }
    });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Explore</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['cities', 'activities'] as TabKey[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); setCountryFilter(''); setCategoryFilter(''); setCostFilter(''); setSortBy(t === 'cities' ? 'popularity_desc' : 'cost_desc'); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${
              tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder={`Search ${tab}...`} />
        </div>
        {tab === 'cities' && (
          <select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Countries</option>
            {countries.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {tab === 'activities' && (
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Categories</option>
            {activityCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={costFilter} onChange={(e) => setCostFilter(e.target.value)} className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="">Any Cost</option>
          <option value="1">$ and below</option>
          <option value="2">$$ and below</option>
          <option value="3">$$$ and below</option>
          <option value="4">$$$$ and below</option>
        </select>
        <SortDropdown
          value={sortBy}
          onChange={setSortBy}
          options={tab === 'cities'
            ? [
              { value: 'popularity_desc', label: 'Most popular' },
              { value: 'name_asc', label: 'Name A–Z' },
              { value: 'cost_asc', label: 'Cost: Low to High' },
              { value: 'cost_desc', label: 'Cost: High to Low' },
            ]
            : [
              { value: 'cost_desc', label: 'Cost: High to Low' },
              { value: 'name_asc', label: 'Name A–Z' },
              { value: 'cost_asc', label: 'Cost: Low to High' },
            ]
          }
        />
      </div>

      {/* Grid */}
      {loading ? (
        <GridSkeleton count={6} />
      ) : tab === 'cities' ? (
        filteredCities.length === 0 ? (
          <EmptyState icon={MapPin} title="No cities found" description="Try adjusting your search or filters." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCities.map((city) => (
              <div key={city.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="h-40 bg-teal-50 overflow-hidden">
                  {city.image_url ? (
                    <img src={city.image_url} alt={city.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-10 h-10 text-teal-300" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{city.name}</h3>
                      <p className="text-sm text-gray-500">{city.country}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-amber-500">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="text-gray-600">{city.popularity ?? 0}</span>
                    </div>
                  </div>
                  {city.description && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{city.description}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="text-sm font-medium text-gray-700">{costIndexToDollars(city.cost_index)}</span>
                    <Button size="sm" variant="outline" onClick={() => setModalItem({ type: 'city', data: city })}>
                      <Plus className="w-3.5 h-3.5" />
                      Add to Trip
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredActivities.length === 0 ? (
        <EmptyState icon={MapPin} title="No activities found" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map((act) => (
            <div key={act.id} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div className="h-32 bg-blue-50 overflow-hidden">
                {act.image_url ? (
                  <img src={act.image_url} alt={act.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50">
                    <Star className="w-8 h-8 text-blue-300" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{act.name}</h3>
                <p className="text-sm text-gray-500">{(act as Activity & { city?: City }).city?.name ?? 'Unknown city'}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  {act.category && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{act.category}</span>}
                  {act.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {act.duration_minutes}m
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    {formatCurrency(act.cost)}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => setModalItem({ type: 'activity', data: act })}>
                    <Plus className="w-3.5 h-3.5" />
                    Add to Trip
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalItem && (
        <AddToTripModal
          item={modalItem}
          userId={user!.id}
          onClose={() => setModalItem(null)}
          onAdded={() => { setModalItem(null); showToast('Added to trip!', 'success'); }}
        />
      )}
    </div>
  );
}

function AddToTripModal({
  item,
  userId,
  onClose,
  onAdded,
}: {
  item: { type: 'city' | 'activity'; data: City | Activity };
  userId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { showToast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [selectedStop, setSelectedStop] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('trips').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      setTrips(data as Trip[]);
      if (data && data.length > 0) setSelectedTrip(data[0].id);
    } catch {
      showToast('Failed to load trips', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showToast]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  useEffect(() => {
    async function loadStops() {
      if (!selectedTrip) { setStops([]); return; }
      try {
        const { data, error } = await supabase.from('trip_stops').select('*, city:cities(*)').eq('trip_id', selectedTrip).order('order_index', { ascending: true });
        if (error) throw error;
        setStops(data as TripStop[]);
        setSelectedStop('');
      } catch {
        // ignore
      }
    }
    loadStops();
  }, [selectedTrip]);

  const handleAdd = async () => {
    if (!selectedTrip) return;
    setAdding(true);
    try {
      if (item.type === 'city') {
        const city = item.data as City;
        if (selectedStop) {
          // Add city to existing stop
          const { error } = await supabase.from('trip_stops').update({ city_id: city.id }).eq('id', selectedStop);
          if (error) throw error;
        } else {
          // Create new stop
          const newOrder = stops.length > 0 ? Math.max(...stops.map((s) => s.order_index)) + 1 : 0;
          const { error } = await supabase.from('trip_stops').insert({
            trip_id: selectedTrip,
            city_id: city.id,
            order_index: newOrder,
          });
          if (error) throw error;
        }
      } else {
        // Add activity as itinerary item
        const activity = item.data as Activity;
        let stopId = selectedStop;
        if (!stopId) {
          // Create a new stop for the activity's city
          const newOrder = stops.length > 0 ? Math.max(...stops.map((s) => s.order_index)) + 1 : 0;
          const { data: newStop, error: stopErr } = await supabase
            .from('trip_stops')
            .insert({ trip_id: selectedTrip, city_id: activity.city_id, order_index: newOrder })
            .select()
            .single();
          if (stopErr) throw stopErr;
          stopId = newStop.id;
        }
        const currentItems = stops.find((s) => s.id === stopId);
        const { error } = await supabase.from('itinerary_items').insert({
          stop_id: stopId,
          activity_id: activity.id,
          custom_title: activity.name,
          day_number: 1,
          cost: activity.cost ?? 0,
          category: 'activities',
          order_index: 0,
        });
        if (error) throw error;
        void currentItems;
      }
      onAdded();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add', 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Add ${item.type === 'city' ? 'City' : 'Activity'} to Trip`} size="sm">
      {loading ? (
        <p className="text-sm text-gray-500 text-center py-4">Loading your trips...</p>
      ) : trips.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500 mb-4">You don't have any trips yet.</p>
          <Button onClick={onClose}>Close</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Trip</label>
            <select
              value={selectedTrip}
              onChange={(e) => setSelectedTrip(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {trips.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          {stops.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Add to Stop (optional)</label>
              <select
                value={selectedStop}
                onChange={(e) => setSelectedStop(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Create new stop</option>
                {stops.map((s) => (
                  <option key={s.id} value={s.id}>Stop {s.order_index + 1}: {s.city?.name ?? 'No city'}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button loading={adding} onClick={handleAdd} disabled={!selectedTrip}>
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
