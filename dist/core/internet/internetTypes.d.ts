export declare const INTERNET_SUBSYSTEM_VERSION = "4.0.0";
export declare const INTERNET_MIN_TLS_VERSION = "TLSv1.3";
export declare const INTERNET_MAX_CERT_AGE_DAYS = 397;
export declare const INTERNET_HANDSHAKE_TIMEOUT_MS = 8000;
export declare const INTERNET_RECONNECT_INITIAL_DELAY_MS = 500;
export declare const INTERNET_RECONNECT_MAX_DELAY_MS = 60000;
export declare const INTERNET_RECONNECT_MAX_ATTEMPTS = 12;
export declare const INTERNET_HEALTH_PROBE_INTERVAL_MS = 30000;
export declare const INTERNET_HEALTH_DEGRADED_THRESHOLD_MS = 2000;
/** Minimum TLS version accepted by the Internet Edge. */
export type InternetTlsVersion = 'TLSv1.2' | 'TLSv1.3';
/** Cipher suites ordered by preference (AEAD-only). */
export type InternetCipherSuite = 'TLS_AES_256_GCM_SHA384' | 'TLS_AES_128_GCM_SHA256' | 'TLS_CHACHA20_POLY1305_SHA256';
/** Certificate key algorithm classes. */
export type InternetCertKeyAlgorithm = 'ECDSA_P256' | 'ECDSA_P384' | 'RSA_2048' | 'RSA_4096' | 'ED25519';
/** Result of a TLS handshake attempt. */
export type InternetTlsHandshakeResult = 'TLS_ACCEPTED' | 'TLS_REJECTED_VERSION' | 'TLS_REJECTED_CERT' | 'TLS_REJECTED_CIPHER' | 'TLS_TIMEOUT' | 'TLS_PROTOCOL_ERROR';
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
export type InternetRoamingReason = 'INTERFACE_CHANGE' | 'IP_CHANGE' | 'NETWORK_SWITCH' | 'DNS_CHANGE' | 'FORCED_ROAM';
/** Opaque identifier for an Internet Edge session. */
export type InternetEdgeSessionId = string & {
    readonly __brand: 'InternetEdgeSessionId';
};
/** Factory — produces a branded EdgeSessionId without importing crypto directly. */
export declare function makeInternetEdgeSessionId(raw: string): InternetEdgeSessionId;
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
/** Internet Edge connection health levels. */
export type InternetHealthLevel = 'HEALTHY' | 'DEGRADED' | 'UNREACHABLE' | 'RECOVERING' | 'UNKNOWN';
/** A point-in-time health measurement. */
export interface InternetHealthProbe {
    readonly probedAt: number;
    readonly rttMs: number;
    readonly level: InternetHealthLevel;
    readonly reason?: string;
}
/** Decision returned by the Internet Edge admission bridge. */
export type InternetAdmissionDecision = 'ADMIT' | 'REJECT_TLS' | 'REJECT_CERT' | 'REJECT_DOWNGRADE' | 'REJECT_POLICY' | 'REJECT_OVERLOAD';
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
