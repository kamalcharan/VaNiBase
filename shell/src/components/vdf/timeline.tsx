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
  data: TimelineData | TimelineEvent[] | Record<string, unknown>[] | null | undefined;
  variant?: string;
}

const TYPE_COLORS: Record<string, string> = {
  activity: 'bg-primary',
  milestone: 'bg-success',
  alert: 'bg-danger',
  info: 'bg-info',
};

/**
 * Auto-detect timeline events from a raw array of objects.
 * Supports shapes like:
 *   [{ date: "2024-01-15", text: "Meeting", type: "activity" }]
 *   [{ timestamp: "2024-01-15", description: "Called client", category: "activity" }]
 *   [{ date: "2024-01-15", name: "SIP Started" }]
 */
function autoDetectEvents(arr: Record<string, unknown>[]): TimelineEvent[] {
  if (arr.length === 0) return [];

  const sample = arr[0];
  const keys = Object.keys(sample);

  // If already has date + text, it's a TimelineEvent
  if ('date' in sample && 'text' in sample) {
    return arr as unknown as TimelineEvent[];
  }

  // Find date key
  const dateKey =
    keys.find((k) => k === 'date') ??
    keys.find((k) => k === 'timestamp') ??
    keys.find((k) => k === 'created_at') ??
    keys.find((k) => k === 'time');

  // Find text key
  const textKey =
    keys.find((k) => k === 'text') ??
    keys.find((k) => k === 'description') ??
    keys.find((k) => k === 'message') ??
    keys.find((k) => k === 'name') ??
    keys.find((k) => k === 'title');

  // Find type key
  const typeKey =
    keys.find((k) => k === 'type') ??
    keys.find((k) => k === 'category') ??
    keys.find((k) => k === 'kind');

  if (!dateKey || !textKey) return [];

  return arr.map((item) => ({
    date: String(item[dateKey] ?? ''),
    text: String(item[textKey] ?? ''),
    type: (typeKey && typeof item[typeKey] === 'string'
      ? item[typeKey]
      : 'info') as TimelineEvent['type'],
  }));
}

/** Normalize any incoming data shape to TimelineEvent[] */
function normalizeEvents(data: NonNullable<Props['data']>): TimelineEvent[] {
  // Standard shape: { events: [...] }
  if (!Array.isArray(data) && typeof data === 'object' && 'events' in data) {
    return Array.isArray((data as TimelineData).events) ? (data as TimelineData).events : [];
  }

  // Raw array
  if (Array.isArray(data)) {
    return autoDetectEvents(data as Record<string, unknown>[]);
  }

  return [];
}

export default function Timeline({ data: rawData }: Props) {
  const events = rawData ? normalizeEvents(rawData) : [];

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <span className="text-muted text-sm">No events</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="space-y-4">
        {events.map((evt, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${TYPE_COLORS[evt.type] || TYPE_COLORS.info}`} />
              {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
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
