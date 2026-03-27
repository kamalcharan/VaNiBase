'use client';

import { useParams } from 'next/navigation';
import RecipePage from '../../../../components/recipe-page';

/**
 * Entity detail page — renders a recipe with an entity ID from the URL.
 *
 * Route: /(dashboard)/[recipe]/[id]
 * Example: /client-360/CLT001 → renders client-360 recipe with entityId="CLT001"
 */
export default function EntityDetailPage() {
  const params = useParams<{ recipe: string; id: string }>();
  const route = `/${params.recipe}`;
  return <RecipePage route={route} entityId={params.id} />;
}
