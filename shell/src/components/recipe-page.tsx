'use client';

import { useState, useEffect } from 'react';
import { useShellConfig, type RecipeConfig } from '../lib/shell-config';
import { fetchRecipeData, buildAuthHeaders } from '../lib/skill-fetcher';
import { useAuth } from '../context/auth-provider';
import RecipeRenderer from './recipe-renderer';

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

interface RecipePageProps {
  route: string;
  entityId?: string;
}

export default function RecipePage({ route, entityId }: RecipePageProps) {
  const config = useShellConfig();
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const rc = config.recipes.find((r) => r.route === route);

    if (!rc) {
      setError(`No recipe config found for route: ${route}`);
      setLoading(false);
      return;
    }

    const recipeConfig = rc;
    let cancelled = false;
    // Prefer auth context headers; fall back to dev headers from config
    const headers = isAuthenticated ? getAuthHeaders() : buildAuthHeaders(config);
    const apiUrl = config.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    async function load() {
      try {
        setLoading(true);
        setError(undefined);

        const recipeRes = await fetch(`${apiUrl}/api/v1/recipes/${recipeConfig.recipe}`, {
          headers,
        });
        if (!recipeRes.ok) {
          throw new Error(`Failed to fetch recipe definition: ${recipeConfig.recipe}`);
        }
        const recipeDef: Recipe = await recipeRes.json();

        // Build skill endpoints with entity ID injected if applicable
        let skillEndpoints = recipeConfig.skills;
        if (entityId && recipeConfig.entityParam) {
          skillEndpoints = recipeConfig.skills.map((skill) => ({
            ...skill,
            params: {
              ...skill.params,
              [recipeConfig.entityParam!]: entityId,
            },
          }));
        }

        let skillData: Record<string, unknown> = {};
        if (skillEndpoints.length > 0) {
          skillData = await fetchRecipeData(skillEndpoints, apiUrl, headers);
        }

        if (!cancelled) {
          setRecipe(recipeDef);
          setData({
            ...skillData,
            _entityId: entityId,
            _entityType: recipeConfig.entityType,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [route, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  return <RecipeRenderer recipe={recipe} data={data} loading={loading} error={error} />;
}