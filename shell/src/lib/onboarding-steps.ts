/**
 * Onboarding Step Definitions — Local copy for shell (Next.js) builds.
 *
 * This is a copy of shared/onboarding-steps.ts kept within the shell source
 * tree so that relative imports resolve correctly when VaNiBase is consumed
 * as a git submodule. The canonical source remains shared/onboarding-steps.ts
 * (used by framework services).
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
  /** Component name for placeholder rendering (product replaces with real form) */
  component?: string;
}

/**
 * Default onboarding steps (KI-Prime product).
 * Only mandatory steps get DB rows — optional steps are UI-only.
 */
export const DEFAULT_ONBOARDING_STEPS: OnboardingStepDef[] = [
  { id: 'user_profile', label: 'Complete your profile', mandatory: true, component: 'UserProfileForm' },
  { id: 'business_profile', label: 'Set up business profile', mandatory: true, component: 'BusinessProfileForm' },
  { id: 'theme_selection', label: 'Choose a theme', mandatory: false, component: 'ThemeSelector' },
  { id: 'invite_team', label: 'Invite team members', mandatory: false, component: 'InviteTeamForm' },
  { id: 'risk_preferences', label: 'Set risk preferences', mandatory: false, component: 'RiskPreferencesForm' },
  { id: 'import_data', label: 'Import data', mandatory: false, component: 'ImportDataForm' },
];

/** Helper: get only mandatory steps from a step list. */
export function getMandatorySteps(steps: OnboardingStepDef[]): OnboardingStepDef[] {
  return steps.filter((s) => s.mandatory);
}
