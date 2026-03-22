/**
 * Fallback product config used when shell runs standalone (framework dev).
 * When running inside a product repo (as submodule), the webpack alias
 * in next.config.mjs resolves @product-config to ../../shell.config.ts instead.
 */
import { DEFAULT_SHELL_CONFIG } from './shell-config-types';

export default DEFAULT_SHELL_CONFIG;
