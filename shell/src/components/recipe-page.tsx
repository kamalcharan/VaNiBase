'use client';

import { useState, useEffect, useCallback } from 'react';
import { useShellConfig, type RecipeConfig } from '../lib/shell-config';
import { fetchRecipeData, buildAuthHeaders } from '../lib/skill-fetcher';
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
  /** The route path used to look up the matching RecipeConfig */
  route: string;
}

export default function RecipePage({ route }: RecipePageProps) {
  const config = useShellConfig();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  // Find the recipe config for this route
  const recipeConfig: RecipeConfig | undefined = config.recipes.find(
    (r) => r.route === route,
  );

  const apiUrl = config.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const authHeaders = buildAuthHeaders(config);

  const loadData = useCallback(async () => {
    if (!recipeConfig) {
      setError(`No recipe config found for route: ${route}`);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);

      // 1. Fetch recipe definition from framework API
      const recipeRes = await fetch(`${apiUrl}/api/v1/recipes/${recipeConfig.recipe}`, {
        headers: authHeaders,
      });
      if (!recipeRes.ok) {
        throw new Error(`Failed to fetch recipe definition: ${recipeConfig.recipe}`);
      }
      const recipeDef: Recipe = await recipeRes.json();
      setRecipe(recipeDef);

      // 2. Fetch data from skill endpoints
      if (recipeConfig.skills.length > 0) {
        const skillData = await fetchRecipeData(recipeConfig.skills, apiUrl, authHeaders);
        setData(skillData);
      } else {
        setData({});
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [recipeConfig, apiUrl, authHeaders, route]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    loadData();
  }, [route]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    if (!recipeConfig?.refreshInterval) return;
    const interval = setInterval(loadData, recipeConfig.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [recipeConfig?.refreshInterval, loadData]);

  return <RecipeRenderer recipe={recipe} data={data} loading={loading} error={error} />;
}
