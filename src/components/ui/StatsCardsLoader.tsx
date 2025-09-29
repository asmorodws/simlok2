'use client';

interface StatsCardsLoaderProps {
  count?: number;
}

export default function StatsCardsLoader({ count = 4 }: StatsCardsLoaderProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-6 rounded-xl border shadow-sm animate-pulse">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}