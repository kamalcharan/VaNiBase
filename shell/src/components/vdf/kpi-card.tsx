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
  data: KPICardData | string | number | null | undefined;
  variant?: Variant;
  label?: string;
  status?: KPICardData['status'];
  prefix?: string;
  suffix?: string;
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

export default function KpiCard({ data, variant = 'default', label: propLabel, status: propStatus, prefix: propPrefix, suffix: propSuffix }: Props) {
  if (data == null) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-20 bg-surface-hover rounded mb-2" />
        <div className="h-8 w-24 bg-surface-hover rounded" />
      </div>
    );
  }

  // When data is a primitive (from recipe JSONPath), merge with prop-level overrides
  const card: KPICardData = typeof data === 'object'
    ? { ...data, label: data.label || propLabel || '', status: data.status || propStatus }
    : { label: propLabel || '', value: data, status: propStatus };

  const prefix = card.prefix ?? propPrefix ?? (variant === 'currency' ? '\u20B9' : '');
  const suffix = card.suffix ?? propSuffix ?? (variant === 'percentage' ? '%' : '');
  const statusClass = card.status ? STATUS_CLASSES[card.status] : 'text-foreground';
  const trendColor = card.trend === 'up' ? 'text-success' : card.trend === 'down' ? 'text-danger' : 'text-muted';

  return (
    <div className="rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md">
      <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">{card.label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${statusClass}`}>
          {prefix}{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}{suffix}
        </span>
        {card.trend && (
          <span className={`text-sm flex items-center gap-0.5 ${trendColor}`}>
            {TREND_ICONS[card.trend]}
            {card.trend_value && <span>{card.trend_value}</span>}
          </span>
        )}
      </div>
      {variant === 'goal-progress' && typeof card.value === 'number' && (
        <div className="mt-3 h-2 rounded-full bg-surface-hover overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, Number(card.value)))}%` }}
          />
        </div>
      )}
    </div>
  );
}
