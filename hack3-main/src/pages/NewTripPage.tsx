import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { generateSlug, isEndDateValid } from '@/lib/utils';
import type { TripStatus } from '@/types/database';

export function NewTripPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState('');
  const [errors, setErrors] = useState<{ name?: string; endDate?: string }>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name) errs.name = 'Trip name is required';
    if (startDate && endDate && !isEndDateValid(startDate, endDate)) errs.endDate = 'End date must be on or after start date';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const status: TripStatus = !startDate ? 'upcoming' : new Date(startDate) > new Date() ? 'upcoming' : endDate && new Date(endDate) < new Date() ? 'completed' : 'ongoing';
      const { data, error } = await supabase
        .from('trips')
        .insert({
          user_id: user!.id,
          name,
          description: description || null,
          cover_photo_url: coverPhotoUrl || null,
          start_date: startDate || null,
          end_date: endDate || null,
          status,
          is_public: false,
          share_slug: generateSlug(),
        })
        .select()
        .single();
      if (error) throw error;
      showToast('Trip created! Start building your itinerary.', 'success');
      navigate(`/trips/${data.id}/build`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create trip', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/trips')} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700">
        <ArrowLeft className="w-4 h-4" />
        Back to Trips
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Plan a New Trip</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Trip Name"
            placeholder="e.g. European Summer 2026"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              error={errors.endDate}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="What's this trip about?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
          <Input
            label="Cover Photo URL"
            placeholder="https://..."
            value={coverPhotoUrl}
            onChange={(e) => setCoverPhotoUrl(e.target.value)}
            hint="Optional — paste an image URL for your trip cover"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => navigate('/trips')}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              <Save className="w-4 h-4" />
              Create Trip
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
