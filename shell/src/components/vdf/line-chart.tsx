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
  data: LineChartData | null | undefined;
  variant?: string;
}

export default function LineChart({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'line'> | null>(null);

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
