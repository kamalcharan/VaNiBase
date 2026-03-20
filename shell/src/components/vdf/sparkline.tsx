'use client';

interface SparklineData {
  values: number[];
  color?: string;
  showArea?: boolean;
}

interface Props {
  data: SparklineData | null | undefined;
  variant?: string;
}

export default function Sparkline({ data }: Props) {
  if (!data?.values?.length) return <span className="text-muted">-</span>;

  const { values, showArea } = data;
  const color = data.color || 'var(--color-primary)';
  const width = 120;
  const height = 32;
  const padding = 2;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const line = points.join(' ');
  const area = `${padding},${height - padding} ${line} ${width - padding},${height - padding}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="inline-block w-28 h-8">
      {showArea && <polygon points={area} fill={color} opacity="0.15" />}
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}
