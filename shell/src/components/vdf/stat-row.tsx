'use client';

interface StatRowData {
  stats: { label: string; value: string | number; prefix?: string; suffix?: string }[];
}

interface Props {
  data: StatRowData | null | undefined;
  variant?: 'hero' | 'compact';
}

export default function StatRow({ data, variant = 'compact' }: Props) {
  if (!data?.stats?.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-full bg-surface-hover rounded" />
      </div>
    );
  }

  const isHero = variant === 'hero';

  return (
    <div className={`rounded-lg border border-border bg-surface flex divide-x divide-border ${
      isHero ? 'p-5' : 'p-3'
    }`}>
      {data.stats.map((s, i) => (
        <div key={i} className="flex-1 text-center px-3">
          <p className={`font-bold text-foreground ${isHero ? 'text-2xl' : 'text-lg'}`}>
            {s.prefix || ''}{typeof s.value === 'number' ? s.value.toLocaleString() : s.value}{s.suffix || ''}
          </p>
          <p className={`text-muted ${isHero ? 'text-sm' : 'text-xs'}`}>{s.label}</p>
        </div>
      ))}
    </div>
  );
}
