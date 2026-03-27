'use client';

import { useParams } from 'next/navigation';
import RecipePage from '../../../components/recipe-page';

export default function DynamicRecipePage() {
  const params = useParams<{ recipe: string }>();
  const route = `/${params.recipe}`;
  return <RecipePage route={route} />;
}
