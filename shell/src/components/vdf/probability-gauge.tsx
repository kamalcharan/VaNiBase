'use client';

interface ProbabilityGaugeData {
  probability: number;
  target?: number;
  label: string;
  thresholds?: { green: number; amber: number };
}

interface Props {
  data: ProbabilityGaugeData | null | undefined;
  variant?: string;
}

export default function ProbabilityGauge({ data }: Props) {
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
