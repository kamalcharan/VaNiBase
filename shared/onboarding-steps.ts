/**
 * Onboarding Step Definitions — Shared between framework and shell.
 *
 * Products override DEFAULT_ONBOARDING_STEPS via their shell.config.ts.
 * The framework reads mandatory steps to seed VN_tenant_onboarding on registration.
 */

export interface OnboardingStepDef {
  /** Unique step identifier, stored in VN_tenant_onboarding.step_id */
  id: string;
  /** Human-readable label for display */
  label: string;
  /** If true, this step is tracked in DB and blocks onboarding_complete */
  mandatory: boolean;
}

/**
 * Default onboarding steps (KI-Prime product).
 * Only mandatory steps get DB rows — optional steps are UI-only.
 */
export const DEFAULT_ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: 'user_profile', label: 'Complete your profile', mandatory: true },
  { id: 'business_profile', label: 'Set up business profile', mandatory: true },
  { id: 'theme_selection', label: 'Choose a theme', mandatory: false },
  { id: 'invite_team', label: 'Invite team members', mandatory: false },
  { id: 'risk_preferences', label: 'Set risk preferences', mandatory: false },
  { id: 'import_data', label: 'Import data', mandatory: false },
];

/** Helper: get only mandatory steps from a step list. */
export function getMandatorySteps(steps: OnboardingStepDef[]): OnboardingStepDef[] {
  return steps.filter((s) => s.mandatory);
}
