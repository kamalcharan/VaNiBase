/**
 * Framework Configuration — Reads environment variables
 */

export interface FrameworkConfig {
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  databaseUrl: string;
  redisUrl: string;
  vllmEndpoint: string;
  vllmModel: string;
  claudeApiKey: string;
  claudeModel: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  jwtSecret: string;
  productSlug: string;
}

export function loadConfig(): FrameworkConfig {
  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: (process.env.NODE_ENV as FrameworkConfig['nodeEnv']) || 'development',
    databaseUrl: process.env.DATABASE_URL || '',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    vllmEndpoint: process.env.VLLM_ENDPOINT || 'http://localhost:8000/v1',
    vllmModel: process.env.VLLM_MODEL || 'liquidai/lfm2-2.6b',
    claudeApiKey: process.env.CLAUDE_API_KEY || '',
    claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514',
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
    jwtSecret: process.env.JWT_SECRET || '',
    productSlug: process.env.PRODUCT_SLUG || 'vani',
  };
}
