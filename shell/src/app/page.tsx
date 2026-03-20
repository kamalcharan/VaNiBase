'use client';

import { useState, useEffect } from 'react';
import RecipeRenderer from '../components/recipe-renderer';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function loadDashboard() {
      try {
        // 1. Fetch recipe list
        const listRes = await fetch(`${API_URL}/api/v1/recipes`);
        if (!listRes.ok) throw new Error('Failed to fetch recipes');
        const recipes = await listRes.json();
        if (!Array.isArray(recipes) || recipes.length === 0) {
          throw new Error('No recipes available');
        }

        // 2. Load the first recipe (demo-dashboard)
        const firstName = recipes[0].name;
        const recipeRes = await fetch(`${API_URL}/api/v1/recipes/${firstName}`);
        if (!recipeRes.ok) throw new Error(`Failed to fetch recipe: ${firstName}`);
        const recipeDef: Recipe = await recipeRes.json();
        setRecipe(recipeDef);

        // 3. Fetch dashboard data from health endpoint as seed data
        try {
          const healthRes = await fetch(`${API_URL}/health`);
          if (healthRes.ok) {
            const health = await healthRes.json();
            const uptimeSec = Math.floor(health.uptime || 0);
            const mins = Math.floor(uptimeSec / 60);
            const secs = uptimeSec % 60;
            setData({
              message: 'Welcome to VaNi',
              tenant_name: 'Demo Distributor',
              uptime_display: `${mins}m ${secs}s`,
              node_version: typeof process !== 'undefined' ? process.version : 'N/A',
              memory_mb: 'N/A',
              messages: [],
            });
          } else {
            setData({ message: 'Welcome to VaNi', tenant_name: 'Demo Distributor', messages: [] });
          }
        } catch {
          setData({ message: 'Welcome to VaNi', tenant_name: 'Demo Distributor', messages: [] });
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <RecipeRenderer recipe={recipe} data={data} loading={loading} error={error} />
  );
}
