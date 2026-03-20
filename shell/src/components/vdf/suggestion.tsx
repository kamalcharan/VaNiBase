'use client';

interface SuggestionData {
  text: string;
  confidence: number;
  action?: { label: string; skill: string; params: Record<string, unknown> };
}

interface Props {
  data: SuggestionData | null | undefined;
  variant?: string;
}

export default function Suggestion({ data }: Props) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-3 animate-pulse">
        <div className="h-4 w-full bg-surface-hover rounded" />
      </div>
    );
  }

  const pct = Math.round(data.confidence * 100);
  const barColor = pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-danger';

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-foreground mb-2">{data.text}</p>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full bg-surface-hover overflow-hidden">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted w-8 text-right">{pct}%</span>
      </div>
      {data.action && (
        <button className="text-xs font-medium text-primary hover:text-primary-hover transition-colors">
          {data.action.label} &rarr;
        </button>
      )}
    </div>
  );
}
