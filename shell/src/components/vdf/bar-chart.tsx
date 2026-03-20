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
  data: BarChartData | null | undefined;
  variant?: string;
}

export default function BarChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'bar'> | null>(null);

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
