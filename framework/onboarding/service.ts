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
 * Persists step metadata to the correct DB table before marking complete.
 */
export async function updateOnboardingStep(
  tenantId: string,
  stepId: string,
  metadata?: Record<string, unknown>,
  userId?: string,
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

  // Persist step data to correct table BEFORE marking complete
  if (metadata && Object.keys(metadata).length > 0) {
    console.log(`[ONBOARDING] Step "${stepId}" metadata:`, JSON.stringify(metadata));
    await persistStepData(stepId, tenantId, userId, metadata);
  }

  const { rows } = await pool.query(
    `UPDATE VN_tenant_onboarding
     SET status = 'completed', completed_at = now(), metadata = $1
     WHERE tenant_id = $2 AND step_id = $3
     RETURNING step_id, status, completed_at, metadata`,
    [JSON.stringify(mergedMeta), tenantId, stepId],
  );

  return rows[0] as OnboardingStep;
}

// ── Step data persistence ──

/**
 * Route step data to the correct table based on step_id.
 * Throws on DB error — caller must NOT mark step complete if this fails.
 */
async function persistStepData(
  stepId: string,
  tenantId: string,
  userId: string | undefined,
  metadata: Record<string, unknown>,
): Promise<void> {
  switch (stepId) {
    case 'user_profile':
      if (userId) await persistUserProfile(userId, metadata);
      break;
    case 'business_profile':
      await persistBusinessProfile(tenantId, metadata);
      break;
    case 'theme':
    case 'theme_selection':
      if (userId) await persistThemeSelection(userId, metadata);
      break;
    case 'preferences':
    case 'investment_preferences':
      await persistPreferences(tenantId, metadata);
      break;
    default:
      console.log(`[ONBOARDING] No persistence handler for step "${stepId}", metadata stored only`);
  }
}

/**
 * user_profile step → VN_users
 * Fields: first_name, last_name, name, designation, country_code, mobile, bio
 */
async function persistUserProfile(
  userId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const pool = getPool();

  // Map field name variants from frontend
  let firstName = (metadata.first_name || metadata.firstName) as string | undefined;
  let lastName = (metadata.last_name || metadata.lastName) as string | undefined;
  const designation = (metadata.designation || metadata.role) as string | undefined;
  const countryCode = (metadata.country_code || metadata.countryCode) as string | undefined;
  const mobile = (metadata.mobile || metadata.phone) as string | undefined;
  const bio = metadata.bio as string | undefined;

  // If only "name" provided, split into first + last
  if (!firstName && !lastName && metadata.name && typeof metadata.name === 'string') {
    const parts = metadata.name.trim().split(/\s+/);
    firstName = parts[0];
    lastName = parts.slice(1).join(' ') || undefined;
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (firstName) { setClauses.push(`first_name = $${idx++}`); values.push(firstName); }
  if (lastName) { setClauses.push(`last_name = $${idx++}`); values.push(lastName); }
  if (designation) { setClauses.push(`designation = $${idx++}`); values.push(designation); }
  if (countryCode) { setClauses.push(`country_code = $${idx++}`); values.push(countryCode); }
  if (mobile) { setClauses.push(`mobile = $${idx++}`); values.push(mobile); }
  if (bio) { setClauses.push(`bio = $${idx++}`); values.push(bio); }

  // Sync name column
  if (firstName || lastName) {
    setClauses.push(`name = $${idx++}`);
    values.push([firstName, lastName].filter(Boolean).join(' '));
  }

  if (setClauses.length === 0) {
    console.log('[PERSIST] user_profile: no mappable fields in:', metadata);
    return;
  }

  setClauses.push('updated_at = now()');
  values.push(userId);

  const sql = `UPDATE VN_users SET ${setClauses.join(', ')} WHERE id = $${idx}`;
  console.log('[PERSIST] VN_users:', sql, values);
  await pool.query(sql, values);
}

/**
 * business_profile step → VN_tenant_profiles
 * Fields: firm_name→name, business_type→type, arn, pan, gstin,
 *         address→address_line1, city, state, pin→postal_code, phone
 */
async function persistBusinessProfile(
  tenantId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const pool = getPool();

  // Map field name variants
  const firmName = (metadata.firm_name || metadata.firmName || metadata.business_name) as string | undefined;
  const businessType = (metadata.business_type || metadata.businessType || metadata.type) as string | undefined;
  const arn = metadata.arn as string | undefined;
  const pan = metadata.pan as string | undefined;
  const gstin = metadata.gstin as string | undefined;
  const address = (metadata.address || metadata.address_line1) as string | undefined;
  const city = metadata.city as string | undefined;
  const state = metadata.state as string | undefined;
  const postalCode = (metadata.pin || metadata.postal_code || metadata.pincode || metadata.zip) as string | undefined;
  const phone = (metadata.phone || metadata.mobile) as string | undefined;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (firmName) { setClauses.push(`name = $${idx++}`); values.push(firmName); setClauses.push(`display_name = $${idx++}`); values.push(firmName); }
  if (businessType) { setClauses.push(`type = $${idx++}`); values.push(businessType); }
  if (arn) { setClauses.push(`arn = $${idx++}`); values.push(arn); }
  if (pan) { setClauses.push(`pan = $${idx++}`); values.push(pan); }
  if (gstin) { setClauses.push(`gstin = $${idx++}`); values.push(gstin); }
  if (address) { setClauses.push(`address_line1 = $${idx++}`); values.push(address); }
  if (city) { setClauses.push(`city = $${idx++}`); values.push(city); }
  if (state) { setClauses.push(`state = $${idx++}`); values.push(state); }
  if (postalCode) { setClauses.push(`postal_code = $${idx++}`); values.push(postalCode); }
  if (phone) { setClauses.push(`phone = $${idx++}`); values.push(phone); }

  if (setClauses.length === 0) {
    console.log('[PERSIST] business_profile: no mappable fields in:', metadata);
    return;
  }

  setClauses.push('updated_at = now()');
  values.push(tenantId);

  const sql = `UPDATE VN_tenant_profiles SET ${setClauses.join(', ')} WHERE tenant_id = $${idx}`;
  console.log('[PERSIST] VN_tenant_profiles:', sql, values);
  await pool.query(sql, values);
}

/**
 * theme step → VN_users.preferred_theme
 */
async function persistThemeSelection(
  userId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const pool = getPool();
  const themeId = (metadata.theme_id || metadata.themeId || metadata.theme) as string | undefined;
  if (!themeId) {
    console.log('[PERSIST] theme: no theme_id in:', metadata);
    return;
  }

  const sql = 'UPDATE VN_users SET preferred_theme = $1, updated_at = now() WHERE id = $2';
  console.log('[PERSIST] VN_users.preferred_theme:', sql, [themeId, userId]);
  await pool.query(sql, [themeId, userId]);
}

/**
 * preferences step → VN_tenant_profiles.settings JSONB
 * Fields: default_risk_profile, preferred_investment_horizon,
 *         sip_default_day, default_sip_frequency, etc.
 */
async function persistPreferences(
  tenantId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const pool = getPool();

  // Store all preference fields in the settings JSONB column
  const prefKeys = Object.keys(metadata);
  if (prefKeys.length === 0) {
    console.log('[PERSIST] preferences: empty metadata');
    return;
  }

  const sql = `UPDATE VN_tenant_profiles SET settings = settings || $1::jsonb, updated_at = now() WHERE tenant_id = $2`;
  console.log('[PERSIST] VN_tenant_profiles.settings:', sql, [metadata, tenantId]);
  await pool.query(sql, [JSON.stringify(metadata), tenantId]);
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
 * Returns false if no rows exist (onboarding was never seeded).
 * Returns true only if all seeded steps have status = 'completed'.
 */
export async function isOnboardingComplete(tenantId: string): Promise<boolean> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT
       count(*) AS total,
       count(*) FILTER (WHERE status != 'completed') AS pending
     FROM VN_tenant_onboarding
     WHERE tenant_id = $1`,
    [tenantId],
  );
  const total = parseInt((rows[0] as { total: string }).total, 10);
  const pending = parseInt((rows[0] as { pending: string }).pending, 10);
  if (total === 0) return false;
  return pending === 0;
}
