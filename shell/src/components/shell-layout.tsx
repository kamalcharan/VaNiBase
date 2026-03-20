'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import Sidebar from './sidebar';
import Header from './header';

export function ShellLayout({ children }: { children: ReactNode }) {
  const [recipes, setRecipes] = useState<{ name: string; title: string }[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<string>();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${apiUrl}/api/v1/recipes`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setRecipes(data);
          if (data.length > 0 && !activeRecipe) {
            setActiveRecipe(data[0].name);
          }
        }
      })
      .catch(() => {
        /* API not available — sidebar shows empty state */
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ThemeProvider>
      <div className="flex min-h-screen">
        <Sidebar
          recipes={recipes}
          activeRecipe={activeRecipe}
          onSelectRecipe={setActiveRecipe}
        />
        <div className="flex-1 ml-64 flex flex-col">
          <Header />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
