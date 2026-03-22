'use client';

import { useEffect, useRef } from 'react';
import { Chart, BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';
import { getChartColors } from '../../lib/chart-colors';

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip, Legend);

interface BarChartData {
  categories: string[];
  values: number[] | { label: string; data: number[]; color?: string }[];
  horizontal?: boolean;
}

interface Props {
  data: BarChartData | Record<string, unknown>[] | Record<string, unknown> | null | undefined;
  variant?: string;
}

/**
 * Auto-detect BarChartData from a raw array of objects.
 * Supports shapes like:
 *   [{ category: "Mid Cap", value: 43467 }]
 *   [{ name: "Jan", revenue: 5000 }]
 */
function autoDetectFromArray(arr: Record<string, unknown>[]): BarChartData | null {
  if (arr.length === 0) return null;

  const sample = arr[0];
  const keys = Object.keys(sample);

  // Find category key: prefer category > label > name > type > first string key
  const catKey =
    keys.find((k) => k === 'category') ??
    keys.find((k) => k === 'label') ??
    keys.find((k) => k === 'name') ??
    keys.find((k) => k === 'type') ??
    keys.find((k) => typeof sample[k] === 'string');

  if (!catKey) return null;

  // All numeric keys become values
  const numericKeys = keys.filter(
    (k) => k !== catKey && typeof sample[k] === 'number',
  );

  if (numericKeys.length === 0) return null;

  const categories = arr.map((item) => String(item[catKey] ?? ''));

  if (numericKeys.length === 1) {
    // Single series: simple values array
    return {
      categories,
      values: arr.map((item) => Number(item[numericKeys[0]] ?? 0)),
    };
  }

  // Multi-series
  return {
    categories,
    values: numericKeys.map((k) => ({
      label: k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase()),
      data: arr.map((item) => Number(item[k] ?? 0)),
    })),
  };
}

/**
 * Auto-detect BarChartData from a flat object like { "Mid Cap": 43467, "Large Cap": 43170 }.
 */
function flatObjectToBarData(obj: Record<string, unknown>): BarChartData | null {
  const categories: string[] = [];
  const values: number[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'number') {
      categories.push(key);
      values.push(val);
    }
  }
  return categories.length > 0 ? { categories, values } : null;
}

/** Normalize any incoming data shape to BarChartData */
function normalizeData(data: NonNullable<Props['data']>): BarChartData | null {
  // Already in expected shape
  if (
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'categories' in data &&
    Array.isArray((data as BarChartData).categories)
  ) {
    return data as BarChartData;
  }

  // Raw array of objects
  if (Array.isArray(data)) {
    return autoDetectFromArray(data as Record<string, unknown>[]);
  }

  // Flat object with numeric values
  if (typeof data === 'object') {
    return flatObjectToBarData(data as Record<string, unknown>);
  }

  return null;
}

export default function BarChart({ data: rawData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'bar'> | null>(null);

  const data = rawData ? normalizeData(rawData) : null;

  useEffect(() => {
    if (!canvasRef.current || !data?.categories?.length) return;

    const themeColors = getChartColors(6);
    const isMultiSeries = data.values.length > 0 && typeof data.values[0] === 'object';

    const datasets = isMultiSeries
      ? (data.values as { label: string; data: number[]; color?: string }[]).map((s, i) => ({
          label: s.label,
          data: s.data,
          backgroundColor: s.color || themeColors[i % themeColors.length],
        }))
      : [{
          label: 'Value',
          data: data.values as number[],
          backgroundColor: themeColors[0],
        }];

    if (chartRef.current) {
      chartRef.current.data.labels = data.categories;
      chartRef.current.data.datasets = datasets;
      chartRef.current.update();
      return;
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: { labels: data.categories, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        indexAxis: data.horizontal ? 'y' : 'x',
        plugins: { legend: { display: isMultiSeries, position: 'bottom', labels: { usePointStyle: true } } },
        scales: {
          y: { grid: { color: 'var(--color-border)' } },
          x: { grid: { display: false } },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [data]);

  if (!data?.categories?.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 flex items-center justify-center h-48">
        <span className="text-muted text-sm">No chart data</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <canvas ref={canvasRef} />
    </div>
  );
}
