/**
 * Fixed deterministic UUIDs for local-first app.
 * These are constant so user/agent records stay consistent across server restarts.
 * In production these would come from auth.
 */

// Default user ID (fixed for local-first app)
export const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001'

// Default agent ID (fixed for local-first app)
export const DEFAULT_AGENT_ID = '00000000-0000-0000-0000-000000000002'
