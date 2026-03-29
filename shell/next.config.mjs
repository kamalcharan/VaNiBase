/** @type {import('next').NextConfig} */
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const productConfigPath = resolve(__dirname, '../../shell.config.ts');
const defaultConfigPath = resolve(__dirname, 'src/lib/default-product-config.ts');

console.log('[NEXT CONFIG] Product config path:', productConfigPath);
console.log('[NEXT CONFIG] Exists:', existsSync(productConfigPath));

const nextConfig = {
  webpack: (config) => {
    const resolvedPath = existsSync(productConfigPath) ? productConfigPath : defaultConfigPath;
    console.log('[WEBPACK ALIAS] @product-config →', resolvedPath);
    config.resolve.alias['@product-config'] = resolvedPath;
    return config;
  },
};

export default nextConfig;