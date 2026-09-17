import type { CanonicalPolicyRule } from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';
export type FleetNodeId = string & {
    readonly __brand: unique symbol;
};
export type DistributionManifestId = string & {
    readonly __brand: unique symbol;
};
export type DistributionSessionId = string & {
    readonly __brand: unique symbol;
};
export type NodeAttestationId = string & {
    readonly __brand: unique symbol;
};
export type NodeQuarantineId = string & {
    readonly __brand: unique symbol;
};
export type PolicyEpochId = string & {
    readonly __brand: unique symbol;
};
export type DistributionAuditRecordId = string & {
    readonly __brand: unique symbol;
};
export declare function asFleetNodeId(val: string): FleetNodeId;
export declare function asDistributionManifestId(val: string): DistributionManifestId;
export declare function asDistributionSessionId(val: string): DistributionSessionId;
export declare function asNodeAttestationId(val: string): NodeAttestationId;
export declare function asNodeQuarantineId(val: string): NodeQuarantineId;
export declare function asPolicyEpochId(val: string): PolicyEpochId;
export declare function asDistributionAuditRecordId(val: string): DistributionAuditRecordId;
export type PolicyDomain = 'LEASE' | 'CONVERGENCE' | 'FEDERATION' | 'SECURITY' | 'RESOURCE' | 'AUDIT';
export declare const ALL_POLICY_DOMAINS: readonly PolicyDomain[];
export type CanaryRing = 0 | 1 | 2 | 3 | 4;
export type NodeSyncStatus = 'INITIALIZING' | 'SYNC_PENDING' | 'PREPARED' | 'IN_SYNC' | 'SYNC_FAILED' | 'QUARANTINED';
export type QuarantineReason = 'HASH_MISMATCH' | 'SIGNATURE_INVALID' | 'DELIVERY_TIMEOUT' | 'COMMIT_DELIVERY_EXHAUSTED' | 'STALE_EPOCH' | 'CROSS_TENANT' | 'STALE_HEARTBEAT' | 'MANIFEST_TAMPERED' | 'SPLIT_BRAIN';
export declare const ALL_QUARANTINE_REASONS: readonly QuarantineReason[];
export type FleetConvergenceStatus = 'NO_NODES_REGISTERED' | 'NOT_READY' | 'CONVERGING' | 'CONVERGED' | 'DIVERGED' | 'BLOCKED';
export type EpochDecisionState = 'PREPARED' | 'COMMIT_DURABLE' | 'COMMIT_DELIVERY' | 'ATTESTATION_PENDING' | 'CONVERGED' | 'DIVERGED' | 'RECOVERY_EXHAUSTED' | 'ABORTED';
export type DistributionAuditEventType = 'NODE_REGISTERED' | 'NODE_HEARTBEAT' | 'MANIFEST_PACKAGED' | 'PREPARE_DELIVERED' | 'DELIVERY_FAILED' | 'RECEIPT_ACCEPTED' | 'RECEIPT_REJECTED' | 'NONCE_REPLAY_REJECTED' | 'CONVERGENCE_EVALUATED' | 'EPOCH_PREPARED' | 'EPOCH_COMMIT_DURABLE' | 'EPOCH_COMMIT_DELIVERY' | 'EPOCH_CONVERGED' | 'EPOCH_DIVERGED' | 'EPOCH_RECOVERY_EXHAUSTED' | 'EPOCH_ABORTED' | 'SPLIT_BRAIN_DETECTED' | 'NODE_QUARANTINED' | 'NODE_QUARANTINE_RELEASED' | 'QUARANTINE_PUBLICATION_FAILED' | 'TENANT_ACCESS_REJECTED' | 'EMERGENCY_STOP_BLOCKED' | 'LOCK_TIMEOUT' | 'PERSISTENCE_CORRUPTION' | 'LEDGER_VERIFIED';
export declare const ALL_DISTRIBUTION_AUDIT_EVENT_TYPES: readonly DistributionAuditEventType[];
export declare const GOVERNED_POLICY_DISTRIBUTION_INVARIANTS: Readonly<{
    DISTRIBUTION_NOT_RATIFICATION: true;
    DISTRIBUTION_NOT_AUTHORIZATION: true;
    ATTESTATION_NOT_POLICY_AUTHORITY: true;
    CONVERGENCE_SCORE_NOT_AUTHORIZATION: true;
    MANIFEST_HASH_NOT_AUTHORIZATION: true;
    QUARANTINE_NOT_POLICY_RATIFICATION: true;
    QUARANTINE_NOT_POLICY_AUTHORIZATION: true;
    QUARANTINE_NOT_POLICY_MUTATION: true;
    EPOCH_COMMIT_NOT_LIFECYCLE_AUTHORITY: true;
    SOLE_HUMAN_AUTHORITY: true;
    EMERGENCY_STOP_DOMINATES: true;
    TENANT_BOUNDARY_STRICT: true;
    EXECUTION_FIREWALL_STRICT: true;
}>;
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
export type DistributionAuditData = DistributionAuditScalar | readonly DistributionAuditData[] | {
    readonly [key: string]: DistributionAuditData;
};
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
export type DistributionTransportMessage = {
    messageType: 'PREPARE';
    nodeId: FleetNodeId;
    manifest: PolicyDistributionManifest;
} | {
    messageType: 'COMMIT';
    nodeId: FleetNodeId;
    manifestId: DistributionManifestId;
    targetEpoch: number;
    decisionId: string;
    commitAt: number;
} | {
    messageType: 'ABORT';
    nodeId: FleetNodeId;
    manifestId: DistributionManifestId;
    targetEpoch: number;
    decisionId: string;
    reason: string;
};
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
export type EmergencyStopProvider = (() => boolean) | {
    isEmergencyStopActive(): boolean;
};
export declare const GENESIS_DISTRIBUTION_HASH: string;
export declare const HEARTBEAT_STALE_THRESHOLD_MS = 15000;
export declare const PREPARE_DEADLINE_MS = 5000;
export declare const COMMIT_RETRY_INTERVAL_MS = 1000;
export declare const COMMIT_RETRY_TIMEOUT_MS = 30000;
export declare const MAX_COMMIT_RETRIES = 30;
export declare const QUARANTINE_ADAPTER_RETRY_INTERVAL_MS = 1000;
export declare const MAX_QUARANTINE_ADAPTER_RETRIES = 5;
export declare const LOCK_TIMEOUT_MS = 5000;
export declare const CANARY_THRESHOLDS: Record<CanaryRing, number>;
export declare const GOVERNED_DISTRIBUTION_INVARIANTS: Readonly<{
    SOLE_HUMAN_AUTHORITY: true;
    DISTRIBUTION_NOT_EQUAL_RATIFICATION: true;
    DISTRIBUTION_NOT_EQUAL_AUTHORIZATION: true;
    ATTESTATION_NOT_EQUAL_POLICY_AUTHORITY: true;
    CONVERGENCE_SCORE_NOT_EQUAL_AUTHORIZATION: true;
    MANIFEST_HASH_NOT_EQUAL_AUTHORIZATION: true;
    QUARANTINE_NOT_EQUAL_RATIFICATION: true;
    QUARANTINE_NOT_EQUAL_POLICY_AUTHORIZATION: true;
    QUARANTINE_NOT_EQUAL_POLICY_MUTATION: true;
    EPOCH_COMMIT_NOT_EQUAL_LIFECYCLE_AUTHORITY: true;
}>;
export declare class GovernedPolicyDistributionBaseError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class DistributionValidationError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionTenantIsolationError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionManifestValidationError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionCanonicalizationError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionTransportError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionTimeoutError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionAttestationVerificationError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionNonceReplayError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionConvergenceError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionEpochConflictError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionQuarantineError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionQuarantinePublicationError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionEmergencyStopActiveError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionLockTimeoutError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionPersistenceCorruptionError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare class DistributionLedgerIntegrityError extends GovernedPolicyDistributionBaseError {
    constructor(message: string);
}
export declare function assertValidIdentifier(id: string, fieldName: string): string;
export declare function assertValidDomain(domain: string): PolicyDomain;
export declare function assertValidHash(hash: string, fieldName: string): string;
export declare function assertValidNonce(nonce: string, fieldName: string): string;
export declare function assertEmergencyStopInactive(provider?: EmergencyStopProvider): void;
/**
 * Deterministic Canonical JSON according to MS-1.5.25 specification.
 * - Accepts null, booleans, finite numbers, NFC-normalized strings, arrays, plain objects.
 * - Rejects undefined, Symbol, Function, BigInt, Date, Map, Set, Buffer, NaN, Infinity.
 * - UTF-8 without BOM, no whitespace.
 * - Keys sort by UTF-16 code unit sequence.
 * - Numbers serialized via ECMAScript 2023 ToString (-0 -> 0).
 */
export declare function canonicalJson(value: unknown): string;
export declare function sha256(data: string | Uint8Array): string;
export declare function hmacSha256(key: Uint8Array | string, data: string | Uint8Array): string;
export declare function timingSafeEqualHex(a: string, b: string): boolean;
export declare function ms120CanonicalPolicyHash(policy: any): string;
export declare function computeManifestFingerprint(manifest: Omit<PolicyDistributionManifest, 'manifestFingerprint'>): string;
export declare function computePepBindingHash(bindings: {
    nodeId: FleetNodeId;
    tenantId: string;
    federationId: string;
    policyDomain: PolicyDomain;
    manifestId: DistributionManifestId;
    canonicalPolicyHash: string;
    policyVersion: number;
    epoch: number;
}): string;
export declare function computeReceiptProofPayload(receipt: Omit<NodePolicyAttestationReceipt, 'proof'>): string;
export declare function computeQuarantineRequestProofPayload(req: Omit<QuarantinePublicationRequest, 'proof'>): string;
export declare function computeQuarantineAckProofPayload(ack: Omit<QuarantinePublicationAck, 'proof'>): string;
export declare function computeEventHash(previousHash: string, payload: Omit<DistributionAuditRecord, 'eventHash' | 'previousHash'>): string;
export declare const computeAuditEventHash: typeof computeEventHash;
export declare function scrubAuditData(data: DistributionAuditData, depth?: number): DistributionAuditData;
export declare const recursivelyScrubSecrets: typeof scrubAuditData;
