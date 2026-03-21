'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useShellConfig } from '../lib/shell-config';

export default function Home() {
  const { recipes, product } = useShellConfig();
  const router = useRouter();

  useEffect(() => {
    if (recipes.length > 0) {
      router.replace(recipes[0].route);
    }
  }, [recipes, router]);

  // Show while redirecting, or when no recipes are configured
  if (recipes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">{product.name}</h2>
          <p className="text-sm text-muted">
            No recipes configured. Provide a shell config with recipe definitions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-pulse text-muted">Loading...</div>
    </div>
  );
}
