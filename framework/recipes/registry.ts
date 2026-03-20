/**
 * Recipe Registry — Stores and serves recipe definitions
 * Task: F-15
 *
 * Recipes define how skill results are rendered in the UI shell.
 * Products register recipes at startup; the shell fetches them via API.
 */

import type { Recipe, RecipeRegistry } from '../../shared/types/index.js';

export class RecipeRegistryImpl implements RecipeRegistry {
  recipes: Map<string, Recipe> = new Map();

  register(recipe: Recipe): void {
    this.recipes.set(recipe.name, recipe);
    console.info(`[RecipeRegistry] Registered: ${recipe.name} (${recipe.layout})`);
  }

  get(name: string): Recipe | null {
    return this.recipes.get(name) ?? null;
  }

  /**
   * Return all registered recipe names (useful for the /api/v1/recipes endpoint).
   */
  list(): { name: string; title: string; layout: string }[] {
    return Array.from(this.recipes.values()).map((r) => ({
      name: r.name,
      title: r.title,
      layout: r.layout,
    }));
  }
}
