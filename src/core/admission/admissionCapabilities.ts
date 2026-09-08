// src/core/admission/admissionCapabilities.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Safe capability filtering.
// STRICT INVARIANT:
// - POSSESSION_OF_DEVICE_KEY != EXECUTION_AUTHORITY
// - TRUSTED != AUTHORIZED
// - FORBIDDEN_CAPABILITY == REJECT
// - Reject any cognitive, approval-bypassing, or direct execution capabilities.

export const FORBIDDEN_ADMISSION_CAPABILITIES = Object.freeze([
  'EXECUTE_TOOL',
  'DIRECT_TOOL_EXECUTION',
  'MUTATE_BRAIN',
  'BYPASS_PDP',
  'BYPASS_APPROVAL',
  'BYPASS_VERIFICATION',
  'BYPASS_COMMIT',
  'ALTER_BRAIN_MEMORY',
  'DIRECT_ROBOT_ACTUATION',
  'DIRECT_MOBILE_AUTOMATION',
  'CHANGE_GOVERNANCE',
  'FORCE_RECOVERY',
  'ELEVATE_PERMISSIONS',
]);

export const FORBIDDEN_ADMISSION_EXECUTION_CAPABILITIES = FORBIDDEN_ADMISSION_CAPABILITIES;

export const ALLOWED_DATA_PLANE_CAPABILITIES = Object.freeze([
  'OBSERVE_EVENTS',
  'RECEIVE_STATUS',
  'SEND_STATUS',
  'ACK_MESSAGES',
  'REQUEST_SCREEN_CAPTURE',
  'RECEIVE_SCREEN_CAPTURE',
  'REQUEST_SCREEN_DESCRIPTION',
  'RECEIVE_DESCRIPTION',
  'REQUEST_ROBOT_STATUS',
  'RECEIVE_ROBOT_STATUS',
  'REQUEST_DEVICE_STATUS',
  'RECEIVE_DEVICE_STATUS',
  'TELEMETRY_EMIT',
  'HEARTBEAT_SEND',
  'SURFACE_STATUS',
  'SURFACE_TELEMETRY',
  'STATUS',
  'TELEMETRY',
]);

export const DEFAULT_ALLOWED_ADMISSION_CAPABILITIES = ALLOWED_DATA_PLANE_CAPABILITIES;

const FORBIDDEN_CAPABILITIES_SET = new Set<string>(FORBIDDEN_ADMISSION_CAPABILITIES);
const ALLOWED_CAPABILITIES_SET = new Set<string>(ALLOWED_DATA_PLANE_CAPABILITIES);

export interface CapabilityFilterResult {
  readonly valid: boolean;
  readonly allowed: readonly string[];
  readonly rejected: readonly string[];
  readonly forbidden: readonly string[];
}

/**
 * Evaluates requested capabilities and fails closed if any forbidden execution capabilities are present.
 */
export function filterAdmissionCapabilities(requested: readonly string[]): CapabilityFilterResult {
  const allowed: string[] = [];
  const rejected: string[] = [];
  const forbidden: string[] = [];

  for (const cap of requested) {
    const normalized = cap.trim().toUpperCase();
    if (FORBIDDEN_CAPABILITIES_SET.has(normalized)) {
      forbidden.push(normalized);
      rejected.push(normalized);
    } else if (ALLOWED_CAPABILITIES_SET.has(normalized)) {
      allowed.push(normalized);
    } else {
      // Unknown capabilities are safely rejected (fail-closed)
      rejected.push(normalized);
    }
  }

  return Object.freeze({
    valid: forbidden.length === 0,
    allowed: Object.freeze(allowed),
    rejected: Object.freeze(rejected),
    forbidden: Object.freeze(forbidden),
  });
}

export function isCognitiveEscalationAttempt(requested: readonly string[]): boolean {
  const res = filterAdmissionCapabilities(requested);
  return res.forbidden.length > 0;
}

export function assertSafeAdmissionCapabilities(requested: readonly string[]): void {
  const res = filterAdmissionCapabilities(requested);
  if (res.forbidden.length > 0) {
    throw new Error(`[ADMISSION_COGNITIVE_ESCALATION_BLOCKED] Attempted cognitive or execution escalation: ${res.forbidden.join(', ')}`);
  }
}

