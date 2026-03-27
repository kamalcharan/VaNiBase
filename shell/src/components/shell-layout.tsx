'use client';

import { useMemo, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useShellConfig } from '../lib/shell-config';
import Sidebar from './sidebar';
import Header from './header';

export function ShellLayout({ children }: { children: ReactNode }) {
  const { product, recipes } = useShellConfig();
  const pathname = usePathname();

  // Build sidebar items from config recipes
  const sidebarRecipes = useMemo(
    () => recipes.map((r) => ({ name: r.route, title: r.label })),
    [recipes],
  );

  // Determine active recipe from current pathname
  const activeRecipe = useMemo(() => {
    const exact = recipes.find((r) => r.route === pathname);
    if (exact) return exact.route;
    const match = recipes.find((r) => pathname.startsWith(r.route + '/'));
    return match?.route;
  }, [recipes, pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        productName={product.name}
        productTagline={product.tagline}
        recipes={sidebarRecipes}
        activeRecipe={activeRecipe}
      />
      <div className="flex-1 ml-64 flex flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
