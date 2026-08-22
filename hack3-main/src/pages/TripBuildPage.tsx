import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, ChevronRight,
  Save, GripVertical,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/context/ToastContext';
import type { Trip, TripStop, ItineraryItem, City, Activity, ItemCategory } from '@/types/database';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { InlineSpinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils';

const categories: ItemCategory[] = ['transport', 'stay', 'activities', 'meals'];

export function TripBuildPage() {
  const { id: tripId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [stops, setStops] = useState<TripStop[]>([]);
  const [items, setItems] = useState<Record<string, ItineraryItem[]>>({});
  const [cities, setCities] = useState<City[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStop, setSavingStop] = useState(false);
  const [reordering, setReordering] = useState<string | null>(null);
  const [budgetLimit, setBudgetLimit] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    try {
      const [tripRes, stopsRes, citiesRes] = await Promise.all([
        supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
        supabase.from('trip_stops').select('*, city:cities(*)').eq('trip_id', tripId).order('order_index', { ascending: true }),
        supabase.from('cities').select('*').order('name', { ascending: true }),
      ]);
      if (tripRes.error) throw tripRes.error;
      if (stopsRes.error) throw stopsRes.error;
      if (citiesRes.error) throw citiesRes.error;
      const tripData = tripRes.data as Trip;
      setTrip(tripData);
      setBudgetLimit(tripData.budget_limit != null ? String(tripData.budget_limit) : '');
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
      }

      setCities(citiesRes.data as City[]);

      const { data: actsData } = await supabase.from('activities_catalog').select('*').order('name');
      setActivities(actsData as Activity[]);

      if (stopsData.length > 0) setExpandedStop(stopsData[0].id);
    } catch {
      showToast('Failed to load trip data', 'error');
    } finally {
      setLoading(false);
    }
  }, [tripId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addStop = async () => {
    if (!tripId) return;
    setSavingStop(true);
    try {
      const newOrder = stops.length > 0 ? Math.max(...stops.map((s) => s.order_index)) + 1 : 0;
      const { data, error } = await supabase
        .from('trip_stops')
        .insert({
          trip_id: tripId,
          order_index: newOrder,
          budget: null,
          notes: null,
          start_date: null,
          end_date: null,
        })
        .select('*, city:cities(*)')
        .single();
      if (error) throw error;
      setStops((prev) => [...prev, data as TripStop]);
      setItems((prev) => ({ ...prev, [data.id]: [] }));
      setExpandedStop(data.id);
    } catch {
      showToast('Failed to add stop', 'error');
    } finally {
      setSavingStop(false);
    }
  };

  const updateStop = async (stopId: string, updates: Partial<TripStop>) => {
    try {
      const { error } = await supabase.from('trip_stops').update(updates).eq('id', stopId);
      if (error) throw error;
      setStops((prev) => prev.map((s) => (s.id === stopId ? { ...s, ...updates } : s)));
    } catch {
      showToast('Failed to update stop', 'error');
    }
  };

  const deleteStop = async (stopId: string) => {
    try {
      const { error } = await supabase.from('trip_stops').delete().eq('id', stopId);
      if (error) throw error;
      setStops((prev) => prev.filter((s) => s.id !== stopId));
      setItems((prev) => {
        const next = { ...prev };
        delete next[stopId];
        return next;
      });
      showToast('Stop removed', 'success');
    } catch {
      showToast('Failed to remove stop', 'error');
    }
  };

  const moveStop = async (stopId: string, direction: 'up' | 'down') => {
    const idx = stops.findIndex((s) => s.id === stopId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= stops.length) return;

    const stopA = stops[idx];
    const stopB = stops[swapIdx];
    const orderA = stopA.order_index;
    const orderB = stopB.order_index;

    setReordering(stopId);
    try {
      // Swap order_index values in DB
      const [resA, resB] = await Promise.all([
        supabase.from('trip_stops').update({ order_index: orderB }).eq('id', stopA.id),
        supabase.from('trip_stops').update({ order_index: orderA }).eq('id', stopB.id),
      ]);
      if (resA.error) throw resA.error;
      if (resB.error) throw resB.error;

      // Update local state with swapped order
      const newStops = [...stops];
      newStops[idx] = { ...stopA, order_index: orderB };
      newStops[swapIdx] = { ...stopB, order_index: orderA };
      newStops.sort((a, b) => a.order_index - b.order_index);
      setStops(newStops);
    } catch {
      showToast('Failed to reorder stops', 'error');
    } finally {
      setReordering(null);
    }
  };

  const addItem = async (stopId: string) => {
    const currentItems = items[stopId] ?? [];
    const newOrder = currentItems.length > 0 ? Math.max(...currentItems.map((i) => i.order_index)) + 1 : 0;
    try {
      const { data, error } = await supabase
        .from('itinerary_items')
        .insert({
          stop_id: stopId,
          day_number: 1,
          time_slot: null,
          cost: 0,
          category: 'activities',
          custom_title: 'New activity',
          activity_id: null,
          notes: null,
          order_index: newOrder,
        })
        .select('*, activity:activities_catalog(*)')
        .single();
      if (error) throw error;
      setItems((prev) => ({ ...prev, [stopId]: [...(prev[stopId] ?? []), data as ItineraryItem] }));
    } catch {
      showToast('Failed to add item', 'error');
    }
  };

  const updateItem = async (stopId: string, itemId: string, updates: Partial<ItineraryItem>) => {
    try {
      const { error } = await supabase.from('itinerary_items').update(updates).eq('id', itemId);
      if (error) throw error;
      setItems((prev) => ({
        ...prev,
        [stopId]: (prev[stopId] ?? []).map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
      }));
    } catch {
      showToast('Failed to update item', 'error');
    }
  };

  const deleteItem = async (stopId: string, itemId: string) => {
    try {
      const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId);
      if (error) throw error;
      setItems((prev) => ({
        ...prev,
        [stopId]: (prev[stopId] ?? []).filter((i) => i.id !== itemId),
      }));
    } catch {
      showToast('Failed to remove item', 'error');
    }
  };

  const saveBudgetLimit = async () => {
    if (!trip) return;
    setSavingBudget(true);
    try {
      const limit = budgetLimit ? Number(budgetLimit) : null;
      const { error } = await supabase.from('trips').update({ budget_limit: limit }).eq('id', trip.id);
      if (error) throw error;
      setTrip({ ...trip, budget_limit: limit });
      showToast('Budget limit saved', 'success');
    } catch {
      showToast('Failed to save budget limit', 'error');
    } finally {
      setSavingBudget(false);
    }
  };

  if (loading) return <InlineSpinner label="Loading itinerary..." />;

  if (!trip) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Trip not found.</p>
        <Link to="/trips" className="text-teal-700 font-medium hover:underline mt-2 inline-block">Back to Trips</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <button onClick={() => navigate(`/trips/${trip.id}`)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700 mb-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Trip
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{trip.name}</h1>
          <p className="text-sm text-gray-500">Build your itinerary stop by stop</p>
        </div>
        <Link to={`/trips/${trip.id}`}>
          <Button variant="outline">
            <Save className="w-4 h-4" />
            Done
          </Button>
        </Link>
      </div>

      {/* Budget Limit */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Trip Budget Limit (optional)</label>
          <Input
            type="number"
            placeholder="e.g. 5000"
            value={budgetLimit}
            onChange={(e) => setBudgetLimit(e.target.value)}
            hint="Set a target budget to track spending and get over-budget warnings"
          />
        </div>
        <Button variant="outline" loading={savingBudget} onClick={saveBudgetLimit}>
          <Save className="w-4 h-4" />
          Save Limit
        </Button>
      </div>

      {/* Stops */}
      <div className="space-y-4">
        {stops.map((stop, idx) => {
          const isExpanded = expandedStop === stop.id;
          const stopItems = items[stop.id] ?? [];
          const cityActivities = activities.filter((a) => a.city_id === stop.city_id);
          return (
            <div key={stop.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Stop header */}
              <div className="flex items-center gap-2 p-4">
                <GripVertical className="w-5 h-5 text-gray-300 flex-shrink-0" />
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveStop(stop.id, 'up')}
                    disabled={idx === 0 || reordering !== null}
                    className="text-gray-300 hover:text-teal-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveStop(stop.id, 'down')}
                    disabled={idx === stops.length - 1 || reordering !== null}
                    className="text-gray-300 hover:text-teal-600 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                      {idx + 1}
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">
                      {stop.city?.name ?? 'Select a city'}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 ml-9">
                    {stop.city?.country ?? 'No city selected'}
                    {stop.start_date && ` · ${stop.start_date}`}
                    {stopItems.length > 0 && ` · ${stopItems.length} ${stopItems.length === 1 ? 'item' : 'items'}`}
                  </p>
                </div>
                <button
                  onClick={() => setExpandedStop(isExpanded ? null : stop.id)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <ChevronRight className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
              </div>

              {/* Stop body */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                      <select
                        value={stop.city_id ?? ''}
                        onChange={(e) => updateStop(stop.id, { city_id: e.target.value || null })}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Select a city...</option>
                        {cities.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}, {c.country}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Stop Budget</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={stop.budget ?? ''}
                        onChange={(e) => updateStop(stop.id, { budget: e.target.value ? Number(e.target.value) : null })}
                        hint="Extra stop-level costs (hotel, transport)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date</label>
                      <Input
                        type="date"
                        value={stop.start_date ?? ''}
                        onChange={(e) => updateStop(stop.id, { start_date: e.target.value || null })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date</label>
                      <Input
                        type="date"
                        value={stop.end_date ?? ''}
                        onChange={(e) => updateStop(stop.id, { end_date: e.target.value || null })}
                      />
                    </div>
                  </div>
                  <Textarea
                    label="Notes"
                    placeholder="Notes about this stop..."
                    value={stop.notes ?? ''}
                    onChange={(e) => updateStop(stop.id, { notes: e.target.value || null })}
                    rows={2}
                  />

                  {/* Itinerary items */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">
                        Itinerary Items
                        {stopItems.length > 0 && <span className="text-gray-400 font-normal ml-1">({stopItems.length})</span>}
                      </h4>
                      <Button size="sm" variant="outline" onClick={() => addItem(stop.id)}>
                        <Plus className="w-3.5 h-3.5" />
                        Add Item
                      </Button>
                    </div>
                    {stopItems.length === 0 ? (
                      <p className="text-sm text-gray-400 py-3 text-center bg-gray-50 rounded-lg">No items yet. Add activities, stays, transport, or meals.</p>
                    ) : (
                      stopItems.map((item, itemIdx) => (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-3 space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-medium text-gray-400 mt-2">{itemIdx + 1}.</span>
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Day</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.day_number}
                                  onChange={(e) => updateItem(stop.id, item.id, { day_number: Number(e.target.value) })}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Time</label>
                                <input
                                  type="time"
                                  value={item.time_slot ?? ''}
                                  onChange={(e) => updateItem(stop.id, item.id, { time_slot: e.target.value || null })}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Cost</label>
                                <input
                                  type="number"
                                  value={item.cost ?? 0}
                                  onChange={(e) => updateItem(stop.id, item.id, { cost: Number(e.target.value) })}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Category</label>
                                <select
                                  value={item.category ?? 'activities'}
                                  onChange={(e) => updateItem(stop.id, item.id, { category: e.target.value as ItemCategory })}
                                  className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                  {categories.map((c) => (
                                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteItem(stop.id, item.id)}
                              className="text-gray-400 hover:text-red-600 p-1 mt-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Activity (from catalog)</label>
                              <select
                                value={item.activity_id ?? ''}
                                onChange={(e) => {
                                  const actId = e.target.value || null;
                                  const act = cityActivities.find((a) => a.id === actId);
                                  updateItem(stop.id, item.id, {
                                    activity_id: actId,
                                    custom_title: act ? act.name : item.custom_title,
                                    cost: act ? act.cost ?? item.cost : item.cost,
                                  });
                                }}
                                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                              >
                                <option value="">Custom title...</option>
                                {cityActivities.map((a) => (
                                  <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.cost)})</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Custom Title</label>
                              <input
                                type="text"
                                value={item.custom_title ?? ''}
                                onChange={(e) => updateItem(stop.id, item.id, { custom_title: e.target.value || null })}
                                placeholder="Enter a title..."
                                className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Notes</label>
                            <input
                              type="text"
                              value={item.notes ?? ''}
                              onChange={(e) => updateItem(stop.id, item.id, { notes: e.target.value || null })}
                              placeholder="Optional notes..."
                              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button size="sm" variant="ghost" onClick={() => deleteStop(stop.id)}>
                      <Trash2 className="w-4 h-4" />
                      Remove Stop
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add stop button */}
      <button
        onClick={addStop}
        disabled={savingStop}
        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 text-gray-500 hover:border-teal-400 hover:text-teal-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Plus className="w-5 h-5" />
        Add Another Stop
      </button>
    </div>
  );
}
