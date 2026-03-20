/**
 * Recipes Route — /api/v1/recipes
 * Returns list of registered recipes for sidebar navigation.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { RecipeRegistryImpl } from '../recipes/registry.js';

export function createRecipesRouter(registry: RecipeRegistryImpl): Router {
  const router = Router();

  router.get('/recipes', (_req: Request, res: Response) => {
    res.json(registry.list());
  });

  router.get('/recipes/:name', (req: Request, res: Response) => {
    const recipe = registry.get(req.params.name as string);
    if (!recipe) {
      res.status(404).json({ error: `Recipe "${req.params.name}" not found` });
      return;
    }
    res.json(recipe);
  });

  return router;
}
