'use client';

import { useEffect, useRef } from 'react';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
import { getChartColors } from '../../lib/chart-colors';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface Segment {
  label: string;
  value: number;
  color?: string;
}

interface DoughnutData {
  segments: Segment[];
  centerLabel?: string;
  centerValue?: string;
}

interface Props {
  data: DoughnutData | Record<string, unknown>[] | Record<string, unknown> | null | undefined;
  variant?: string;
}

/**
 * Auto-detect segments from a raw array of objects.
 * Supports shapes like:
 *   [{ category: "Mid Cap", value: 43467, percentage: 33 }]
 *   [{ label: "Equity", amount: 50000 }]
 *   [{ name: "SIP", count: 5 }]
 */
function autoDetectSegments(arr: Record<string, unknown>[]): Segment[] {
  if (arr.length === 0) return [];

  const sample = arr[0];
  const keys = Object.keys(sample);

  // Find label key: prefer label > category > name > type > first string key
  const labelKey =
    keys.find((k) => k === 'label') ??
    keys.find((k) => k === 'category') ??
    keys.find((k) => k === 'name') ??
    keys.find((k) => k === 'type') ??
    keys.find((k) => typeof sample[k] === 'string');

  // Find value key: prefer value > amount > count > percentage > first number key
  const valueKey =
    keys.find((k) => k === 'value') ??
    keys.find((k) => k === 'amount') ??
    keys.find((k) => k === 'count') ??
    keys.find((k) => k === 'percentage') ??
    keys.find((k) => typeof sample[k] === 'number');

  if (!labelKey || !valueKey) return [];

  return arr.map((item) => ({
    label: String(item[labelKey] ?? ''),
    value: Number(item[valueKey] ?? 0),
    color: typeof item.color === 'string' ? item.color : undefined,
  }));
}

/**
 * Auto-detect segments from a flat object like { "Mid Cap": 43467, "Large Cap": 43170 }.
 */
function flatObjectToSegments(obj: Record<string, unknown>): Segment[] {
  const segments: Segment[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'number') {
      segments.push({ label: key, value: val });
    }
  }
  return segments;
}

/** Normalize any incoming data shape into DoughnutData */
function normalizeData(data: NonNullable<Props['data']>): DoughnutData | null {
  // Already in expected shape
  if ('segments' in data && Array.isArray((data as DoughnutData).segments)) {
    return data as DoughnutData;
  }

  // Raw array of objects
  if (Array.isArray(data)) {
    const segments = autoDetectSegments(data as Record<string, unknown>[]);
    return segments.length > 0 ? { segments } : null;
  }

  // Flat object with numeric values
  if (typeof data === 'object') {
    const segments = flatObjectToSegments(data as Record<string, unknown>);
    return segments.length > 0 ? { segments } : null;
  }

  return null;
}

export default function Doughnut({ data: rawData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'doughnut'> | null>(null);

  const data = rawData ? normalizeData(rawData) : null;

  useEffect(() => {
    if (!canvasRef.current || !data?.segments?.length) return;

    const themeColors = getChartColors(data.segments.length);
    const colors = data.segments.map((s, i) => s.color || themeColors[i % themeColors.length]);

    if (chartRef.current) {
      chartRef.current.data.labels = data.segments.map((s) => s.label);
      chartRef.current.data.datasets[0].data = data.segments.map((s) => s.value);
      chartRef.current.data.datasets[0].backgroundColor = colors;
      chartRef.current.update();
      return;
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels: data.segments.map((s) => s.label),
        datasets: [{
          data: data.segments.map((s) => s.value),
          backgroundColor: colors,
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  if (!data?.segments?.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 flex items-center justify-center h-48">
        <span className="text-muted text-sm">No chart data</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4 relative">
      <canvas ref={canvasRef} />
      {data.centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '2rem' }}>
          <span className="text-lg font-bold text-foreground">{data.centerValue}</span>
          <span className="text-xs text-muted">{data.centerLabel}</span>
        </div>
      )}
    </div>
  );
}
