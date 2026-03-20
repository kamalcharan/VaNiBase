'use client';

interface BadgeData {
  text: string;
  variant: 'status' | 'tier' | 'risk' | 'category';
  color?: string;
}

interface Props {
  data: BadgeData | null | undefined;
  variant?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  status: 'bg-primary/15 text-primary',
  tier: 'bg-secondary/15 text-secondary',
  risk: 'bg-danger/15 text-danger',
  category: 'bg-accent/15 text-accent',
};

export default function Badge({ data }: Props) {
  if (!data) return null;

  const cls = VARIANT_CLASSES[data.variant] || VARIANT_CLASSES.status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
      style={data.color ? { backgroundColor: `${data.color}20`, color: data.color } : undefined}
    >
      {data.text}
    </span>
  );
}
