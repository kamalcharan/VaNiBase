/**
 * Onboarding Service — Status, step updates, seeding, completion check.
 *
 * Only mandatory steps are tracked in VN_tenant_onboarding.
 * Non-mandatory steps exist only in the ShellConfig UI layer.
 *
 * Tables: VN_tenant_onboarding
 */

import { getPool } from '../db/index.js';
import { ValidationError, NotFoundError } from '../errors/index.js';
import type { OnboardingStepDef } from '../../shared/onboarding-steps.js';

// ── Types ──

export interface OnboardingStep {
  step_id: string;
  status: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface OnboardingStatus {
  complete: boolean;
  steps: OnboardingStep[];
  next_incomplete_step: string | null;
}

// ── Known step ordering (mandatory steps in intended order) ──

const STEP_ORDER = ['user_profile', 'business_profile'];

function stepSortKey(stepId: string): number {
  const idx = STEP_ORDER.indexOf(stepId);
  return idx >= 0 ? idx : STEP_ORDER.length;
}

// ── Public API ──

/**
 * Get onboarding status for a tenant.
 */
export async function getOnboardingStatus(tenantId: string): Promise<OnboardingStatus> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT step_id, status, completed_at, metadata
     FROM VN_tenant_onboarding WHERE tenant_id = $1
     ORDER BY created_at ASC`,
    [tenantId],
  );

  const steps = rows as OnboardingStep[];
  const complete = steps.length > 0 && steps.every((s) => s.status === 'completed');

  // Find next incomplete step in defined order
  const pendingSteps = steps.filter((s) => s.status !== 'completed');
  pendingSteps.sort((a, b) => stepSortKey(a.step_id) - stepSortKey(b.step_id));
  const nextIncomplete = pendingSteps.length > 0 ? pendingSteps[0].step_id : null;

  return { complete, steps, next_incomplete_step: nextIncomplete };
}

/**
 * Mark an onboarding step as completed.
 */
export async function updateOnboardingStep(
  tenantId: string,
  stepId: string,
  metadata?: Record<string, unknown>,
): Promise<OnboardingStep> {
  const pool = getPool();

  // Verify step exists for this tenant
  const { rows: existing } = await pool.query(
    'SELECT step_id, metadata FROM VN_tenant_onboarding WHERE tenant_id = $1 AND step_id = $2',
    [tenantId, stepId],
  );

  if (existing.length === 0) {
    throw new ValidationError('Not a tracked onboarding step');
  }

  // Merge metadata if provided
  const existingMeta = (existing[0] as { metadata: Record<string, unknown> }).metadata || {};
  const mergedMeta = metadata ? { ...existingMeta, ...metadata } : existingMeta;

  const { rows } = await pool.query(
    `UPDATE VN_tenant_onboarding
     SET status = 'completed', completed_at = now(), metadata = $1
     WHERE tenant_id = $2 AND step_id = $3
     RETURNING step_id, status, completed_at, metadata`,
    [JSON.stringify(mergedMeta), tenantId, stepId],
  );

  return rows[0] as OnboardingStep;
}

/**
 * Seed mandatory onboarding steps for a new tenant.
 * Called inside the registration transaction.
 * `client` is a pg.PoolClient from pool.transaction().
 */
export async function seedOnboardingSteps(
  client: { query: (sql: string, params: unknown[]) => Promise<{ rows: unknown[] }> },
  tenantId: string,
  steps: OnboardingStepDef[],
): Promise<void> {
  const mandatory = steps.filter((s) => s.mandatory);
  if (mandatory.length === 0) return;

  for (const step of mandatory) {
    await client.query(
      `INSERT INTO VN_tenant_onboarding (tenant_id, step_id, status, metadata)
       VALUES ($1, $2, 'pending', '{}')
       ON CONFLICT (tenant_id, step_id) DO NOTHING`,
      [tenantId, step.id],
    );
  }
}

/**
 * Check if onboarding is complete for a tenant.
 * Returns true if no pending mandatory steps (or no rows at all).
 */
export async function isOnboardingComplete(tenantId: string): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT count(*) AS pending FROM VN_tenant_onboarding
     WHERE tenant_id = $1 AND status != 'completed'`,
    [tenantId],
  );
  const pending = parseInt((rows[0] as { pending: string }).pending, 10);
  return pending === 0;
}
