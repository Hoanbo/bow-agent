// src/core/internet/internetTypes.ts
// BOWCON V4.0 — PRODUCTION SECURE INTERNET EDGE & TLS RELAY RUNTIME (MS-1.3.29)
//
// Canonical type contracts for the Internet Edge & TLS Relay subsystem.
// All public types are sealed at this layer; downstream modules import only from here.
//
// NON-NEGOTIABLE ARCHITECTURAL INVARIANTS:
// 1.  INTERNET_EDGE  != WIRE_TRANSPORT   (Edge governs TLS admission; wire governs frame I/O)
// 2.  TLS_SESSION    != DEVICE_IDENTITY  (TLS handshake does not grant identity)
// 3.  TLS_SESSION    != AUTHORIZATION    (TLS handshake does not grant permissions)
// 4.  CERT_PINNED   != TRUST_GRANTED    (Certificate match is a prerequisite, not an authority grant)
// 5.  INTERNET_EDGE  != BRAIN           (Internet Edge is relay fabric, not cognitive layer)
// 6.  INTERNET_EDGE  != EXECUTION       (Edge never executes agent tools)
// 7.  TLS_DOWNGRADE  == SECURITY_VIOLATION (Any TLS downgrade MUST be rejected fail-closed)
// 8.  RECONNECT     != RE-EXECUTE       (Network reconnect never retriggers task execution)
// 9.  ROAMING       != IDENTITY_CHANGE  (IP/interface change does not change device identity)
// 10. ONE_BRAIN     == ONE_AUTHORITATIVE_BRAIN (Single brain per device, enforced by Edge)
// 11. MTLS_REQUIRED for all production relay endpoints (no anonymous TLS allowed)
// 12. PROTOCOL_VERSION must be validated on every TLS resumption
// 13. INTERNET_HEALTH != TRUST (Healthy connection ≠ admitted connection)
// 14. AUDIT_EVENTS  are append-only (no mutation after write)
// 15. ADMISSION_BRIDGE is the ONLY gateway between Internet Edge and relay fabric

export const INTERNET_SUBSYSTEM_VERSION = '4.0.0';
export const INTERNET_MIN_TLS_VERSION = 'TLSv1.3';
export const INTERNET_MAX_CERT_AGE_DAYS = 397; // CA/Browser Forum baseline
export const INTERNET_HANDSHAKE_TIMEOUT_MS = 8_000;
export const INTERNET_RECONNECT_INITIAL_DELAY_MS = 500;
export const INTERNET_RECONNECT_MAX_DELAY_MS = 60_000;
export const INTERNET_RECONNECT_MAX_ATTEMPTS = 12;
export const INTERNET_HEALTH_PROBE_INTERVAL_MS = 30_000;
export const INTERNET_HEALTH_DEGRADED_THRESHOLD_MS = 2_000;

// ---------------------------------------------------------------------------
// TLS / Certificate primitives
// ---------------------------------------------------------------------------

/** Minimum TLS version accepted by the Internet Edge. */
export type InternetTlsVersion =
  | 'TLSv1.2'   // legacy — rejected in production; allowed only in test stubs
  | 'TLSv1.3';  // required in production

/** Cipher suites ordered by preference (AEAD-only). */
export type InternetCipherSuite =
  | 'TLS_AES_256_GCM_SHA384'
  | 'TLS_AES_128_GCM_SHA256'
  | 'TLS_CHACHA20_POLY1305_SHA256';

/** Certificate key algorithm classes. */
export type InternetCertKeyAlgorithm =
  | 'ECDSA_P256'
  | 'ECDSA_P384'
  | 'RSA_2048'
  | 'RSA_4096'
  | 'ED25519';

/** Result of a TLS handshake attempt. */
export type InternetTlsHandshakeResult =
  | 'TLS_ACCEPTED'
  | 'TLS_REJECTED_VERSION'
  | 'TLS_REJECTED_CERT'
  | 'TLS_REJECTED_CIPHER'
  | 'TLS_TIMEOUT'
  | 'TLS_PROTOCOL_ERROR';

// ---------------------------------------------------------------------------
// Endpoint / Roaming primitives
// ---------------------------------------------------------------------------

/** An internet endpoint that the Edge dials or accepts connections from. */
export interface InternetEndpointDescriptor {
  /** Symbolic host label — no raw IP addresses stored (protocol-neutral). */
  readonly host: string;
  readonly port: number;
  readonly tlsRequired: boolean;
  readonly mtlsRequired: boolean;
  /** Optional SNI override. */
  readonly sni?: string;
  /** Optional path prefix for WebSocket/HTTP upgrades. */
  readonly path?: string;
}

/** A physical network interface snapshot (no identity semantics). */
export interface InternetNetworkInterface {
  /** Opaque interface label (e.g. "eth0", "wlan0"). Never treated as identity. */
  readonly label: string;
  readonly isWireless: boolean;
  readonly mtu: number;
}

/** Reason codes for roaming events. */
export type InternetRoamingReason =
  | 'INTERFACE_CHANGE'
  | 'IP_CHANGE'
  | 'NETWORK_SWITCH'
  | 'DNS_CHANGE'
  | 'FORCED_ROAM';

// ---------------------------------------------------------------------------
// Session / Edge lifecycle
// ---------------------------------------------------------------------------

/** Opaque identifier for an Internet Edge session. */
export type InternetEdgeSessionId = string & { readonly __brand: 'InternetEdgeSessionId' };

/** Factory — produces a branded EdgeSessionId without importing crypto directly. */
export function makeInternetEdgeSessionId(raw: string): InternetEdgeSessionId {
  return raw as InternetEdgeSessionId;
}

/** High-level summary of an established Internet Edge session. */
export interface InternetEdgeSessionInfo {
  readonly sessionId: InternetEdgeSessionId;
  readonly tlsVersion: InternetTlsVersion;
  readonly cipherSuite: InternetCipherSuite;
  readonly certFingerprint: string;
  readonly establishedAt: number;
  readonly lastActivityAt: number;
  readonly roamingCount: number;
  readonly reconnectCount: number;
}

// ---------------------------------------------------------------------------
// Health / Quality
// ---------------------------------------------------------------------------

/** Internet Edge connection health levels. */
export type InternetHealthLevel =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNREACHABLE'
  | 'RECOVERING'
  | 'UNKNOWN';

/** A point-in-time health measurement. */
export interface InternetHealthProbe {
  readonly probedAt: number;
  readonly rttMs: number;
  readonly level: InternetHealthLevel;
  readonly reason?: string;
}

// ---------------------------------------------------------------------------
// Admission / Relay bridge
// ---------------------------------------------------------------------------

/** Decision returned by the Internet Edge admission bridge. */
export type InternetAdmissionDecision =
  | 'ADMIT'
  | 'REJECT_TLS'
  | 'REJECT_CERT'
  | 'REJECT_DOWNGRADE'
  | 'REJECT_POLICY'
  | 'REJECT_OVERLOAD';

/** Payload carried through the admission bridge into the relay fabric. */
export interface InternetAdmissionToken {
  readonly sessionId: InternetEdgeSessionId;
  readonly tlsVersion: InternetTlsVersion;
  readonly cipherSuite: InternetCipherSuite;
  readonly certFingerprint: string;
  readonly issuedAt: number;
  /** Token is single-use and expires immediately after relay binding. */
  readonly consumedAt?: number;
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

/** Immutable snapshot of the Internet Edge runtime for AgentLoop observation. */
export interface InternetEdgeSnapshot {
  readonly version: string;
  readonly activeSessionCount: number;
  readonly totalSessionsEstablished: number;
  readonly totalTlsRejections: number;
  readonly totalDowngradeAttempts: number;
  readonly health: InternetHealthLevel;
  readonly lastProbe?: InternetHealthProbe;
  readonly capturedAt: number;
}
