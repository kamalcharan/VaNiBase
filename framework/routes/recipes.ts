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

  return router;
}
