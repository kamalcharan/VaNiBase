'use client';

import Link from 'next/link';
import { useTheme } from './theme-provider';
import { getTheme } from '../themes';
import { useAuth } from '../context/auth-provider';

interface SidebarProps {
  productName?: string;
  productTagline?: string;
  recipes: { name: string; title: string }[];
  activeRecipe?: string;
}

export default function Sidebar({
  productName = 'VaNi',
  productTagline = 'Product Framework',
  recipes,
  activeRecipe,
}: SidebarProps) {
  const { themeId, setTheme, themes } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col z-20">
      {/* Brand */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-primary">{productName}</h1>
        <p className="text-xs text-muted">{productTagline}</p>
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
          <Link
            key={r.name}
            href={r.name}
            className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
              activeRecipe === r.name
                ? 'bg-primary text-primary-fg'
                : 'hover:bg-surface-hover text-foreground'
            }`}
          >
            {r.title}
          </Link>
        ))}
      </nav>

      {/* User info + Logout */}
      {user && (
        <div className="p-3 border-t border-border">
          <div className="mb-2">
            <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-md text-sm text-danger hover:bg-surface-hover transition-colors"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Theme Picker */}
      <div className="p-3 border-t border-border">
        <p className="text-xs font-semibold uppercase text-muted tracking-wider mb-2">Theme</p>
        <div className="grid grid-cols-4 gap-1.5">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              title={t.name}
              className={`h-6 rounded-md border-2 transition-all ${
                themeId === t.id ? 'border-primary scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: getThemePreviewColor(t.id) }}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function getThemePreviewColor(id: string): string {
  const theme = getTheme(id);
  return theme.colors.brand.primary;
}
