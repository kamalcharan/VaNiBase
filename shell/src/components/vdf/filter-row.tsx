'use client';

interface FilterRowData {
  filters: {
    key: string;
    type: 'dropdown' | 'search' | 'toggle' | 'date-range';
    label: string;
    options?: { value: string; label: string }[];
    defaultValue?: unknown;
  }[];
  onFilter: string;
}

interface Props {
  data: FilterRowData | null | undefined;
  variant?: string;
}

export default function FilterRow({ data }: Props) {
  if (!data?.filters?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex flex-wrap items-center gap-3">
      {data.filters.map((f) => {
        if (f.type === 'dropdown') {
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-muted">{f.label}</label>
              <select
                defaultValue={f.defaultValue as string}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          );
        }

        if (f.type === 'search') {
          return (
            <div key={f.key} className="flex flex-col gap-1">
              <label className="text-xs text-muted">{f.label}</label>
              <input
                type="text"
                placeholder={`Search ${f.label.toLowerCase()}...`}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          );
        }

        if (f.type === 'toggle') {
          return (
            <div key={f.key} className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id={f.key}
                defaultChecked={!!f.defaultValue}
                className="rounded border-border"
              />
              <label htmlFor={f.key} className="text-sm text-foreground">{f.label}</label>
            </div>
          );
        }

        return (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-xs text-muted">{f.label}</label>
            <input
              type="date"
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        );
      })}
    </div>
  );
}
