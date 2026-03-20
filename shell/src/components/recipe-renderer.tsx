'use client';

import VDF_COMPONENTS from './vdf';
import { resolvePath } from '../lib/json-path';

/**
 * Mirrors the Recipe shape from shared/types — kept locally to avoid
 * a cross-package import (shell is a separate Next.js app).
 */
interface RecipeSlot {
  row: number;
  components: {
    type: string;
    data: string;
    variant?: string;
    span?: number;
    props?: Record<string, unknown>;
  }[];
}

interface Recipe {
  name: string;
  title: string;
  layout: string;
  slots: RecipeSlot[];
}

interface RecipeRendererProps {
  recipe: Recipe | null;
  data: Record<string, unknown>;
  loading?: boolean;
  error?: string;
}

export default function RecipeRenderer({ recipe, data, loading, error }: RecipeRendererProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-muted">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger text-sm">
        {error}
      </div>
    );
  }

  if (!recipe) {
    // Fallback: raw JSON display
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="text-xs text-muted mb-2">No recipe found — raw data:</p>
        <pre className="text-xs overflow-auto max-h-96 text-foreground">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  }

  // Sort slots by row number
  const sortedSlots = [...recipe.slots].sort((a, b) => a.row - b.row);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{recipe.title}</h2>
      {sortedSlots.map((slot, slotIdx) => {
        const totalSpan = slot.components.reduce((s, c) => s + (c.span || 1), 0);
        return (
          <div
            key={slotIdx}
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${Math.min(totalSpan, 12)}, minmax(0, 1fr))`,
            }}
          >
            {slot.components.map((comp, compIdx) => {
              const Component = VDF_COMPONENTS[comp.type];
              const resolvedData = resolvePath(data, comp.data);

              if (!Component) {
                return (
                  <div
                    key={compIdx}
                    className="rounded border border-warning/30 bg-warning/5 p-3 text-xs text-warning"
                    style={{ gridColumn: `span ${comp.span || 1}` }}
                  >
                    Unknown component: {comp.type}
                  </div>
                );
              }

              return (
                <div key={compIdx} style={{ gridColumn: `span ${comp.span || 1}` }}>
                  <Component data={resolvedData} variant={comp.variant} {...(comp.props || {})} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
