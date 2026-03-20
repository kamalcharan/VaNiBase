'use client';

import { useTheme, THEMES, type ThemeName } from './theme-provider';

interface SidebarProps {
  recipes: { name: string; title: string }[];
  activeRecipe?: string;
  onSelectRecipe: (name: string) => void;
}

export default function Sidebar({ recipes, activeRecipe, onSelectRecipe }: SidebarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col z-20">
      {/* Brand */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-primary">VaNi</h1>
        <p className="text-xs text-muted">Product Framework</p>
      </div>

      {/* Recipe Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <p className="px-2 py-1 text-xs font-semibold uppercase text-muted tracking-wider">
          Views
        </p>
        {recipes.length === 0 && (
          <p className="px-2 py-2 text-sm text-muted italic">No recipes loaded</p>
        )}
        {recipes.map((r) => (
          <button
            key={r.name}
            onClick={() => onSelectRecipe(r.name)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeRecipe === r.name
                ? 'bg-primary text-primary-fg'
                : 'hover:bg-surface-hover text-foreground'
            }`}
          >
            {r.title}
          </button>
        ))}
      </nav>

      {/* Theme Picker */}
      <div className="p-3 border-t border-border">
        <p className="text-xs font-semibold uppercase text-muted tracking-wider mb-2">Theme</p>
        <div className="grid grid-cols-3 gap-1.5">
          {THEMES.map((t) => (
            <button
              key={t.name}
              onClick={() => setTheme(t.name)}
              title={t.label}
              className={`h-6 rounded-md border-2 transition-all ${
                theme === t.name ? 'border-primary scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: themePreviewColor(t.name) }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function themePreviewColor(name: ThemeName): string {
  const map: Record<ThemeName, string> = {
    'ocean-blue': '#0ea5e9',
    'emerald-green': '#10b981',
    'sunset-amber': '#f59e0b',
    'royal-purple': '#8b5cf6',
    'coral-reef': '#f43f5e',
    'slate-gray': '#64748b',
  };
  return map[name];
}
