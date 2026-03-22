'use client';

import InsightCard from './insight-card';

interface InsightCardData {
  title: string;
  body: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  action?: { label: string; skill: string; params: Record<string, unknown> };
  timestamp?: string;
}

interface BriefingPanelData {
  insights: InsightCardData[];
  date: string;
  greeting?: string;
}

interface Props {
  data: BriefingPanelData | InsightCardData[] | null | undefined;
  variant?: string;
}

export default function BriefingPanel({ data: rawData }: Props) {
  if (!rawData) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-6 w-40 bg-surface-hover rounded mb-4" />
        <div className="space-y-3">
          <div className="h-16 bg-surface-hover rounded" />
          <div className="h-16 bg-surface-hover rounded" />
        </div>
      </div>
    );
  }

  // Normalize: accept raw array of insights or full BriefingPanelData
  const data: BriefingPanelData = Array.isArray(rawData)
    ? { insights: rawData, date: new Date().toISOString() }
    : rawData;

  const insights = data.insights ?? [];

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      {data.greeting && (
        <p className="text-lg font-semibold text-foreground mb-1">{data.greeting}</p>
      )}
      <p className="text-xs text-muted mb-4">
        {new Date(data.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
      {insights.length === 0 ? (
        <p className="text-sm text-muted">No insights for today.</p>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <InsightCard key={i} data={insight} />
          ))}
        </div>
      )}
    </div>
  );
}
