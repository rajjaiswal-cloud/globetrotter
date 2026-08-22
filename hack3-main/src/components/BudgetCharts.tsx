import { useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import type { TripStop, ItineraryItem, ItemCategory, Trip } from '@/types/database';
import { formatCurrency, calcTripDurationDays } from '@/lib/utils';

const categoryColors: Record<ItemCategory, string> = {
  transport: '#0F766E',
  stay: '#F59E0B',
  activities: '#3B82F6',
  meals: '#EF4444',
};

const categoryLabels: Record<ItemCategory, string> = {
  transport: 'Transport',
  stay: 'Stay',
  activities: 'Activities',
  meals: 'Meals',
};

interface BudgetChartsProps {
  trip: Trip;
  stops: TripStop[];
  items: Record<string, ItineraryItem[]>;
}

export function BudgetCharts({ trip, stops, items }: BudgetChartsProps) {
  const { pieData, barData, totalCost, grandTotal, costPerDay, isOverBudget, remainingBudget } = useMemo(() => {
    const byCategory: Record<string, number> = {};
    let itemTotal = 0;
    let stopBudgetTotal = 0;

    stops.forEach((stop) => {
      if (stop.budget != null) stopBudgetTotal += stop.budget;
      const stopItems = items[stop.id] ?? [];
      stopItems.forEach((item) => {
        const cat = (item.category ?? 'activities') as ItemCategory;
        const cost = item.cost ?? 0;
        byCategory[cat] = (byCategory[cat] ?? 0) + cost;
        itemTotal += cost;
      });
    });

    const grand = itemTotal + stopBudgetTotal;
    const duration = calcTripDurationDays(trip.start_date, trip.end_date);
    const perDay = duration > 0 ? grand / duration : 0;
    const limit = trip.budget_limit;
    const overBudget = limit != null && grand > limit;
    const remaining = limit != null ? limit - grand : null;

    const pie = (Object.keys(byCategory) as ItemCategory[])
      .map((cat) => ({
        name: categoryLabels[cat],
        value: byCategory[cat],
        category: cat,
      }))
      .filter((d) => d.value > 0);
    const bar = (Object.keys(byCategory) as ItemCategory[]).map((cat) => ({
      name: categoryLabels[cat],
      cost: byCategory[cat],
      fill: categoryColors[cat],
    }));

    return {
      pieData: pie,
      barData: bar,
      totalCost: itemTotal,
      grandTotal: grand,
      costPerDay: perDay,
      isOverBudget: overBudget,
      remainingBudget: remaining,
    };
  }, [trip, stops, items]);

  const hasData = grandTotal > 0;

  return (
    <div className="space-y-6">
      {/* Over-budget warning */}
      {isOverBudget && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Over Budget!</p>
            <p className="text-sm text-red-600 mt-0.5">
              Your estimated cost ({formatCurrency(grandTotal)}) exceeds your budget limit ({formatCurrency(trip.budget_limit!)}).
              You are {formatCurrency(grandTotal - trip.budget_limit!)} over.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">Total Estimated Cost</p>
          <p className="text-2xl font-bold text-teal-700 mt-1">{formatCurrency(grandTotal)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">Cost Per Day</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(costPerDay)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">Activity Costs</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalCost)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-500 font-medium">
            {trip.budget_limit != null ? 'Remaining Budget' : 'Budget Limit'}
          </p>
          {trip.budget_limit != null ? (
            <p className={`text-2xl font-bold mt-1 ${remainingBudget! < 0 ? 'text-red-600' : 'text-teal-700'}`}>
              {formatCurrency(remainingBudget)}
            </p>
          ) : (
            <p className="text-sm text-gray-400 mt-2">Not set</p>
          )}
        </div>
      </div>

      {!hasData ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
          <p className="text-gray-500 text-sm">No budget data yet. Add itinerary items with costs to see charts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Cost by Category</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(entry) => `${entry.name}: ${formatCurrency(entry.value as number)}`}
                  labelLine={false}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.category} fill={categoryColors[entry.category]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Cost Breakdown</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="cost" radius={[8, 8, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
