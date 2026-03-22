'use client';

interface BadgeData {
  text: string;
  variant: 'status' | 'tier' | 'risk' | 'category';
  color?: string;
}

interface Props {
  data: BadgeData | string | null | undefined;
  variant?: 'status' | 'tier' | 'risk' | 'category';
}

const VARIANT_CLASSES: Record<string, string> = {
  status: 'bg-primary/15 text-primary',
  tier: 'bg-secondary/15 text-secondary',
  risk: 'bg-danger/15 text-danger',
  category: 'bg-accent/15 text-accent',
};

export default function Badge({ data, variant: propVariant }: Props) {
  if (data == null) return null;

  // Normalize: accept raw string or BadgeData object
  const badge: BadgeData =
    typeof data === 'string'
      ? { text: data, variant: propVariant || 'status' }
      : { ...data, variant: data.variant || propVariant || 'status' };

  const cls = VARIANT_CLASSES[badge.variant] || VARIANT_CLASSES.status;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
      style={badge.color ? { backgroundColor: `${badge.color}20`, color: badge.color } : undefined}
    >
      {badge.text}
    </span>
  );
}
