'use client';

interface TableLoaderProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export default function TableLoader({ 
  rows = 5, 
  columns = 4,
  showHeader = true 
}: TableLoaderProps) {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      {showHeader && (
        <div className="bg-gray-50 p-4 border-b">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
            ))}
          </div>
        </div>
      )}
      
      {/* Rows skeleton */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4">
            <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  {j === 0 && <div className="h-3 bg-gray-200 rounded w-2/3"></div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}