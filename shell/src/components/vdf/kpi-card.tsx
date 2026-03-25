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
  data: KPICardData | Record<string, unknown> | string | number | null | undefined;
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

function keyToLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function isKPICardData(obj: Record<string, unknown>): boolean {
  return 'value' in obj && (typeof obj.value === 'string' || typeof obj.value === 'number');
}

function autoDetectKPI(obj: Record<string, unknown>, variant?: Variant): KPICardData {
  const skipKeys = new Set(['id', 'client_id', 'tenant_id', 'user_id']);

  // Try to find a good label: name > label > title > first string
  const labelKey = ['name', 'label', 'title', 'scheme_name', 'category'].find(k => typeof obj[k] === 'string');
  const label = labelKey ? String(obj[labelKey]) : '';

  // For goal-progress variant, prefer probability
  if (variant === 'goal-progress') {
    const prob = obj['probability'] ?? obj['progress'] ?? obj['completion'];
    if (typeof prob === 'number') {
      return {
        label: label || 'Goal',
        value: Math.round(prob * 100),
        suffix: '%',
        status: prob >= 0.7 ? 'success' : prob >= 0.4 ? 'warning' : 'danger',
      };
    }
  }

  // For currency variant, prefer amount/value keys
  if (variant === 'currency') {
    const amountKey = ['total_value', 'current_value', 'value', 'amount', 'target_amount', 'aum', 'current_corpus'].find(k => typeof obj[k] === 'number');
    if (amountKey) {
      return { label: label || keyToLabel(amountKey), value: obj[amountKey] as number };
    }
  }

  // For percentage variant
  if (variant === 'percentage') {
    const pctKey = ['return_pct', 'percentage', 'rate', 'xirr_pct', 'probability'].find(k => typeof obj[k] === 'number');
    if (pctKey) {
      return { label: label || keyToLabel(pctKey), value: obj[pctKey] as number };
    }
  }

  // Default: pick first meaningful numeric key (skip id fields)
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'number' && !skipKeys.has(key)) {
      return { label: label || keyToLabel(key), value: val };
    }
  }

  // Fallback
  const entry = Object.entries(obj).find(([k]) => !skipKeys.has(k));
  const [key, val] = entry ?? ['', ''];
  return { label: label || keyToLabel(String(key)), value: String(val ?? '') };
}

export default function KpiCard({ data, variant = 'default', label: propLabel, status: propStatus, prefix: propPrefix, suffix: propSuffix }: Props) {
  if (data == null) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-20 bg-surface-hover rounded mb-2" />
        <div className="h-8 w-24 bg-surface-hover rounded" />
      </div>
    );
  }

  let card: KPICardData;

  if (typeof data === 'string' || typeof data === 'number') {
    card = { label: propLabel || '', value: data, status: propStatus };
  } else if (isKPICardData(data as Record<string, unknown>)) {
    const d = data as KPICardData;
    card = { ...d, label: d.label || propLabel || '', status: d.status || propStatus };
  } else {
    card = { ...autoDetectKPI(data as Record<string, unknown>, variant), status: propStatus };
    if (propLabel) card.label = propLabel;
  }

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