/**
 * VaNi Product Framework — Shared Type Definitions
 * 
 * These interfaces define the contracts between all framework layers.
 * Product authors extend these; framework code implements them.
 * 
 * Task: F-03 | Owner: Claude.ai | Depends On: F-01
 */

// ============================================================
// 1. TENANT & AUTH
// ============================================================

export type VaniMode = 'full' | 'explain' | 'off';
export type TenancyModel = 'operator' | 'subscriber';
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise';
export type Channel = 'web' | 'whatsapp' | 'mobile' | 'api';

export interface Tenant {
  id: string;                    // UUID
  name: string;                  // Display name (e.g., distributor firm name)
  tier: SubscriptionTier;
  preferences: TenantPreferences;
  active: boolean;
  created_at: string;            // ISO 8601
  updated_at: string;
}

export interface TenantPreferences {
  theme: string;                 // e.g., 'ocean-blue'
  language: string;              // e.g., 'en', 'hi'
  timezone: string;              // e.g., 'Asia/Kolkata'
  daily_briefing: boolean;
  whatsapp_enabled: boolean;
  custom: Record<string, unknown>; // Product-specific preferences
}

export interface AuthUser {
  id: string;                    // Supabase auth user ID
  tenant_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  display_name: string;
}

export interface JWTPayload {
  sub: string;                   // user_id
  tenant_id: string;
  role: string;
  tier: SubscriptionTier;
  email: string;
  iat: number;
  exp: number;
}

// ============================================================
// 2. SKILL SYSTEM
// ============================================================

export interface SkillContext {
  tenantId: string;              // From JWT, NEVER from LLM
  tenant_id: string;             // Alias for tenantId — products use snake_case
  userId: string;                // Authenticated user
  tier: SubscriptionTier;
  db: TenantScopedDB;           // Pre-scoped database client
  memory: MemoryStore;           // Tenant-scoped conversation memory
  escalate: (prompt: string) => Promise<string>; // Claude API fallback
  enqueue: (jobType: string, payload: Record<string, unknown>) => Promise<string>; // BullMQ async job dispatch
  entityId?: string;             // Optional entity context (client_id, contract_id, etc.)
  entityType?: string;           // From product config
  channel: Channel;
}

export interface TenantScopedDB {
  query<T = Record<string, unknown>>(
    sql: string,
    params: Record<string, unknown>
  ): Promise<{ rows: T[] }>;
  queryOne<T = Record<string, unknown>>(
    sql: string,
    params: Record<string, unknown>
  ): Promise<{ rows: T[] }>;
  queryForUpdate<T = Record<string, unknown>>(
    sql: string,
    params: Record<string, unknown>
  ): Promise<T[]>;
  execute(
    sql: string,
    params: Record<string, unknown>
  ): Promise<{ rowCount: number }>;
  transaction<T>(fn: (tx: TenantScopedDB) => Promise<T>): Promise<T>;
}

export interface MemoryStore {
  getHistory(
    tenantId: string,
    entityId: string | null,
    limit: number
  ): Promise<ConversationTurn[]>;
  saveTurn(turn: ConversationTurn): Promise<void>;
  search(
    tenantId: string,
    query: string,
    limit: number
  ): Promise<ConversationTurn[]>;
}

export interface ConversationTurn {
  id: string;
  tenant_id: string;
  entity_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  skill_calls?: SkillCall[];
  recipe_used?: string;
  channel: Channel;
  timestamp: string;             // ISO 8601
  embedding?: number[];          // pgvector embedding
}

export interface SkillDefinition {
  name: string;
  version: string;
  description: string;
  tier: SubscriptionTier;        // Minimum tier required
  default_recipe: string;
  functions: SkillFunctionDef[];
}

export interface SkillFunctionDef {
  name: string;
  description: string;
  parameters: SkillParam[];
  returns: string;               // Human-readable return description
  default_recipe?: string;       // Function-level recipe override
}

export interface SkillParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'string[]' | 'number[]' | 'object';
  required: boolean;
  description: string;
  default?: unknown;
}

export interface SkillCall {
  skill: string;                 // e.g., 'portfolio-skill'
  function: string;              // e.g., 'get_holdings'
  params: Record<string, unknown>;
}

export interface SkillResult {
  success: boolean;
  recipe: string;                // Recipe name for rendering
  data: Record<string, unknown>; // Skill output data
  summary?: string;              // Optional NL summary for chat
  error?: string;
}

export interface SkillRegistry {
  skills: Map<string, SkillDefinition>;
  getSkillsForTier(tier: SubscriptionTier): SkillDefinition[];
  getFunction(skillName: string, functionName: string): SkillFunctionDef | null;
  buildToolDefinitions(tier: SubscriptionTier): LFM2ToolDef[];
}

// ============================================================
// 3. VaNi ENGINE (LFM2 INTEGRATION)
// ============================================================

export interface VaniRequest {
  message: string;
  tenant_id: string;
  user_id: string;
  entity_id?: string;
  channel: Channel;
  mode: VaniMode;
}

export interface VaniResponse {
  reply: string;                 // NL response text
  skill_calls: SkillCall[];      // Tool calls made
  skill_results: SkillResult[];  // Results from skills
  recipe?: string;               // Final recipe to render (may differ from skill default)
  data?: Record<string, unknown>; // Merged data for recipe
  escalated: boolean;            // Was this escalated to Claude?
  confidence: number;            // 0-1, VaNi's self-assessed confidence
}

export interface LFM2ToolDef {
  type: 'function';
  function: {
    name: string;                // skill_name.function_name
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, {
        type: string;
        description: string;
        enum?: string[];
      }>;
      required: string[];
    };
  };
}

export interface LFM2Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: LFM2ToolCall[];
}

export interface LFM2ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;           // JSON string
  };
}

export interface VaniEngineConfig {
  endpoint: string;              // vLLM base URL
  model: string;                 // e.g., 'liquidai/lfm2-2.6b'
  maxTokens: number;
  temperature: number;
  escalationThreshold: number;   // Confidence below this → Claude
}

// ============================================================
// 4. RECIPE SYSTEM
// ============================================================

export type LayoutTemplate =
  | 'dashboard-3row'
  | 'detail-sidebar'
  | 'list-detail'
  | 'wizard-flow'
  | 'briefing'
  | 'comparison';

export interface Recipe {
  name: string;                  // Unique recipe identifier
  title: string;                 // Human-readable display title
  layout: LayoutTemplate;
  slots: RecipeSlot[];
  responsive?: ResponsiveRule[];
}

export interface RecipeSlot {
  row: number;
  components: RecipeComponent[];
}

export interface RecipeComponent {
  type: string;                  // VDF component name (e.g., 'kpi-card')
  data: string;                  // JSONPath into skill result data
  variant?: string;              // Component variant
  span?: number;                 // Grid column span (default 1)
  props?: Record<string, unknown>; // Additional component props
}

export interface ResponsiveRule {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  changes: {
    slot: number;                // Row index
    component: number;           // Component index within row
    hide?: boolean;
    span?: number;
    variant?: string;
  }[];
}

export interface RecipeRegistry {
  recipes: Map<string, Recipe>;
  get(name: string): Recipe | null;
  register(recipe: Recipe): void;
}

// ============================================================
// 5. VDF (VIKUNA DESIGN FRAMEWORK) COMPONENTS
// ============================================================

export interface VDFComponentDef {
  type: string;                  // Component identifier
  category: 'data-display' | 'chart' | 'interactive' | 'vani-specific';
  variants: string[];
  dataShape: Record<string, string>; // Expected data shape description
}

// --- Data Display Components ---

export interface KPICardData {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'flat';
  trend_value?: string;
  status?: 'success' | 'warning' | 'danger' | 'info';
  prefix?: string;               // e.g., '₹'
  suffix?: string;               // e.g., '%'
}

export interface DataTableData {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
  sortable?: boolean;
  paginated?: boolean;
  pageSize?: number;
  onRowClick?: string;           // Skill call template
}

export interface DataTableColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percentage' | 'date' | 'badge';
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface StatRowData {
  stats: { label: string; value: string | number; prefix?: string; suffix?: string }[];
}

export interface TimelineData {
  events: TimelineEvent[];
}

export interface TimelineEvent {
  date: string;
  text: string;
  type: 'activity' | 'milestone' | 'alert' | 'info';
  icon?: string;
}

export interface BadgeData {
  text: string;
  variant: 'status' | 'tier' | 'risk' | 'category';
  color?: string;
}

// --- Chart Components ---

export interface DoughnutData {
  segments: { label: string; value: number; color?: string }[];
  centerLabel?: string;
  centerValue?: string;
}

export interface LineChartData {
  series: { label: string; data: number[]; color?: string }[];
  xLabels: string[];
  yLabel?: string;
}

export interface BarChartData {
  categories: string[];
  values: number[] | { label: string; data: number[]; color?: string }[];
  horizontal?: boolean;
}

export interface ProbabilityGaugeData {
  probability: number;           // 0 to 1
  target?: number;
  label: string;
  thresholds?: { green: number; amber: number }; // Defaults: 0.7, 0.4
}

export interface SparklineData {
  values: number[];
  color?: string;
  showArea?: boolean;
}

// --- Interactive Components ---

export interface SliderPanelData {
  label: string;
  min: number;
  max: number;
  current: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  onChange: string;               // Skill call template with {{value}} placeholder
}

export interface ActionBarData {
  actions: {
    label: string;
    skill: string;               // Skill function to call
    params: Record<string, unknown>;
    variant?: 'primary' | 'secondary' | 'danger';
    icon?: string;
  }[];
}

export interface FilterRowData {
  filters: {
    key: string;
    type: 'dropdown' | 'search' | 'toggle' | 'date-range';
    label: string;
    options?: { value: string; label: string }[];
    defaultValue?: unknown;
  }[];
  onFilter: string;              // Skill call template
}

export interface WizardData {
  steps: {
    title: string;
    description?: string;
    fields: WizardField[];
  }[];
  onComplete: string;            // Skill call template
}

export interface WizardField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'currency' | 'toggle';
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: { min?: number; max?: number; pattern?: string };
  placeholder?: string;
}

export interface ApprovalCardData {
  proposal: string;
  reasoning: string;
  actions: {
    accept: { skill: string; params: Record<string, unknown> };
    modify?: { skill: string; params: Record<string, unknown> };
    reject: { skill: string; params: Record<string, unknown> };
  };
}

// --- VaNi-Specific Components ---

export interface InsightCardData {
  title: string;
  body: string;
  severity: 'high' | 'medium' | 'low' | 'info';
  action?: {
    label: string;
    skill: string;
    params: Record<string, unknown>;
  };
  timestamp?: string;
}

export interface BriefingPanelData {
  insights: InsightCardData[];
  date: string;
  greeting?: string;
}

export interface SuggestionData {
  text: string;
  confidence: number;            // 0 to 1
  action?: {
    label: string;
    skill: string;
    params: Record<string, unknown>;
  };
}

export interface ChatPanelData {
  messages: ChatMessage[];
  onSend: string;                // API endpoint
  placeholder?: string;
  contextLabel?: string;         // e.g., "Talking about Priya's portfolio"
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  recipe?: string;               // If assistant response includes a renderable recipe
  data?: Record<string, unknown>;
}

// ============================================================
// 6. PRODUCT CONFIGURATION
// ============================================================

export interface VaniProductConfig {
  product: {
    name: string;
    slug: string;                // URL-safe identifier
    description: string;
    entityType: string;          // Primary entity (e.g., 'client', 'contract', 'market')
    entityLabel: string;         // Display label for entity
    version: string;
  };
  vani: {
    mode: VaniMode;
    systemPrompt: string;        // Base system prompt for this product
    defaultRecipe: string;       // Home screen recipe
    escalationThreshold: number; // 0-1, below this → Claude API
  };
  tenancy: {
    model: TenancyModel;
    // operator: tenant manages entities (distributor → clients)
    // subscriber: user IS the tenant (trader → own dashboard)
  };
  tiers: Record<SubscriptionTier, {
    skills: string[] | ['*'];    // '*' = all skills
    maxEntities: number;
    vaniInteractionsPerDay: number;
    claudeEscalationsPerDay: number;
    features: Record<string, boolean>;
  }>;
  channels: Channel[];
  themes: string[];              // Available theme names
  database: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    skillDbUrl: string;          // Raw PostgreSQL connection string
  };
}

// ============================================================
// 7. API REQUEST / RESPONSE
// ============================================================

export interface ChatRequest {
  message: string;
  entity_id?: string;
  channel?: Channel;
  recipe_override?: string;      // Force a specific recipe
}

export interface ChatResponse {
  reply: string;
  recipe?: string;
  data?: Record<string, unknown>;
  skill_calls?: { skill: string; function: string }[];
  escalated?: boolean;
}

export interface APIError {
  error: string;
  code: string;
  status: number;
  details?: Record<string, unknown>;
}

// ============================================================
// 8. ENVIRONMENT CONFIG
// ============================================================

export interface EnvironmentConfig {
  port: number;
  nodeEnv: 'development' | 'staging' | 'production';
  
  // Supabase (auth + realtime)
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  
  // Raw PostgreSQL (skill data)
  databaseUrl: string;
  
  // Redis
  redisUrl: string;
  
  // vLLM
  vllmEndpoint: string;
  vllmModel: string;
  
  // Claude API (escalation)
  claudeApiKey: string;
  claudeModel: string;
  
  // JWT
  jwtSecret: string;
  
  // Product
  productSlug: string;
}
