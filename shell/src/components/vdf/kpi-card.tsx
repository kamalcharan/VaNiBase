'use client';

interface KPICardData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  trend_value?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  prefix?: string;
  suffix?: string;
}

type Variant = 'default' | 'goal-progress' | 'currency' | 'percentage';

interface Props {
  data: KPICardData | null | undefined;
  variant?: Variant;
}

const STATUS_CLASSES: Record<string, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

const TREND_ICONS: Record<string, string> = {
  up: '\u25B2',
  down: '\u25BC',
  flat: '\u25C6',
};

export default function KpiCard({ data, variant = 'default' }: Props) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-20 bg-surface-hover rounded mb-2" />
        <div className="h-8 w-24 bg-surface-hover rounded" />
      </div>
    );
  }

  const prefix = data.prefix ?? (variant === 'currency' ? '\u20B9' : '');
  const suffix = data.suffix ?? (variant === 'percentage' ? '%' : '');
  const statusClass = data.status ? STATUS_CLASSES[data.status] : 'text-foreground';
  const trendColor = data.trend === 'up' ? 'text-success' : data.trend === 'down' ? 'text-danger' : 'text-muted';

  return (
    <div className="rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md">
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{data.label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${statusClass}`}>
          {prefix}{typeof data.value === 'number' ? data.value.toLocaleString() : data.value}{suffix}
        </span>
        {data.trend && (
          <span className={`text-sm flex items-center gap-0.5 ${trendColor}`}>
            {TREND_ICONS[data.trend]}
            {data.trend_value && <span>{data.trend_value}</span>}
          </span>
        )}
      </div>
      {variant === 'goal-progress' && typeof data.value === 'number' && (
        <div className="mt-3 h-2 rounded-full bg-surface-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, Number(data.value)))}%` }}
          />
        </div>
      )}
    </div>
  );
}
