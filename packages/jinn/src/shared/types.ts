export type StreamDeltaType = "text" | "text_snapshot" | "tool_use" | "tool_result" | "status" | "error" | "context";

export interface StreamDelta {
  type: StreamDeltaType;
  content: string;
  toolName?: string;
  toolId?: string;
  input?: string;
}

export interface Engine {
  name: string;
  run(opts: EngineRunOpts): Promise<EngineResult>;
}

export interface InterruptibleEngine extends Engine {
  kill(sessionId: string, reason?: string): void;
  isAlive(sessionId: string): boolean;
  killAll(): void;
  killIdle(): void;
}

export function isInterruptibleEngine(engine: Engine): engine is InterruptibleEngine {
  return "kill" in engine && "isAlive" in engine && "killAll" in engine;
}

export interface EngineRunOpts {
  prompt: string;
  resumeSessionId?: string;
  systemPrompt?: string;
  cwd: string;
  bin?: string;
  model?: string;
  effortLevel?: string;
  attachments?: string[];
  cliFlags?: string[];
  mcpConfigPath?: string;
  onStream?: (delta: StreamDelta) => void;
  onActivity?: () => void;
  sessionId?: string;
  source?: string;
  onLateRecovery?: (info: { result: string; sessionId: string }) => void;
}

export interface EngineResult {
  sessionId: string;
  result: string;
  cost?: number;
  durationMs?: number;
  numTurns?: number;
  contextTokens?: number;
  error?: string;
  rateLimit?: EngineRateLimitInfo;
}

export type EngineFailureReason =
  | "rate_limit"
  | "quota_exhausted"
  | "engine_unavailable"
  | "timeout"
  | "auth_failure"
  | "context_overflow"
  | "unknown";

export type ModelFallbackMode = "ask_user" | "auto" | "never";

export interface ModelFallbackTarget {
  engine: string;
  model?: string;
  effortLevel?: string;
  employee?: string;
  reason?: string;
}

export interface ModelFallbackBehavior {
  mode?: ModelFallbackMode;
  triggers?: EngineFailureReason[];
  preserve_primary_session?: boolean;
  create_handoff_summary?: boolean;
  return_to_primary_when_available?: "ask_user" | "auto" | "never" | "stay_on_fallback";
}

export interface AgentModelPolicy {
  primary?: ModelFallbackTarget;
  fallback_chain?: ModelFallbackTarget[];
  fallback_behavior?: ModelFallbackBehavior;
}

export interface GlobalModelFallbackConfig {
  enabled?: boolean;
  defaultMode?: ModelFallbackMode;
  globalChain?: ModelFallbackTarget[];
  triggers?: Partial<Record<EngineFailureReason, boolean>>;
  handoff?: {
    createSummary?: boolean;
    includeArtifacts?: boolean;
    includeLogs?: boolean;
    includeOpenQuestions?: boolean;
    includeRecentTranscriptTurns?: number;
  };
  returnPolicy?: { whenPrimaryAvailable?: "ask_user" | "auto" | "never" | "stay_on_fallback" };
}

export interface EngineRateLimitInfo {
  status?: string;
  resetsAt?: number;
  rateLimitType?: string;
  overageStatus?: string;
  overageDisabledReason?: string;
  isUsingOverage?: boolean;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export interface ConnectorCapabilities {
  threading: boolean;
  messageEdits: boolean;
  reactions: boolean;
  attachments: boolean;
}

export interface ConnectorHealth {
  status: "running" | "stopped" | "error" | "qr_pending";
  detail?: string;
  capabilities: ConnectorCapabilities;
}

export type ReplyContext = JsonObject;

export interface Connector {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  getCapabilities(): ConnectorCapabilities;
  getHealth(): ConnectorHealth;
  reconstructTarget(replyContext: ReplyContext): Target;
  sendMessage(target: Target, text: string): Promise<string | void>;
  replyMessage(target: Target, text: string): Promise<string | void>;
  addReaction(target: Target, emoji: string): Promise<void>;
  removeReaction(target: Target, emoji: string): Promise<void>;
  editMessage(target: Target, text: string): Promise<void>;
  setTypingStatus?(channelId: string, threadTs: string | undefined, status: string): Promise<void>;
  onMessage(handler: (msg: IncomingMessage) => void): void;
  getEmployee?(): string | undefined;
}

export interface IncomingMessage {
  connector: string;
  source: string;
  sessionKey: string;
  replyContext: ReplyContext;
  messageId?: string;
  channel: string;
  thread?: string;
  user: string;
  userId: string;
  text: string;
  attachments: Attachment[];
  raw: unknown;
  transportMeta?: JsonObject;
}

export interface Attachment {
  name: string;
  url: string;
  mimeType: string;
  localPath?: string;
}

export interface Target {
  channel: string;
  thread?: string;
  messageTs?: string;
  replyContext?: ReplyContext;
}

export interface Session {
  id: string;
  engine: string;
  engineSessionId: string | null;
  source: string;
  sourceRef: string;
  connector: string | null;
  sessionKey: string;
  replyContext: ReplyContext | null;
  messageId: string | null;
  transportMeta: JsonObject | null;
  employee: string | null;
  model: string | null;
  title: string | null;
  /** ≤140-char whitespace-flattened excerpt of the creation prompt — "what was asked". */
  promptExcerpt?: string | null;
  parentSessionId: string | null;
  /** Forwarded SSO identity captured from an auth proxy (opt-in via
   *  `gateway.userHeader`). Null/undefined for single-user installs. */
  userId?: string | null;
  status: "idle" | "running" | "error" | "waiting" | "interrupted";
  effortLevel: string | null;
  /** Working directory the engine runs in for this session. NULL/undefined =
   *  use the default (JINN_HOME). Set at new-chat time (web folder picker). */
  cwd?: string | null;
  totalCost: number;
  totalTurns: number;
  /** Most recent turn's input-context token count (for the UI context meter). */
  lastContextTokens: number | null;
  queueDepth?: number;
  transportState?: "idle" | "queued" | "running" | "error" | "interrupted";
  /** Serialize-time only (in-memory, never persisted): post-settle background
   *  work — the CLI still has upstream API requests in flight (background
   *  subagents/tasks) after the turn settled. Null when none. */
  backgroundActivity?: { activeStreams: number; lastActivityAt: string } | null;
  createdAt: string;
  lastActivity: string;
  lastError: string | null;
}

export type ArchiveKind = "room" | "scheduled" | "chat";

export interface ArchivedMessageMedia {
  type: "image" | "audio" | "file";
  url: string;
  name?: string;
  mimeType?: string;
  size?: number;
}

export interface ArchivedMessage {
  role: string;
  content: string;
  timestamp: number;
  toolCall?: string;
  media?: ArchivedMessageMedia[];
}

export interface ArchivedSessionSnapshot {
  id: string;
  engine: string;
  employee: string | null;
  model: string | null;
  title: string | null;
  promptExcerpt: string | null;
  source: string;
  sourceRef: string;
  status: Session["status"];
  createdAt: string;
  lastActivity: string;
  totalCost: number;
  totalTurns: number;
  parentSessionId: string | null;
  messages: ArchivedMessage[];
}

export interface ProjectArchive {
  id: string;
  label: string | null;
  note: string | null;
  kind: ArchiveKind;
  sourceRef: string | null;
  createdAt: string;
  sessionCount: number;
}

export interface ProjectArchiveDetail extends ProjectArchive {
  sessions: ArchivedSessionSnapshot[];
}

/**
 * A human approval gate. Generic from day one so future producers (tool-use,
 * custom gates) need no schema change — only `fallback` is wired as a producer
 * today (model fallback that requires operator sign-off before switching engine).
 */
export interface Approval {
  id: string;
  sessionId: string;
  type: "fallback" | "tool" | "custom";
  /** Producer-specific. For `fallback`: { from, to, handoffPath, reason }. */
  payload: JsonObject;
  state: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string | null;
  /** Who resolved it (SSO identity / "web-user"). */
  actor?: string | null;
}

export interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  timezone?: string;
  engine?: string;
  model?: string;
  employee?: string;
  prompt: string;
  delivery?: CronDelivery;
}

export type CronRunStatus = "queued" | "running" | "success" | "error" | "skipped_overlap";

export interface CronRunEntry {
  runId: string;
  timestamp: string;
  startedAt?: string;
  finishedAt?: string;
  sessionKey?: string;
  sessionId?: string | null;
  status: CronRunStatus;
  trigger: "scheduled" | "manual";
  durationMs?: number;
  error?: string | null;
  resultPreview?: string | null;
}

export interface CronDelivery {
  connector: string;
  channel: string;
}

export interface Employee {
  name: string;
  displayName: string;
  department: string;
  rank: "executive" | "manager" | "senior" | "employee";
  engine: string;
  model: string;
  persona: string;
  /** Emoji icon for this employee (shown in sidebar, org chart, etc.) */
  emoji?: string;
  /** Office avatar id for this employee, e.g. "office:pencil". Takes precedence
   *  over `emoji` when the frontend resolves the display avatar. */
  avatar?: string;
  /** Extra CLI flags passed to the engine (e.g. ["--chrome"]) */
  cliFlags?: string[];
  /** MCP servers this employee needs. true = all global, false = none, string[] = specific servers */
  mcp?: boolean | string[];
  /** Max cost in USD for a single session. Overrides global config. */
  maxCostUsd?: number;
  /** Default effort level for sessions assigned to this employee */
  effortLevel?: string;
  /** Whether to notify the parent session when this employee's child session completes. Default: true */
  alwaysNotify?: boolean;
  /** Who this employee reports to. String = single parent. Array = primary + dotted-line (future). */
  reportsTo?: string | string[];
  /** Optional policy-driven model fallback/backup chain for this employee. */
  modelPolicy?: AgentModelPolicy;
  /** Services this employee provides to the org */
  provides?: ServiceDeclaration[];
}

/** A service that an employee can provide to other employees/departments. */
export interface ServiceDeclaration {
  name: string;
  description: string;
}

/** A node in the resolved org tree. Wraps an Employee with computed hierarchy data. */
export interface OrgNode {
  employee: Employee;
  /** Resolved primary parent name (null = reports to root) */
  parentName: string | null;
  /** Names of direct reports */
  directReports: string[];
  /** Depth in tree (root = 0, root's reports = 1, etc.) */
  depth: number;
  /** Path from root to this node (excluding virtual root), e.g. ["content-lead", "content-writer"] */
  chain: string[];
}

/** Warning about a hierarchy issue. */
export interface OrgWarning {
  employee: string;
  type: "broken_ref" | "cycle" | "self_ref" | "cross_department" | "multiple_executives";
  message: string;
  /** The invalid reportsTo value that caused this warning */
  ref?: string;
}

/** The fully resolved org hierarchy. */
export interface OrgHierarchy {
  /** Root node name — executive employee name, or null if no executive YAML exists */
  root: string | null;
  /** All nodes keyed by employee name */
  nodes: Record<string, OrgNode>;
  /** Ordered list for flat iteration (topological/BFS order, root first) */
  sorted: string[];
  /** Any resolution warnings */
  warnings: OrgWarning[];
}

export interface Department {
  name: string;
  displayName: string;
  description: string;
}

/** Stdio-based MCP server (spawned as child process) */
export interface McpServerStdioConfig {
  /** Shell command to start the MCP server */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables for the MCP server process */
  env?: Record<string, string>;
}

/** HTTP/SSE-based MCP server (remote URL) */
export interface McpServerUrlConfig {
  /** Transport type — Claude Code requires "sse" for URL-based servers */
  type?: "sse";
  /** URL of the MCP server (HTTP streamable or SSE transport) */
  url: string;
  /** Optional headers for authentication */
  headers?: Record<string, string>;
}

/** MCP server config — either stdio (command) or URL-based */
export type McpServerConfig = McpServerStdioConfig | McpServerUrlConfig;

export interface McpGlobalConfig {
  browser?: {
    enabled: boolean;
    provider?: "playwright" | "puppeteer";
  };
  search?: {
    enabled: boolean;
    provider?: "brave";
    apiKey?: string;
  };
  fetch?: {
    enabled: boolean;
  };
  gateway?: {
    enabled?: boolean;
  };
  /** Custom MCP servers defined by the user */
  custom?: Record<string, (McpServerStdioConfig | McpServerUrlConfig) & { enabled?: boolean }>;
}

export interface WebConnectorConfig {}

export interface SlackConnectorConfig {
  /** Unique instance identifier (e.g. "slack-support") */
  id?: string;
  /** Employee to handle messages from this connector instance */
  employee?: string;
  appToken: string;
  botToken: string;
  allowFrom?: string | string[];
  ignoreOldMessagesOnBoot?: boolean;
}

export interface DiscordConnectorConfig {
  /** Unique instance identifier (e.g. "discord-vox") */
  id?: string;
  /** Employee to handle messages from this connector instance */
  employee?: string;
  botToken?: string;       // Make optional — not needed in proxy mode
  allowFrom?: string | string[];
  ignoreOldMessagesOnBoot?: boolean;
  guildId?: string;
  /** Only respond to messages in this channel */
  channelId?: string;
  /** Route messages from specific channels to remote Jinn instances */
  channelRouting?: Record<string, string | { url: string; token?: string }>;
  /** URL of the primary Jinn instance to proxy Discord I/O through (secondary/remote mode) */
  proxyVia?: string;
  /** API token for the primary Jinn instance when proxyVia targets an authenticated gateway. */
  proxyToken?: string;
}

export interface TelegramConnectorConfig {
  /** Unique instance identifier (e.g. "telegram-support") */
  id?: string;
  /** Employee to handle messages from this connector instance */
  employee?: string;
  botToken: string;
  allowFrom?: number[];
  ignoreOldMessagesOnBoot?: boolean;
  /** Speech-to-text settings forwarded from top-level `config.stt` */
  stt?: {
    enabled?: boolean;
    model?: string;
    language?: string;
    languages?: string[];
  };
}

export interface WhatsAppConnectorConfig {
  /** Unique instance identifier (e.g. "whatsapp-main") */
  id?: string;
  /** Employee to handle messages from this connector instance */
  employee?: string;
  /** Where to store session credentials (default: JINN_HOME/.whatsapp-auth) */
  authDir?: string;
  /** Allowed phone numbers in JID format (e.g. "447700900000@s.whatsapp.net") — empty = allow all */
  allowFrom?: string[];
  ignoreOldMessagesOnBoot?: boolean;
}

export interface ConnectorInstance {
  /** Unique instance ID */
  id: string;
  /** Connector type */
  type: "discord" | "discord-remote" | "slack" | "whatsapp" | "telegram";
  /** Employee to bind to this connector */
  employee?: string;
  /** Type-specific configuration */
  [key: string]: unknown;
}

export interface PortalConfig {
  portalName?: string;
  operatorName?: string;
  language?: string;
  onboarded?: boolean;
  setupComplete?: boolean;
}

/**
 * Model + capability registry.
 *
 * The resolved registry (see shared/models.ts) is the single source of truth for
 * which engines/models exist and what they support. A NEW model shipping is a
 * config edit (`models:` block in config.yaml), zero code change. When the block
 * is absent, the registry is synthesized from `engines.<name>.model` so existing
 * configs keep working.
 */

/** How an engine conveys reasoning-effort to its CLI. */
export type EffortMechanism = "claude-flag" | "codex-config" | "grok-flag" | "pi-flag" | "kiro-flag" | "none";

/** A single model and its capabilities, as exposed to the UI / validation. */
export interface ModelInfo {
  id: string;
  label: string;
  supportsEffort: boolean;
  /** Valid effort levels for THIS model (empty when supportsEffort is false). */
  effortLevels: string[];
  /** Context window size in tokens (for the UI context meter). Omit if unknown. */
  contextWindow?: number;
}

/** Resolved per-engine registry entry. */
export interface EngineRegistryEntry {
  name: string;
  /** Engine is registered/usable in this build. */
  available: boolean;
  /** Default model id for new sessions on this engine. */
  defaultModel: string;
  effortMechanism: EffortMechanism;
  models: ModelInfo[];
}

/** Resolved registry, keyed by engine name. */
export type ModelRegistry = Record<string, EngineRegistryEntry>;

// --- Engine quota/limit snapshots ---

export interface EngineLimitWindow {
  name: string;
  usedPercent?: number;
  windowDurationMins?: number;
  /** Unix timestamp in seconds. */
  resetsAt?: number;
  resetsAtIso?: string;
}

export interface EngineLimitContext {
  usedPercent?: number;
  remainingPercent?: number;
  contextWindowSize?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
}

export interface EngineLimitCredits {
  hasCredits?: boolean;
  unlimited?: boolean;
  balance?: string;
  limit?: number;
  used?: number;
  remainingPercent?: number;
  resetsAt?: number;
  resetsAtIso?: string;
  estimated?: boolean;
}

export interface EngineLimitBucket {
  id: string;
  name?: string;
  planType?: string;
  primary?: EngineLimitWindow;
  secondary?: EngineLimitWindow;
  credits?: EngineLimitCredits;
}

export interface EngineLimitEngineSnapshot {
  name: string;
  available: boolean;
  status: "live" | "snapshot" | "static" | "unsupported" | "error";
  source: string;
  refreshedAt: string;
  defaultModel?: string;
  models: ModelInfo[];
  accountPlan?: string;
  windows?: EngineLimitWindow[];
  buckets?: EngineLimitBucket[];
  credits?: EngineLimitCredits;
  context?: EngineLimitContext;
  costUsd?: number;
  unsupportedReason?: string;
  error?: string;
  stale?: boolean;
}

export interface EngineLimitsResponse {
  generatedAt: string;
  default: string;
  engines: Record<string, EngineLimitEngineSnapshot>;
}

// --- config.yaml `models:` block shapes (all fields optional/forgiving) ---

export interface ModelConfigEntry {
  id: string;
  label?: string;
  supportsEffort?: boolean;
  effortLevels?: string[];
  contextWindow?: number;
}

export interface EngineModelsConfig {
  default?: string;
  effortMechanism?: EffortMechanism;
  models: ModelConfigEntry[];
}

export type ModelsConfig = Record<string, EngineModelsConfig>;

export interface BoardWorkerScheduleWindow {
  start: string;
  end: string;
}

export interface BoardWorkerConfig {
  enabled?: boolean;
  idleMinutes?: number;
  timezone?: string;
  schedule?: {
    weekday?: BoardWorkerScheduleWindow;
    weekend?: BoardWorkerScheduleWindow;
  };
  usage?: {
    minRemainingPercent?: number;
  };
}

export interface OrchestrationRuntimeConfig {
  enabled?: boolean;
  configDir?: string;
  dbPath?: string;
  leaseDurationMs?: number;
  reaperIntervalMs?: number;
  worktreeRoot?: string;
  maxWorktrees?: number;
  sameFamilyReviewerFallback?: boolean;
  empiricalRouting?: boolean;
}

export interface JinnConfig {
  jinn?: { version?: string };
  workspaces?: {
    roots?: string[];
    defaultCwd?: string;
  };
  gateway: {
    port: number;
    host: string;
    streaming?: boolean;
    turnStallInactivityMs?: number;
    turnStallCeilingMs?: number;
    turnStallRetries?: number;
    allowFileCustomPaths?: boolean;
    allowFileOpen?: boolean;
    fileReadRoots?: string[];
    allowArbitraryFileRead?: boolean;
    exposeResolvedFilePaths?: boolean;
    userHeader?: string | string[];
  };
  engines: {
    default: "claude" | "codex" | "antigravity" | "grok" | "pi" | "kiro" | "hermes";
    claude: {
      bin: string;
      model: string;
      effortLevel?: string;
      childEffortOverride?: string;
      maxLivePtys?: number;
    };
    codex: { bin: string; model: string; effortLevel?: string; childEffortOverride?: string };
    antigravity?: { bin?: string; model?: string; effortLevel?: string; childEffortOverride?: string };
    grok?: { bin?: string; model?: string; effortLevel?: string; childEffortOverride?: string };
    pi?: { bin?: string; model?: string; effortLevel?: string; childEffortOverride?: string };
    kiro?: {
      bin?: string;
      model?: string;
      effortLevel?: string;
      childEffortOverride?: string;
      creditBudget?: number;
      billingAnchorDay?: number;
    };
    hermes?: { bin?: string; model?: string };
  };
  models?: ModelsConfig;
  connectors: Record<string, any> & {
    web?: WebConnectorConfig;
    slack?: SlackConnectorConfig;
    telegram?: TelegramConnectorConfig;
    discord?: DiscordConnectorConfig;
    whatsapp?: WhatsAppConnectorConfig;
    instances?: ConnectorInstance[];
  };
  logging: { file: boolean; stdout: boolean; level: string };
  mcp?: McpGlobalConfig;
  modelFallback?: GlobalModelFallbackConfig;
  orchestration?: OrchestrationRuntimeConfig;
  sessions?: {
    maxDurationMinutes?: number;
    maxCostUsd?: number;
    interruptOnNewMessage?: boolean;
    rateLimitStrategy?: "wait" | "fallback";
    fallbackEngine?: "claude" | "codex" | "antigravity" | "grok" | "pi" | "kiro" | "hermes";
    autoResumeOnBoot?: boolean;
  };
  boardWorker?: BoardWorkerConfig;
  cron?: {
    defaultDelivery?: CronDelivery;
    alertChannel?: string;
    alertConnector?: string;
    alertThresholdMs?: number;
  };
  notifications?: {
    connector?: string;  // defaults to "discord"
    channel?: string;    // Discord channel ID for admin notifications
  };
  portal?: PortalConfig;
  context?: {
    maxChars?: number;
  };
  stt?: {
    enabled?: boolean;
    model?: string;
    /** @deprecated Use `languages` instead. Kept for backwards compat. */
    language?: string;
    languages?: string[];
  };
  /** /talk voice loop — optional, off unless explicitly configured. */
  talk?: {
    enabled?: boolean;
    /** Engine for the hands-free voice orchestrator session. When unset (or
     *  unavailable) the talk session falls back to `engines.default`, then to the
     *  first available engine — see talk/engine-resolver.ts. */
    engine?: string;
    /** Model for the hands-free voice orchestrator session (default: "sonnet" — capable enough to orchestrate). */
    orchestratorModel?: string;
    kokoro?: {
      voice?: string;
      modelDir?: string;
      sidecarPort?: number;
    };
  };
  remotes?: Record<string, { url: string; label?: string; token?: string }>;
}
