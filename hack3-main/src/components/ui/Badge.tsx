import type { TripStatus } from '@/types/database';

const statusConfig: Record<TripStatus, { label: string; classes: string }> = {
  upcoming: { label: 'Upcoming', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  ongoing: { label: 'Ongoing', classes: 'bg-teal-50 text-teal-700 border-teal-200' },
  completed: { label: 'Completed', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
};

export function StatusBadge({ status }: { status: TripStatus }) {
  const config = statusConfig[status] ?? statusConfig.upcoming;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.classes}`}>
      {config.label}
    </span>
  );
}

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
