/**
 * Demo Skill — get_stats function
 * Returns framework runtime stats: skill count, uptime.
 */

import type { SkillContext, SkillResult } from '../../../shared/types/index.js';

export async function getStats(
  _params: Record<string, unknown>,
  ctx: SkillContext
): Promise<SkillResult> {
  // Query tenant name
  let tenantName = 'Unknown Tenant';
  try {
    const tenant = await ctx.db.queryOne<{ name: string }>(
      'SELECT name FROM vn_tenants WHERE id = :tenantId',
      { tenantId: ctx.tenantId }
    );
    if (tenant) tenantName = tenant.name;
  } catch {
    tenantName = `Tenant ${ctx.tenantId.slice(0, 8)}`;
  }

  const uptimeSeconds = Math.floor(process.uptime());

  return {
    success: true,
    recipe: 'demo-dashboard',
    data: {
      tenant_name: tenantName,
      uptime_seconds: uptimeSeconds,
      uptime_display: formatUptime(uptimeSeconds),
      node_version: process.version,
      memory_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    summary: `${tenantName} — uptime ${formatUptime(uptimeSeconds)}`,
  };
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
