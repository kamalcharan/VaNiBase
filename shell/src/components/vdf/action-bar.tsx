'use client';

interface ActionBarData {
  actions: {
    label: string;
    skill: string;
    params: Record<string, unknown>;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: string;
  }[];
}

interface Props {
  data: ActionBarData | null | undefined;
  variant?: string;
}

const BTN_CLASSES: Record<string, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'bg-surface border border-border text-foreground hover:bg-surface-hover',
  danger: 'bg-danger text-white hover:opacity-90',
};

export default function ActionBar({ data }: Props) {
  if (!data?.actions?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-3 flex flex-wrap gap-2">
      {data.actions.map((a, i) => (
        <button
          key={i}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            BTN_CLASSES[a.variant || 'secondary']
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
