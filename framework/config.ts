/**
 * Framework Configuration — Reads environment variables
 */

export interface DbParamsConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface FrameworkConfig {
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  databaseUrl: string;
  dbParams: DbParamsConfig | null;
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
    dbParams: process.env.DB_HOST ? {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'postgres',
    } : null,
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
