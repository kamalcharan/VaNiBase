'use client';

import { useEffect, useRef } from 'react';
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler } from 'chart.js';
import { getChartColors } from '../../lib/chart-colors';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

interface LineChartData {
  series: { label: string; data: number[]; color?: string }[];
  xLabels: string[];
  yLabel?: string;
}

interface Props {
  data: LineChartData | Record<string, unknown>[] | Record<string, unknown> | null | undefined;
  variant?: string;
}

/**
 * Auto-detect LineChartData from a raw array of objects.
 * Supports shapes like:
 *   [{ date: "2024-01", value: 100 }]
 *   [{ month: "Jan", revenue: 5000, expenses: 3000 }]
 */
function autoDetectFromArray(arr: Record<string, unknown>[]): LineChartData | null {
  if (arr.length === 0) return null;

  const sample = arr[0];
  const keys = Object.keys(sample);

  // Find the x-axis label key: prefer date > month > year > period > first string key
  const xKey =
    keys.find((k) => k === 'date') ??
    keys.find((k) => k === 'month') ??
    keys.find((k) => k === 'year') ??
    keys.find((k) => k === 'period') ??
    keys.find((k) => k === 'x') ??
    keys.find((k) => k === 'label') ??
    keys.find((k) => typeof sample[k] === 'string');

  if (!xKey) return null;

  // All numeric keys become series
  const numericKeys = keys.filter(
    (k) => k !== xKey && typeof sample[k] === 'number',
  );

  if (numericKeys.length === 0) return null;

  const xLabels = arr.map((item) => String(item[xKey] ?? ''));
  const series = numericKeys.map((k) => ({
    label: k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase()),
    data: arr.map((item) => Number(item[k] ?? 0)),
  }));

  return { series, xLabels };
}

/** Normalize any incoming data shape to LineChartData */
function normalizeData(data: NonNullable<Props['data']>): LineChartData | null {
  // Already in expected shape
  if (
    typeof data === 'object' &&
    !Array.isArray(data) &&
    'series' in data &&
    Array.isArray((data as LineChartData).series)
  ) {
    return data as LineChartData;
  }

  // Raw array of objects
  if (Array.isArray(data)) {
    return autoDetectFromArray(data as Record<string, unknown>[]);
  }

  return null;
}

export default function LineChart({ data: rawData }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'line'> | null>(null);

  const data = rawData ? normalizeData(rawData) : null;

  useEffect(() => {
    if (!canvasRef.current || !data?.series?.length) return;

    const themeColors = getChartColors(data.series.length);

    const datasets = data.series.map((s, i) => ({
      label: s.label,
      data: s.data,
      borderColor: s.color || themeColors[i % themeColors.length],
      backgroundColor: (s.color || themeColors[i % themeColors.length]) + '20',
      tension: 0.3,
      fill: data.series.length === 1,
      pointRadius: 3,
      pointHoverRadius: 5,
    }));

    if (chartRef.current) {
      chartRef.current.data.labels = data.xLabels;
      chartRef.current.data.datasets = datasets;
      chartRef.current.update();
      return;
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels: data.xLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } },
        scales: {
          y: {
            title: data.yLabel ? { display: true, text: data.yLabel } : undefined,
            grid: { color: 'var(--color-border)' },
          },
          x: { grid: { display: false } },
        },
      },
    });

    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [data]);

  if (!data?.series?.length) {
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
