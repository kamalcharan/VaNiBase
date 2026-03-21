'use client';

import { createContext, useContext, type ReactNode } from 'react';
import React from 'react';
import { DEFAULT_SHELL_CONFIG } from './shell-config-types';
import type { ShellConfig } from './shell-config-types';

// Re-export types and default so existing imports keep working
export type { SkillEndpoint, RecipeConfig, ShellConfig } from './shell-config-types';
export { DEFAULT_SHELL_CONFIG } from './shell-config-types';

// ── React context ──

const ShellConfigContext = createContext<ShellConfig>(DEFAULT_SHELL_CONFIG);

export function ShellConfigProvider({
  config,
  children,
}: {
  config: ShellConfig;
  children: ReactNode;
}) {
  return React.createElement(ShellConfigContext.Provider, { value: config }, children);
}

export function useShellConfig(): ShellConfig {
  return useContext(ShellConfigContext);
}
