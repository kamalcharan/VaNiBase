'use client';

interface InsightCardData {
  title: string;
  body: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  action?: { label: string; skill: string; params: Record<string, unknown> };
  timestamp?: string;
}

interface Props {
  data: InsightCardData | null | undefined;
  variant?: string;
}

const SEVERITY_STYLES: Record<string, { border: string; bg: string; dot: string }> = {
  high: { border: 'border-danger/40', bg: 'bg-danger/5', dot: 'bg-danger' },
  medium: { border: 'border-warning/40', bg: 'bg-warning/5', dot: 'bg-warning' },
  low: { border: 'border-info/40', bg: 'bg-info/5', dot: 'bg-info' },
  info: { border: 'border-muted/40', bg: 'bg-surface', dot: 'bg-muted' },
};

export default function InsightCard({ data }: Props) {
  if (!data) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 animate-pulse">
        <div className="h-4 w-32 bg-surface-hover rounded mb-2" />
        <div className="h-3 w-full bg-surface-hover rounded" />
      </div>
    );
  }

  const style = SEVERITY_STYLES[data.severity] || SEVERITY_STYLES.info;

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground truncate">{data.title}</h4>
            {data.timestamp && (
              <span className="text-xs text-muted shrink-0">
                {new Date(data.timestamp).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-1">{data.body}</p>
          {data.action && (
            <button className="mt-2 text-xs font-medium text-primary hover:text-primary-hover transition-colors">
              {data.action.label} &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
