/**
 * 14 Canonical Connection States
 */
export declare const CONNECTION_STATES: readonly ["INITIALIZING", "CONNECTING", "CONNECTED", "AUTHENTICATING", "AUTHENTICATED", "AUTHORIZING", "AUTHORIZED", "READY", "DEGRADED", "RECONNECTING", "DISCONNECTING", "DISCONNECTED", "FAILED", "CLOSED"];
export type ConnectionState = (typeof CONNECTION_STATES)[number];
/**
 * 9 Canonical Session States
 */
export declare const SESSION_STATES: readonly ["CREATED", "NEGOTIATING", "ESTABLISHED", "ACTIVE", "IDLE", "RESUMING", "SUSPENDED", "EXPIRED", "TERMINATED"];
export type SessionState = (typeof SESSION_STATES)[number];
/**
 * Type guard for ConnectionState
 */
export declare function isConnectionState(val: unknown): val is ConnectionState;
/**
 * Type guard for SessionState
 */
export declare function isSessionState(val: unknown): val is SessionState;
/**
 * Checks if a connection is in an active operational state capable of message transfer
 */
export declare function isConnectionStateOperational(state: ConnectionState): boolean;
/**
 * Checks if a connection is in a terminal/closed state
 */
export declare function isConnectionStateTerminal(state: ConnectionState): boolean;
/**
 * Checks if a session is currently valid and active
 */
export declare function isSessionActive(state: SessionState): boolean;
/**
 * Checks if a session is in a terminal state
 */
export declare function isSessionTerminal(state: SessionState): boolean;
