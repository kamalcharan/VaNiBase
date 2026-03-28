/**
 * Tenant Profile Service — Read and update tenant profile (VN_tenant_profiles).
 */

import { getPool } from '../db/index.js';
import { ValidationError } from '../errors/index.js';

export interface UpdateProfileInput {
  name?: string;
  logo_url?: string;
  theme_id?: string;
}

export interface TenantProfile {
  tenant_id: string;
  name: string;
  logo_url: string | null;
  theme_id: string | null;
  updated_at: string;
}

/**
 * Update tenant profile. Only provided fields are updated (partial update).
 * Uses upsert: inserts a row if one doesn't exist for this tenant.
 */
export async function updateTenantProfile(
  tenantId: string,
  input: UpdateProfileInput,
): Promise<TenantProfile> {
  const pool = getPool();

  // Validate inputs
  if (input.name !== undefined) {
    if (!input.name || input.name.length > 255) {
      throw new ValidationError('name must be a non-empty string with max 255 characters');
    }
  }

  if (input.logo_url !== undefined) {
    if (input.logo_url.length > 500) {
      throw new ValidationError('logo_url must be max 500 characters');
    }
    try {
      new URL(input.logo_url);
    } catch {
      throw new ValidationError('logo_url must be a valid URL');
    }
  }

  if (input.theme_id !== undefined) {
    if (!input.theme_id || input.theme_id.length > 50) {
      throw new ValidationError('theme_id must be a non-empty string with max 50 characters');
    }
  }

  // Build SET clause dynamically from provided fields
  const setClauses: string[] = [];
  const values: unknown[] = [tenantId]; // $1 is always tenant_id
  let paramIndex = 2;

  if (input.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.logo_url !== undefined) {
    setClauses.push(`logo_url = $${paramIndex++}`);
    values.push(input.logo_url);
  }
  if (input.theme_id !== undefined) {
    setClauses.push(`theme_id = $${paramIndex++}`);
    values.push(input.theme_id);
  }

  if (setClauses.length === 0) {
    throw new ValidationError('At least one field must be provided: name, logo_url, theme_id');
  }

  // Ensure the row exists (name is NOT NULL, so use a placeholder for the insert)
  await pool.query(
    `INSERT INTO VN_tenant_profiles (tenant_id, name)
     VALUES ($1, 'Unnamed')
     ON CONFLICT (tenant_id) DO NOTHING`,
    [tenantId],
  );

  // Update only the provided fields
  const { rows } = await pool.query(
    `UPDATE VN_tenant_profiles SET ${setClauses.join(', ')}
     WHERE tenant_id = $1
     RETURNING tenant_id, name, logo_url, theme_id, updated_at`,
    values,
  );

  return rows[0] as TenantProfile;
}
