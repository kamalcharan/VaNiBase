'use client';

import { useEffect, useRef } from 'react';
import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js';
import { getChartColors } from '../../lib/chart-colors';

Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

interface DoughnutData {
  segments: { label: string; value: number; color?: string }[];
  centerLabel?: string;
  centerValue?: string;
}

interface Props {
  data: DoughnutData | null | undefined;
  variant?: string;
}

export default function Doughnut({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart<'doughnut'> | null>(null);

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
