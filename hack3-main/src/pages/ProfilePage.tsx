import { useEffect, useState, useCallback } from 'react';
import { Save, MapPin, User as UserIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import type { Profile, Trip } from '@/types/database';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { TripCard } from '@/components/TripCard';
import { InlineSpinner } from '@/components/ui/Spinner';

export function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({});
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    if (profile) {
      setForm({ ...profile });
    }
  }, [profile]);

  const loadTrips = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.from('trips').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      const allTrips = data as Trip[];
      setTrips(allTrips);
      if (allTrips.length > 0) {
        const tripIds = allTrips.map((t) => t.id);
        const { data: stopsData } = await supabase.from('trip_stops').select('trip_id').in('trip_id', tripIds);
        const counts: Record<string, number> = {};
        stopsData?.forEach((s) => { counts[s.trip_id] = (counts[s.trip_id] ?? 0) + 1; });
        setStopCounts(counts);
      }
    } catch {
      // ignore
    } finally {
      setLoadingTrips(false);
    }
  }, [user]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const update = (field: keyof Profile, value: string) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone,
          city: form.city,
          country: form.country,
          avatar_url: form.avatar_url,
          additional_info: form.additional_info,
        })
        .eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      showToast('Profile updated', 'success');
    } catch {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <InlineSpinner label="Loading profile..." />;

  const preplanned = trips.filter((t) => t.status === 'upcoming' || t.status === 'ongoing');
  const previous = trips.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-teal-700 text-white flex items-center justify-center text-xl font-bold">
          {(form.first_name?.[0] ?? '') + (form.last_name?.[0] ?? '') || <UserIcon className="w-7 h-7" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{form.first_name} {form.last_name}</h1>
          <p className="text-sm text-gray-500">{form.email}</p>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Edit Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="First Name" value={form.first_name ?? ''} onChange={(e) => update('first_name', e.target.value)} />
          <Input label="Last Name" value={form.last_name ?? ''} onChange={(e) => update('last_name', e.target.value)} />
        </div>
        <Input label="Email" type="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
        <Input label="Phone" type="tel" value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="City" value={form.city ?? ''} onChange={(e) => update('city', e.target.value)} />
          <Input label="Country" value={form.country ?? ''} onChange={(e) => update('country', e.target.value)} />
        </div>
        <Input label="Avatar URL" value={form.avatar_url ?? ''} onChange={(e) => update('avatar_url', e.target.value)} placeholder="https://..." />
        <Textarea label="Additional Info" value={form.additional_info ?? ''} onChange={(e) => update('additional_info', e.target.value)} rows={3} placeholder="Tell us about yourself..." />
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </form>

      {/* Preplanned Trips */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Preplanned Trips</h2>
        {loadingTrips ? (
          <InlineSpinner label="Loading trips..." />
        ) : preplanned.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No upcoming trips.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {preplanned.map((trip) => (
              <TripCard key={trip.id} trip={trip} stopCount={stopCounts[trip.id] ?? 0} />
            ))}
          </div>
        )}
      </section>

      {/* Previous Trips */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Previous Trips</h2>
        {loadingTrips ? (
          <InlineSpinner label="Loading trips..." />
        ) : previous.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No completed trips yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {previous.map((trip) => (
              <TripCard key={trip.id} trip={trip} stopCount={stopCounts[trip.id] ?? 0} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
