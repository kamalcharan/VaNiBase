'use client';

interface TimelineEvent {
  date: string;
  text: string;
  type: 'activity' | 'milestone' | 'alert' | 'info';
  icon?: string;
}

interface TimelineData {
  events: TimelineEvent[];
}

interface Props {
  data: TimelineData | null | undefined;
  variant?: string;
}

const TYPE_COLORS: Record<string, string> = {
  activity: 'bg-primary',
  milestone: 'bg-success',
  alert: 'bg-danger',
  info: 'bg-info',
};

export default function Timeline({ data }: Props) {
  if (!data?.events?.length) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <span className="text-muted text-sm">No events</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="space-y-4">
        {data.events.map((evt, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${TYPE_COLORS[evt.type] || TYPE_COLORS.info}`} />
              {i < data.events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-4">
              <p className="text-sm text-foreground">{evt.text}</p>
              <p className="text-xs text-muted mt-0.5">{new Date(evt.date).toLocaleDateString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
