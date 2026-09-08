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
/** Factory — produces a branded EdgeSessionId without importing crypto directly. */
export function makeInternetEdgeSessionId(raw) {
    return raw;
}
