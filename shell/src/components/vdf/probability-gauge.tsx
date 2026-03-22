'use client';

interface ProbabilityGaugeData {
  probability: number;
  target?: number;
  label: string;
  thresholds?: { green: number; amber: number };
}

interface Props {
  data: ProbabilityGaugeData | Record<string, unknown> | number | null | undefined;
  variant?: string;
  label?: string;
}

/** Convert snake_case or camelCase key to a human-readable label */
function keyToLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Check if object has the standard ProbabilityGaugeData shape */
function isGaugeData(obj: Record<string, unknown>): boolean {
  return 'probability' in obj && typeof obj.probability === 'number' && 'label' in obj;
}

/**
 * Normalize any incoming data shape to ProbabilityGaugeData.
 * Accepts:
 *   - raw number (0-1): treated as probability
 *   - { probability: 0.45 }: uses probability key, auto-generates label
 *   - { probability: 0.45, label: "..." }: standard shape
 *   - any flat object with a numeric 0-1 value: picks first matching key
 */
function normalizeData(data: NonNullable<Props['data']>, propLabel?: string): ProbabilityGaugeData | null {
  if (typeof data === 'number') {
    return { probability: data, label: propLabel || 'Probability' };
  }

  if (typeof data !== 'object' || Array.isArray(data)) return null;

  const obj = data as Record<string, unknown>;

  if (isGaugeData(obj)) {
    const g = obj as unknown as ProbabilityGaugeData;
    return { ...g, label: g.label || propLabel || 'Probability' };
  }

  // Look for a probability-like key
  const probKey =
    Object.keys(obj).find((k) => k === 'probability') ??
    Object.keys(obj).find((k) => k === 'prob') ??
    Object.keys(obj).find((k) => k === 'confidence') ??
    Object.keys(obj).find((k) => {
      const v = obj[k];
      return typeof v === 'number' && v >= 0 && v <= 1;
    });

  if (probKey && typeof obj[probKey] === 'number') {
    return {
      probability: obj[probKey] as number,
      label: propLabel || keyToLabel(probKey),
      target: typeof obj.target === 'number' ? obj.target : undefined,
      thresholds: obj.thresholds as ProbabilityGaugeData['thresholds'],
    };
  }

  return null;
}

export default function ProbabilityGauge({ data: rawData, label: propLabel }: Props) {
  const data = rawData != null ? normalizeData(rawData, propLabel) : null;

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 flex items-center justify-center h-40">
        <span className="text-muted text-sm">No gauge data</span>
      </div>
    );
  }

  const { probability, target, label, thresholds } = data;
  const pct = Math.max(0, Math.min(1, probability));
  const green = thresholds?.green ?? 0.7;
  const amber = thresholds?.amber ?? 0.4;

  const gaugeColor =
    pct >= green ? 'var(--color-success)' : pct >= amber ? 'var(--color-warning)' : 'var(--color-danger)';

  // SVG arc: 180-degree gauge
  const radius = 70;
  const cx = 80;
  const cy = 80;
  const startAngle = Math.PI;
  const endAngle = Math.PI + Math.PI * pct;

  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArc = pct > 0.5 ? 1 : 0;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col items-center">
      <svg viewBox="0 0 160 100" className="w-40 h-24">
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {pct > 0 && (
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
        )}
        {/* Target marker */}
        {target != null && (() => {
          const tAngle = Math.PI + Math.PI * Math.max(0, Math.min(1, target));
          const tx = cx + radius * Math.cos(tAngle);
          const ty = cy + radius * Math.sin(tAngle);
          return <circle cx={tx} cy={ty} r="4" fill="var(--color-muted)" />;
        })()}
      </svg>
      <span className="text-2xl font-bold text-foreground">{Math.round(pct * 100)}%</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}
