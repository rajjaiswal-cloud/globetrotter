import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MapPin, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Trip, TripStatus } from '@/types/database';
import { TripCard } from '@/components/TripCard';
import { SearchBar, SortDropdown } from '@/components/SearchBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { GridSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type TabKey = TripStatus;

const tabs: { key: TabKey; label: string }[] = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
];

const sortOptions = [
  { value: 'created_desc', label: 'Newest first' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'start_desc', label: 'Start date (newest)' },
];

export function TripsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('ongoing');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_desc');
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTrips = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const allTrips = data as Trip[];

      // Fetch stop counts
      if (allTrips.length > 0) {
        const tripIds = allTrips.map((t) => t.id);
        const { data: stopsData } = await supabase
          .from('trip_stops')
          .select('trip_id')
          .in('trip_id', tripIds);
        const counts: Record<string, number> = {};
        stopsData?.forEach((s) => {
          counts[s.trip_id] = (counts[s.trip_id] ?? 0) + 1;
        });
        setStopCounts(counts);
      }
      setTrips(allTrips);
    } catch {
      showToast('Failed to load trips', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const filteredTrips = trips
    .filter((t) => t.status === activeTab)
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'created_asc':
          return a.created_at.localeCompare(b.created_at);
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'start_desc':
          return (b.start_date ?? '').localeCompare(a.start_date ?? '');
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });

  const handleDelete = async () => {
    if (!tripToDelete) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('trips').delete().eq('id', tripToDelete.id);
      if (error) throw error;
      showToast('Trip deleted', 'success');
      setTrips((prev) => prev.filter((t) => t.id !== tripToDelete.id));
      setTripToDelete(null);
    } catch {
      showToast('Failed to delete trip', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
        <Link to="/trips/new">
          <Button>
            <Plus className="w-4 h-4" />
            New Trip
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar value={search} onChange={setSearch} placeholder="Search trips by name..." />
        </div>
        <SortDropdown value={sortBy} onChange={setSortBy} options={sortOptions} />
      </div>

      {/* Grid */}
      {loading ? (
        <GridSkeleton count={6} />
      ) : filteredTrips.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={`No ${activeTab} trips`}
          description={search ? 'No trips match your search.' : 'Create a new trip to get started.'}
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
          {filteredTrips.map((trip) => (
            <TripCard
              key={trip.id}
              trip={trip}
              stopCount={stopCounts[trip.id] ?? 0}
              onDelete={setTripToDelete}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Modal open={!!tripToDelete} onClose={() => setTripToDelete(null)} title="Delete Trip" size="sm">
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>{tripToDelete?.name}</strong>? This will also delete all stops and itinerary items. This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setTripToDelete(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
