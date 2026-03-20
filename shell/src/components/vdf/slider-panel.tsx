'use client';

import { useState } from 'react';

interface SliderPanelData {
  label: string;
  min: number;
  max: number;
  current: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: string;
}

interface Props {
  data: SliderPanelData | null | undefined;
  variant?: string;
}

export default function SliderPanel({ data }: Props) {
  const [value, setValue] = useState(data?.current ?? 0);

  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-24 bg-surface-hover rounded mb-2" />
        <div className="h-2 w-full bg-surface-hover rounded" />
      </div>
    );
  }

  const pct = ((value - data.min) / (data.max - data.min)) * 100;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{data.label}</span>
        <span className="text-sm font-bold text-primary">
          {data.prefix || ''}{value.toLocaleString()}{data.suffix || ''}
        </span>
      </div>
      <input
        type="range"
        min={data.min}
        max={data.max}
        step={data.step || 1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${pct}%, var(--color-border) ${pct}%, var(--color-border) 100%)`,
        }}
      />
      <div className="flex justify-between mt-1 text-xs text-muted">
        <span>{data.prefix || ''}{data.min.toLocaleString()}{data.suffix || ''}</span>
        <span>{data.prefix || ''}{data.max.toLocaleString()}{data.suffix || ''}</span>
      </div>
    </div>
  );
}
