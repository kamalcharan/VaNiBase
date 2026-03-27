/**
 * Demo Skill — get_greeting function
 * Queries vn_tenants for the tenant name and returns a greeting.
 */

import type { SkillContext, SkillResult } from '../../../shared/types/index.js';

export async function getGreeting(
  ctx: SkillContext,
  params: Record<string, unknown>
): Promise<SkillResult> {
  const name = (params.name as string) || 'there';

  // Query tenant name from the database
  let tenantName = 'Unknown Tenant';
  try {
    const tenant = await ctx.db.queryOne<{ name: string }>(
      'SELECT name FROM vn_tenants WHERE id = :tenantId',
      { tenantId: ctx.tenantId }
    );
    if (tenant) tenantName = tenant.name;
  } catch {
    // DB may not be available in dev — use fallback
    tenantName = `Tenant ${ctx.tenantId.slice(0, 8)}`;
  }

  return {
    success: true,
    recipe: 'demo-dashboard',
    data: {
      message: `Hello ${name}! Welcome to VaNi.`,
      tenant_name: tenantName,
      timestamp: new Date().toISOString(),
      greeting_for: name,
    },
    summary: `Greeted ${name} on behalf of ${tenantName}`,
  };
}
