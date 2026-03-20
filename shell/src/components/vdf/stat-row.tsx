'use client';

import { resolvePath } from '../../lib/json-path';

interface StatItem {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
}

interface StatRowData {
  stats: StatItem[];
}

interface Props {
  data: StatRowData | Record<string, unknown> | null | undefined;
  variant?: 'hero' | 'compact';
  stats?: StatItem[];
}

export default function StatRow({ data, variant = 'compact', stats: propStats }: Props) {
  // Resolve stats: prefer data.stats, fall back to prop-level stats with JSONPath resolution
  let resolvedStats: StatItem[] | undefined;
  if (data && 'stats' in data && Array.isArray(data.stats)) {
    resolvedStats = data.stats;
  } else if (propStats && data && typeof data === 'object') {
    // Recipe passes stats in props with JSONPath values — resolve them against data
    resolvedStats = propStats.map((s) => ({
      ...s,
      value: typeof s.value === 'string' && s.value.startsWith('$')
        ? (resolvePath(data as Record<string, unknown>, s.value) as string | number) ?? s.value
        : s.value,
    }));
  }

  if (!resolvedStats?.length) {
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
      {resolvedStats.map((s, i) => (
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
