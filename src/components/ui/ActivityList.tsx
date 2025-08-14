"use client";
export function ActivityList({
  items,
}: {
  items: { id: number; txt: string; time: string }[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((act) => (
        <li key={act.id} className="text-sm">
          <p className="text-slate-900 dark:text-white">{act.txt}</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">{act.time}</p>
        </li>
      ))}
    </ul>
  );
}