/** @type {import('next').NextConfig} */
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const productConfigPath = resolve(__dirname, '../../shell.config.ts');
const defaultConfigPath = resolve(__dirname, 'src/lib/default-product-config.ts');

const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@product-config'] = existsSync(productConfigPath)
      ? productConfigPath
      : defaultConfigPath;
    return config;
  },
};

export default nextConfig;