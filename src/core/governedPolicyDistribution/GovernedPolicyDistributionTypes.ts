// src/core/governedPolicyDistribution/GovernedPolicyDistributionTypes.ts
// Component 1218: GovernedPolicyDistributionTypes
//
// Canonical contracts, branded IDs, validation, deterministic canonicalization,
// cryptographic hashing helpers, secret scrubbing, and typed error hierarchy for MS-1.5.25.

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type {
  CanonicalStrategicPolicy,
  AuthoritativeRatificationRecord,
  CanonicalPolicyRule,
} from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';
import type {
  PolicyLifecycleRecord,
  PolicyLifecycleState,
} from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';

// ============================================================================
// 1. BRANDED IDENTIFIERS
// ============================================================================
export type FleetNodeId = string & { readonly __brand: unique symbol };
export type DistributionManifestId = string & { readonly __brand: unique symbol };
export type DistributionSessionId = string & { readonly __brand: unique symbol };
export type NodeAttestationId = string & { readonly __brand: unique symbol };
export type NodeQuarantineId = string & { readonly __brand: unique symbol };
export type PolicyEpochId = string & { readonly __brand: unique symbol };
export type DistributionAuditRecordId = string & { readonly __brand: unique symbol };

export function asFleetNodeId(val: string): FleetNodeId { return val as FleetNodeId; }
export function asDistributionManifestId(val: string): DistributionManifestId { return val as DistributionManifestId; }
export function asDistributionSessionId(val: string): DistributionSessionId { return val as DistributionSessionId; }
export function asNodeAttestationId(val: string): NodeAttestationId { return val as NodeAttestationId; }
export function asNodeQuarantineId(val: string): NodeQuarantineId { return val as NodeQuarantineId; }
export function asPolicyEpochId(val: string): PolicyEpochId { return val as PolicyEpochId; }
export function asDistributionAuditRecordId(val: string): DistributionAuditRecordId { return val as DistributionAuditRecordId; }

// ============================================================================
// 2. ENUMS & UNION TYPES
// ============================================================================
export type PolicyDomain = 'LEASE' | 'CONVERGENCE' | 'FEDERATION' | 'SECURITY' | 'RESOURCE' | 'AUDIT';
export const ALL_POLICY_DOMAINS: readonly PolicyDomain[] = Object.freeze([
  'LEASE',
  'CONVERGENCE',
  'FEDERATION',
  'SECURITY',
  'RESOURCE',
  'AUDIT',
]);

export type CanaryRing = 0 | 1 | 2 | 3 | 4;

export type NodeSyncStatus =
  | 'INITIALIZING'
  | 'SYNC_PENDING'
  | 'PREPARED'
  | 'IN_SYNC'
  | 'SYNC_FAILED'
  | 'QUARANTINED';

export type QuarantineReason =
  | 'HASH_MISMATCH'
  | 'SIGNATURE_INVALID'
  | 'DELIVERY_TIMEOUT'
  | 'COMMIT_DELIVERY_EXHAUSTED'
  | 'STALE_EPOCH'
  | 'CROSS_TENANT'
  | 'STALE_HEARTBEAT'
  | 'MANIFEST_TAMPERED'
  | 'SPLIT_BRAIN';

export const ALL_QUARANTINE_REASONS: readonly QuarantineReason[] = Object.freeze([
  'HASH_MISMATCH',
  'SIGNATURE_INVALID',
  'DELIVERY_TIMEOUT',
  'COMMIT_DELIVERY_EXHAUSTED',
  'STALE_EPOCH',
  'CROSS_TENANT',
  'STALE_HEARTBEAT',
  'MANIFEST_TAMPERED',
  'SPLIT_BRAIN',
]);

export type FleetConvergenceStatus =
  | 'NO_NODES_REGISTERED'
  | 'NOT_READY'
  | 'CONVERGING'
  | 'CONVERGED'
  | 'DIVERGED'
  | 'BLOCKED';

export type EpochDecisionState =
  | 'PREPARED'
  | 'COMMIT_DURABLE'
  | 'COMMIT_DELIVERY'
  | 'ATTESTATION_PENDING'
  | 'CONVERGED'
  | 'DIVERGED'
  | 'RECOVERY_EXHAUSTED'
  | 'ABORTED';

export type DistributionAuditEventType =
  | 'NODE_REGISTERED'
  | 'NODE_HEARTBEAT'
  | 'MANIFEST_PACKAGED'
  | 'PREPARE_DELIVERED'
  | 'DELIVERY_FAILED'
  | 'RECEIPT_ACCEPTED'
  | 'RECEIPT_REJECTED'
  | 'NONCE_REPLAY_REJECTED'
  | 'CONVERGENCE_EVALUATED'
  | 'EPOCH_PREPARED'
  | 'EPOCH_COMMIT_DURABLE'
  | 'EPOCH_COMMIT_DELIVERY'
  | 'EPOCH_CONVERGED'
  | 'EPOCH_DIVERGED'
  | 'EPOCH_RECOVERY_EXHAUSTED'
  | 'EPOCH_ABORTED'
  | 'SPLIT_BRAIN_DETECTED'
  | 'NODE_QUARANTINED'
  | 'NODE_QUARANTINE_RELEASED'
  | 'QUARANTINE_PUBLICATION_FAILED'
  | 'TENANT_ACCESS_REJECTED'
  | 'EMERGENCY_STOP_BLOCKED'
  | 'LOCK_TIMEOUT'
  | 'PERSISTENCE_CORRUPTION'
  | 'LEDGER_VERIFIED';

export const ALL_DISTRIBUTION_AUDIT_EVENT_TYPES: readonly DistributionAuditEventType[] = Object.freeze([
  'NODE_REGISTERED',
  'NODE_HEARTBEAT',
  'MANIFEST_PACKAGED',
  'PREPARE_DELIVERED',
  'DELIVERY_FAILED',
  'RECEIPT_ACCEPTED',
  'RECEIPT_REJECTED',
  'NONCE_REPLAY_REJECTED',
  'CONVERGENCE_EVALUATED',
  'EPOCH_PREPARED',
  'EPOCH_COMMIT_DURABLE',
  'EPOCH_COMMIT_DELIVERY',
  'EPOCH_CONVERGED',
  'EPOCH_DIVERGED',
  'EPOCH_RECOVERY_EXHAUSTED',
  'EPOCH_ABORTED',
  'SPLIT_BRAIN_DETECTED',
  'NODE_QUARANTINED',
  'NODE_QUARANTINE_RELEASED',
  'QUARANTINE_PUBLICATION_FAILED',
  'TENANT_ACCESS_REJECTED',
  'EMERGENCY_STOP_BLOCKED',
  'LOCK_TIMEOUT',
  'PERSISTENCE_CORRUPTION',
  'LEDGER_VERIFIED',
]);

export const GOVERNED_POLICY_DISTRIBUTION_INVARIANTS = Object.freeze({
  DISTRIBUTION_NOT_RATIFICATION: true,
  DISTRIBUTION_NOT_AUTHORIZATION: true,
  ATTESTATION_NOT_POLICY_AUTHORITY: true,
  CONVERGENCE_SCORE_NOT_AUTHORIZATION: true,
  MANIFEST_HASH_NOT_AUTHORIZATION: true,
  QUARANTINE_NOT_POLICY_RATIFICATION: true,
  QUARANTINE_NOT_POLICY_AUTHORIZATION: true,
  QUARANTINE_NOT_POLICY_MUTATION: true,
  EPOCH_COMMIT_NOT_LIFECYCLE_AUTHORITY: true,
  SOLE_HUMAN_AUTHORITY: true,
  EMERGENCY_STOP_DOMINATES: true,
  TENANT_BOUNDARY_STRICT: true,
  EXECUTION_FIREWALL_STRICT: true,
});

// ============================================================================
// 3. DATA CONTRACTS & INTERFACES
// ============================================================================
export interface FleetNodeRecord {
  nodeId: FleetNodeId;
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  assignedCanaryRing: CanaryRing;
  currentEpoch: number;
  currentPolicyVersion: number;
  currentPolicyHash: string;
  syncStatus: NodeSyncStatus;
  quarantined: boolean;
  lastHeartbeatAt: number;
  lastAttestationAt?: number;
  registeredAt: number;
}

export interface FleetConvergenceReport {
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  manifestId: DistributionManifestId;
  epoch: number;
  targetCanaryRing: CanaryRing;
  totalNodes: number;
  synchronizedNodes: number;
  pendingNodes: number;
  failedNodes: number;
  quarantinedNodes: number;
  convergenceRatio: number;
  status: FleetConvergenceStatus;
  isCommitEligible: boolean;
  evaluatedAt: number;
}

export interface PolicyDistributionManifest {
  manifestId: DistributionManifestId;
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  policyId: string;
  policyVersion: number;
  parentPolicyVersion: number;
  canonicalPolicyHash: string;
  ratificationId: string;
  lifecycleRecordId: string;
  lifecycleState: 'STAGED' | 'ACTIVE' | 'DEGRADED';
  lifecycleVersion: number;
  targetEpoch: number;
  targetCanaryRing: CanaryRing;
  compiledRules: Record<string, CanonicalPolicyRule>;
  distributionNonce: string;
  issuedAt: number;
  expiresAt: number;
  manifestFingerprint: string;
}

export interface NodePolicyAttestationReceipt {
  attestationId: NodeAttestationId;
  nodeId: FleetNodeId;
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  manifestId: DistributionManifestId;
  manifestFingerprint: string;
  canonicalPolicyHash: string;
  policyVersion: number;
  epoch: number;
  pepBindingHash: string;
  distributionNonce: string;
  receiptNonce: string;
  status: 'PREPARED' | 'COMMITTED';
  keyId: string;
  timestamp: number;
  proof: string;
}

export interface NodeQuarantineRecord {
  quarantineId: NodeQuarantineId;
  nodeId: FleetNodeId;
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  reason: QuarantineReason;
  evidenceHash: string;
  epoch: number;
  quarantinedAt: number;
  releasedAt?: number;
  releaseReceiptId?: NodeAttestationId;
}

export interface NodeRef {
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  nodeId: FleetNodeId;
}

export interface DeliveryBatchResult {
  manifestId: DistributionManifestId;
  epoch: number;
  messageType: 'PREPARE' | 'COMMIT' | 'ABORT';
  acceptedNodeIds: readonly FleetNodeId[];
  failedNodeIds: readonly FleetNodeId[];
  completedAt: number;
}

export interface VerifiedReceipt {
  receipt: NodePolicyAttestationReceipt;
  verifiedAt: number;
}

export interface EpochDecision {
  decisionId: string;
  tenantId: string;
  policyDomain: PolicyDomain;
  manifestId: DistributionManifestId;
  epoch: number;
  state: EpochDecisionState;
  reason?: string;
  preparedAt: number;
  commitAt?: number;
  terminalAt?: number;
}

export type DistributionAuditScalar = null | boolean | number | string;
export type DistributionAuditData =
  | DistributionAuditScalar
  | readonly DistributionAuditData[]
  | { readonly [key: string]: DistributionAuditData };

export interface DistributionAuditEventInput {
  eventType: DistributionAuditEventType;
  tenantId: string;
  policyDomain: PolicyDomain;
  actorSource: 'SYSTEM' | 'TRANSPORT_ADAPTER' | `NODE:${FleetNodeId}`;
  data: DistributionAuditData;
}

export interface DistributionAuditRecord {
  eventId: DistributionAuditRecordId;
  eventType: DistributionAuditEventType;
  timestamp: number;
  tenantId: string;
  policyDomain: PolicyDomain;
  actorSource: string;
  previousHash: string;
  eventHash: string;
  data: DistributionAuditData;
}

export interface LedgerVerificationResult {
  valid: boolean;
  verifiedEventCount: number;
  headHash: string;
}

export interface DistributionPipelineInput {
  manifest: PolicyDistributionManifest;
}

export interface DistributionPipelineResult {
  manifestId: DistributionManifestId;
  epochDecision: EpochDecision;
  convergence: FleetConvergenceReport;
  delivery: DeliveryBatchResult;
}

export interface QuarantineInput extends NodeRef {
  reason: QuarantineReason;
  evidenceHash: string;
  epoch: number;
}

export type DistributionTransportMessage =
  | { messageType: 'PREPARE'; nodeId: FleetNodeId; manifest: PolicyDistributionManifest }
  | { messageType: 'COMMIT'; nodeId: FleetNodeId; manifestId: DistributionManifestId; targetEpoch: number; decisionId: string; commitAt: number }
  | { messageType: 'ABORT'; nodeId: FleetNodeId; manifestId: DistributionManifestId; targetEpoch: number; decisionId: string; reason: string };

export interface DeliveryAck {
  nodeId: FleetNodeId;
  tenantId: string;
  federationId: string;
  manifestId: DistributionManifestId;
  epoch: number;
  messageType: 'PREPARE' | 'COMMIT' | 'ABORT';
  accepted: boolean;
}

export interface PolicyDistributionTransportAdapter {
  deliver(message: DistributionTransportMessage, deadlineMs: number): Promise<DeliveryAck>;
}

export interface Clock {
  nowMs(): number;
}

export interface UuidV4Generator {
  next(): string;
}

export interface NodeAttestationKeyResolver {
  resolve(tenantId: string, federationId: string, nodeId: FleetNodeId, keyId: string): Uint8Array | undefined;
}

export interface DistributionControlKeyResolver {
  resolve(tenantId: string, federationId: string, nodeId: FleetNodeId, keyId: string): Uint8Array | undefined;
}

export interface QuarantinePublicationRequest {
  requestId: string;
  tenantId: string;
  federationId: string;
  nodeId: FleetNodeId;
  policyDomain: PolicyDomain;
  policyVersion: number;
  canonicalPolicyHash: string;
  reason: QuarantineReason;
  evidenceFingerprint: string;
  quarantineEpoch: number;
  issuedAt: number;
  nonce: string;
  keyId: string;
  proof: string;
}

export interface QuarantinePublicationAck {
  requestId: string;
  status: 'ACK_SUCCESS' | 'ACK_REJECTED' | 'ACK_INVALID';
  nodeId: FleetNodeId;
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  quarantineEpoch: number;
  timestamp: number;
  keyId: string;
  proof: string;
}

export interface PolicyQuarantinePublicationAdapter {
  publish(request: QuarantinePublicationRequest, deadlineMs: number): Promise<QuarantinePublicationAck>;
}

export type EmergencyStopProvider =
  | (() => boolean)
  | { isEmergencyStopActive(): boolean };

// ============================================================================
// 4. CONSTANTS & INVARIANTS
// ============================================================================
export const GENESIS_DISTRIBUTION_HASH = '0'.repeat(64);
export const HEARTBEAT_STALE_THRESHOLD_MS = 15000;
export const PREPARE_DEADLINE_MS = 5000;
export const COMMIT_RETRY_INTERVAL_MS = 1000;
export const COMMIT_RETRY_TIMEOUT_MS = 30000;
export const MAX_COMMIT_RETRIES = 30;
export const QUARANTINE_ADAPTER_RETRY_INTERVAL_MS = 1000;
export const MAX_QUARANTINE_ADAPTER_RETRIES = 5;
export const LOCK_TIMEOUT_MS = 5000;

export const CANARY_THRESHOLDS: Record<CanaryRing, number> = Object.freeze({
  0: 0.80,
  1: 0.90,
  2: 0.95,
  3: 0.95,
  4: 0.99,
});

export const GOVERNED_DISTRIBUTION_INVARIANTS = Object.freeze({
  SOLE_HUMAN_AUTHORITY: true,
  DISTRIBUTION_NOT_EQUAL_RATIFICATION: true,
  DISTRIBUTION_NOT_EQUAL_AUTHORIZATION: true,
  ATTESTATION_NOT_EQUAL_POLICY_AUTHORITY: true,
  CONVERGENCE_SCORE_NOT_EQUAL_AUTHORIZATION: true,
  MANIFEST_HASH_NOT_EQUAL_AUTHORIZATION: true,
  QUARANTINE_NOT_EQUAL_RATIFICATION: true,
  QUARANTINE_NOT_EQUAL_POLICY_AUTHORIZATION: true,
  QUARANTINE_NOT_EQUAL_POLICY_MUTATION: true,
  EPOCH_COMMIT_NOT_EQUAL_LIFECYCLE_AUTHORITY: true,
});

// ============================================================================
// 5. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyDistributionBaseError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DistributionValidationError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_VALIDATION_ERROR'); }
}
export class DistributionTenantIsolationError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_TENANT_ISOLATION_ERROR'); }
}
export class DistributionManifestValidationError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_MANIFEST_VALIDATION_ERROR'); }
}
export class DistributionCanonicalizationError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_CANONICALIZATION_ERROR'); }
}
export class DistributionTransportError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_TRANSPORT_ERROR'); }
}
export class DistributionTimeoutError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_TIMEOUT_ERROR'); }
}
export class DistributionAttestationVerificationError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_ATTESTATION_VERIFICATION_ERROR'); }
}
export class DistributionNonceReplayError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_NONCE_REPLAY_ERROR'); }
}
export class DistributionConvergenceError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_CONVERGENCE_ERROR'); }
}
export class DistributionEpochConflictError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_EPOCH_CONFLICT_ERROR'); }
}
export class DistributionQuarantineError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_QUARANTINE_ERROR'); }
}
export class DistributionQuarantinePublicationError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_QUARANTINE_PUBLICATION_ERROR'); }
}
export class DistributionEmergencyStopActiveError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_EMERGENCY_STOP_ACTIVE_ERROR'); }
}
export class DistributionLockTimeoutError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_LOCK_TIMEOUT_ERROR'); }
}
export class DistributionPersistenceCorruptionError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_PERSISTENCE_CORRUPTION_ERROR'); }
}
export class DistributionLedgerIntegrityError extends GovernedPolicyDistributionBaseError {
  constructor(message: string) { super(message, 'DISTRIBUTION_LEDGER_INTEGRITY_ERROR'); }
}

// ============================================================================
// 6. IDENTIFIER & DOMAIN SANITIZATION
// ============================================================================
const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const VALID_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const VALID_POLICY_DOMAINS = new Set<PolicyDomain>([
  'LEASE',
  'CONVERGENCE',
  'FEDERATION',
  'SECURITY',
  'RESOURCE',
  'AUDIT',
]);

export function assertValidIdentifier(id: string, fieldName: string): string {
  if (typeof id !== 'string' || !VALID_IDENTIFIER_PATTERN.test(id)) {
    throw new DistributionValidationError(`Invalid ${fieldName}: must match ^[A-Za-z0-9_-]{1,64}$`);
  }
  if (RESERVED_WINDOWS_NAMES.test(id)) {
    throw new DistributionValidationError(`Invalid ${fieldName}: reserved device name forbidden (${id})`);
  }
  if (id.includes('..') || id.includes('/') || id.includes('\\') || id.includes('\0')) {
    throw new DistributionValidationError(`Invalid ${fieldName}: path traversal or null byte forbidden`);
  }
  return id;
}

export function assertValidDomain(domain: string): PolicyDomain {
  if (!domain || !VALID_POLICY_DOMAINS.has(domain as PolicyDomain)) {
    throw new DistributionValidationError(`Invalid policyDomain: ${domain}`);
  }
  return domain as PolicyDomain;
}

export function assertValidHash(hash: string, fieldName: string): string {
  if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
    throw new DistributionValidationError(`Invalid ${fieldName}: must be 64 lowercase hexadecimal characters`);
  }
  return hash;
}

export function assertValidNonce(nonce: string, fieldName: string): string {
  if (typeof nonce !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)) {
    throw new DistributionValidationError(`Invalid ${fieldName}: must be a valid UUIDv4 string`);
  }
  return nonce.toLowerCase();
}

export function assertEmergencyStopInactive(provider?: EmergencyStopProvider): void {
  if (!provider) {
    throw new DistributionEmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
  }
  let active: unknown;
  try {
    if (typeof provider === 'function') {
      active = provider();
    } else if (typeof provider === 'object' && typeof provider.isEmergencyStopActive === 'function') {
      active = provider.isEmergencyStopActive();
    } else {
      throw new Error('Invalid emergency stop provider');
    }
  } catch (err) {
    throw new DistributionEmergencyStopActiveError(
      `Emergency stop provider threw: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (typeof active !== 'boolean' || active !== false) {
    throw new DistributionEmergencyStopActiveError('Emergency stop is active or non-boolean (fail-closed)');
  }
}

// ============================================================================
// 7. DETERMINISTIC CANONICAL JSON & CRYPTOGRAPHIC HELPERS
// ============================================================================

/**
 * Deterministic Canonical JSON according to MS-1.5.25 specification.
 * - Accepts null, booleans, finite numbers, NFC-normalized strings, arrays, plain objects.
 * - Rejects undefined, Symbol, Function, BigInt, Date, Map, Set, Buffer, NaN, Infinity.
 * - UTF-8 without BOM, no whitespace.
 * - Keys sort by UTF-16 code unit sequence.
 * - Numbers serialized via ECMAScript 2023 ToString (-0 -> 0).
 */
export function canonicalJson(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new DistributionCanonicalizationError('Non-finite number cannot be canonicalized');
    }
    if (Object.is(value, -0) || value === 0) {
      return '0';
    }
    // ECMAScript 2023 ToString
    return String(value);
  }

  if (typeof value === 'string') {
    return serializeCanonicalString(value);
  }

  if (Array.isArray(value)) {
    const serializedElements = value.map(elem => {
      if (elem === undefined || typeof elem === 'function' || typeof elem === 'symbol') {
        throw new DistributionCanonicalizationError('Unsupported element in array');
      }
      return canonicalJson(elem);
    });
    return '[' + serializedElements.join(',') + ']';
  }

  if (typeof value === 'object') {
    // Reject non-plain objects: Buffer, Uint8Array, Date, RegExp, Map, Set, etc.
    if (
      value instanceof Date ||
      value instanceof RegExp ||
      value instanceof Map ||
      value instanceof Set ||
      ArrayBuffer.isView(value) ||
      value.constructor !== Object && Object.getPrototypeOf(value) !== null
    ) {
      throw new DistributionCanonicalizationError('Non-plain object cannot be canonicalized');
    }

    const obj = value as Record<string, unknown>;
    const rawKeys = Object.keys(obj);
    const normalizedKeysMap = new Map<string, string>(); // normalizedKey -> originalKey

    for (const key of rawKeys) {
      const normKey = key.normalize('NFC');
      if (normalizedKeysMap.has(normKey)) {
        throw new DistributionCanonicalizationError(`NFC key collision detected: ${normKey}`);
      }
      normalizedKeysMap.set(normKey, key);
    }

    // Sort keys by UTF-16 code-unit sequence
    const sortedNormKeys = Array.from(normalizedKeysMap.keys()).sort((a, b) => {
      const len = Math.min(a.length, b.length);
      for (let i = 0; i < len; i++) {
        const codeA = a.charCodeAt(i);
        const codeB = b.charCodeAt(i);
        if (codeA !== codeB) return codeA - codeB;
      }
      return a.length - b.length;
    });

    const entries: string[] = [];
    for (const normKey of sortedNormKeys) {
      const originalKey = normalizedKeysMap.get(normKey)!;
      const val = obj[originalKey];
      if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
        throw new DistributionCanonicalizationError(`Unsupported value for key: ${originalKey}`);
      }
      entries.push(`${serializeCanonicalString(normKey)}:${canonicalJson(val)}`);
    }

    return '{' + entries.join(',') + '}';
  }

  throw new DistributionCanonicalizationError(`Unsupported type for canonicalJson: ${typeof value}`);
}

function serializeCanonicalString(str: string): string {
  // Check for unpaired surrogates
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      // High surrogate
      if (i + 1 >= str.length) {
        throw new DistributionCanonicalizationError('Unpaired high surrogate in string');
      }
      const next = str.charCodeAt(i + 1);
      if (next < 0xdc00 || next > 0xdfff) {
        throw new DistributionCanonicalizationError('Unpaired high surrogate in string');
      }
      i++; // Skip low surrogate
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      throw new DistributionCanonicalizationError('Unpaired low surrogate in string');
    }
  }

  const normalized = str.normalize('NFC');
  let result = '"';

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const code = normalized.charCodeAt(i);

    if (char === '"') {
      result += '\\"';
    } else if (char === '\\') {
      result += '\\\\';
    } else if (char === '\b') {
      result += '\\b';
    } else if (char === '\t') {
      result += '\\t';
    } else if (char === '\n') {
      result += '\\n';
    } else if (char === '\f') {
      result += '\\f';
    } else if (char === '\r') {
      result += '\\r';
    } else if (code <= 0x001f) {
      result += '\\u00' + code.toString(16).padStart(2, '0');
    } else if (code === 0x2028) {
      result += '\\u2028';
    } else if (code === 0x2029) {
      result += '\\u2029';
    } else {
      result += char;
    }
  }

  result += '"';
  return result;
}

export function sha256(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function hmacSha256(key: Uint8Array | string, data: string | Uint8Array): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  return timingSafeEqual(bufA, bufB);
}

// MS-1.5.20 upstream canonicalizer for policy hash
function ms120CanonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(ms120CanonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + ms120CanonicalizeJson(obj[k])).join(',') + '}';
}

export function ms120CanonicalPolicyHash(policy: any): string {
  const meta = policy.metadata || policy;
  const normalized = {
    policyId: meta.policyId,
    tenantId: meta.tenantId,
    policyDomain: meta.policyDomain,
    policyVersion: meta.policyVersion,
    parentVersion: meta.parentVersion || 0,
    rules: policy.rules,
  };
  return createHash('sha256').update(ms120CanonicalizeJson(normalized)).digest('hex');
}

export function computeManifestFingerprint(manifest: Omit<PolicyDistributionManifest, 'manifestFingerprint'>): string {
  return sha256(canonicalJson(manifest));
}

export function computePepBindingHash(bindings: {
  nodeId: FleetNodeId;
  tenantId: string;
  federationId: string;
  policyDomain: PolicyDomain;
  manifestId: DistributionManifestId;
  canonicalPolicyHash: string;
  policyVersion: number;
  epoch: number;
}): string {
  return sha256(canonicalJson(bindings));
}

export function computeReceiptProofPayload(receipt: Omit<NodePolicyAttestationReceipt, 'proof'>): string {
  return canonicalJson({
    attestationId: receipt.attestationId,
    nodeId: receipt.nodeId,
    tenantId: receipt.tenantId,
    federationId: receipt.federationId,
    policyDomain: receipt.policyDomain,
    manifestId: receipt.manifestId,
    manifestFingerprint: receipt.manifestFingerprint,
    canonicalPolicyHash: receipt.canonicalPolicyHash,
    policyVersion: receipt.policyVersion,
    epoch: receipt.epoch,
    pepBindingHash: receipt.pepBindingHash,
    distributionNonce: receipt.distributionNonce,
    receiptNonce: receipt.receiptNonce,
    status: receipt.status,
    keyId: receipt.keyId,
    timestamp: receipt.timestamp,
  });
}

export function computeQuarantineRequestProofPayload(req: Omit<QuarantinePublicationRequest, 'proof'>): string {
  return canonicalJson({
    requestId: req.requestId,
    tenantId: req.tenantId,
    federationId: req.federationId,
    nodeId: req.nodeId,
    policyDomain: req.policyDomain,
    policyVersion: req.policyVersion,
    canonicalPolicyHash: req.canonicalPolicyHash,
    reason: req.reason,
    evidenceFingerprint: req.evidenceFingerprint,
    quarantineEpoch: req.quarantineEpoch,
    issuedAt: req.issuedAt,
    nonce: req.nonce,
    keyId: req.keyId,
  });
}

export function computeQuarantineAckProofPayload(ack: Omit<QuarantinePublicationAck, 'proof'>): string {
  return canonicalJson({
    requestId: ack.requestId,
    status: ack.status,
    nodeId: ack.nodeId,
    tenantId: ack.tenantId,
    federationId: ack.federationId,
    policyDomain: ack.policyDomain,
    quarantineEpoch: ack.quarantineEpoch,
    timestamp: ack.timestamp,
    keyId: ack.keyId,
  });
}

export function computeEventHash(previousHash: string, payload: Omit<DistributionAuditRecord, 'eventHash' | 'previousHash'>): string {
  return sha256(previousHash + canonicalJson(payload));
}

export const computeAuditEventHash = computeEventHash;

// ============================================================================
// 8. SECRET SCRUBBING
// ============================================================================
const SECRET_KEY_PATTERNS = [
  'authorization',
  'password',
  'passwd',
  'secret',
  'token',
  'apikey',
  'privatekey',
  'credential',
  'cookie',
  'session',
];

const BEARER_PATTERN = /bearer\s+\S+/i;
const PRIVATE_KEY_PATTERN = /-----BEGIN[^\r\n]*PRIVATE KEY-----/i;
const HMAC_SECRET_PATTERN = /BOW_GOVERNANCE_HMAC_SECRET/i;

export function scrubAuditData(data: DistributionAuditData, depth: number = 0): DistributionAuditData {
  if (depth > 16) {
    throw new DistributionValidationError('Maximum audit data depth exceeded (16)');
  }

  if (data === null || typeof data === 'boolean') {
    return data;
  }

  if (typeof data === 'number') {
    if (!Number.isFinite(data)) {
      throw new DistributionValidationError('Non-finite number in audit data');
    }
    return data;
  }

  if (typeof data === 'string') {
    const bytes = Buffer.byteLength(data, 'utf-8');
    if (bytes > 8192) {
      throw new DistributionValidationError('Audit string exceeds 8192 bytes');
    }
    if (
      BEARER_PATTERN.test(data) ||
      PRIVATE_KEY_PATTERN.test(data) ||
      HMAC_SECRET_PATTERN.test(data)
    ) {
      return '[REDACTED]';
    }
    return data.normalize('NFC');
  }

  if (Array.isArray(data)) {
    if (data.length > 100) {
      throw new DistributionValidationError('Audit array exceeds 100 members');
    }
    return data.map(item => scrubAuditData(item, depth + 1));
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    if (keys.length > 100) {
      throw new DistributionValidationError('Audit object exceeds 100 members');
    }

    const scrubbedObj: Record<string, DistributionAuditData> = {};
    for (const key of keys) {
      const normKey = key.normalize('NFC');
      const strippedKey = normKey.toLowerCase().replace(/[^a-z0-9]/g, '');

      let isSecretKey = false;
      for (const pattern of SECRET_KEY_PATTERNS) {
        if (strippedKey.includes(pattern)) {
          isSecretKey = true;
          break;
        }
      }

      if (isSecretKey) {
        scrubbedObj[normKey] = '[REDACTED]';
      } else {
        scrubbedObj[normKey] = scrubAuditData((data as Record<string, DistributionAuditData>)[key], depth + 1);
      }
    }
    return scrubbedObj;
  }

  throw new DistributionValidationError('Unsupported type in audit data');
}

export const recursivelyScrubSecrets = scrubAuditData;
