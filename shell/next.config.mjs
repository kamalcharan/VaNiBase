import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * When shell/ runs as a git submodule inside a product repo, the product
 * provides shell.config.ts at its repo root (two levels above shell/).
 *
 * Layout:
 *   product-repo/
 *     shell.config.ts          ← product config
 *     VaNiBase/                ← submodule
 *       shell/                 ← this Next.js app
 *         next.config.mjs      ← this file
 *
 * The alias @product-config resolves to:
 *   - ../../shell.config.ts   (if it exists — product mode)
 *   - src/lib/default-product-config.ts  (standalone / framework dev mode)
 */
const productConfigPath = resolve(__dirname, '../../shell.config.ts');
const defaultConfigPath = resolve(__dirname, 'src/lib/default-product-config.ts');

const resolvedConfigPath = existsSync(productConfigPath)
  ? productConfigPath
  : defaultConfigPath;

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@product-config'] = resolvedConfigPath;
    return config;
  },
};

export default nextConfig;
