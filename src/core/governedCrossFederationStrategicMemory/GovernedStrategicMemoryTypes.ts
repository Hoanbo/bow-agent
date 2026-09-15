// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1148: GovernedStrategicMemoryTypes
// Canonical Strategic Memory Contracts, Ontology, Drift, & Provenance Hashers
// ============================================================================

import * as crypto from 'crypto';

// EN: Mandatory governance invariants asserting that cognition and memory do not equal execution authority.
// VI: Các bất biến quản trị bắt buộc khẳng định rằng nhận thức và bộ nhớ không đồng nghĩa với quyền thực thi.
export const STRATEGIC_MEMORY_GOVERNANCE_INVARIANTS = {
  AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: 'AGENT_CAPABILITY != HUMAN_AUTHORITY',
  KNOWLEDGE_NOT_AUTHORIZATION: 'KNOWLEDGE != AUTHORIZATION',
  CONSENSUS_NOT_AUTHORIZATION: 'CONSENSUS != AUTHORIZATION',
  CONFIDENCE_NOT_AUTHORITY: 'CONFIDENCE != AUTHORITY',
  AGREEMENT_NOT_HUMAN_APPROVAL: 'AGREEMENT != HUMAN_APPROVAL',
  STATE_NOT_PRIVILEGE: 'STATE != PRIVILEGE',
  PERSISTENCE_NOT_EXECUTION: 'PERSISTENCE != EXECUTION',
  STRATEGIC_MEMORY_NOT_EXECUTION_PERMISSION: 'STRATEGIC_MEMORY != EXECUTION_PERMISSION',
  LEARNED_POLICY_NOT_AUTHORIZATION: 'LEARNED_POLICY != AUTHORIZATION',
  COLLECTIVE_INTELLIGENCE_NOT_HUMAN_GOVERNANCE: 'COLLECTIVE_INTELLIGENCE != HUMAN_GOVERNANCE',
  MS_1518_NOT_AUTONOMY_LEASE_AUTHORITY: 'MS-1.5.18 != AUTONOMY_LEASE_AUTHORITY',
  MS_1518_NOT_DIRECT_EXECUTION: 'MS-1.5.18 != DIRECT_EXECUTION',
} as const;

// EN: Strict hard ceilings to guarantee bounded CPU, memory, and storage footprints.
// VI: Các giới hạn trần cứng nghiêm ngặt để đảm bảo giới hạn sử dụng CPU, bộ nhớ và lưu trữ.
export const MAX_STRATEGIC_MEMORY_RECORDS_PER_TENANT = 1000;
export const MAX_ACTIVE_INSTITUTIONAL_SESSIONS = 3;
export const MAX_RETRIEVAL_RESULTS_PER_QUERY = 20;
export const MAX_LINEAGE_DEPTH = 10;
export const MAX_SYNTHESIS_RECORDS_PER_ROUND = 50;
export const MAX_META_LEARNING_ROUNDS_PER_SESSION = 5;
export const MAX_STRATEGIC_MEMORY_SIZE_BYTES = 10485760; // 10 MB
export const MAX_CONCURRENT_RETRIEVAL_OPERATIONS = 5;
export const MAX_CONSECUTIVE_DRIFT_FAILURES = 3;
export const MAX_SESSION_DURATION_MS = 86400000; // 24 hours
export const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;

// EN: Canonical 14-state lifecycle model plus terminal error/interlock states (17 total names).
// VI: Mô hình vòng đời 14 trạng thái chuẩn tắc cộng thêm các trạng thái kết thúc/khoá an toàn (tổng cộng 17 tên).
export type StrategicMemoryLifecycleStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'ADMITTED'
  | 'INDEXING'
  | 'INDEXED'
  | 'SYNTHESIZING'
  | 'RETRIEVING'
  | 'META_LEARNING'
  | 'DRIFT_ANALYSIS'
  | 'REVIEW_REQUIRED'
  | 'STABLE'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'INVALIDATED'
  | 'FAILED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP';

export const TERMINAL_STRATEGIC_MEMORY_STATES = new Set<StrategicMemoryLifecycleStatus>([
  'COMPLETED',
  'INVALIDATED',
  'FAILED',
  'HALTED_BY_USER_STOP',
  'HALTED_BY_EMERGENCY_STOP',
]);

// EN: Exactly 8 canonical conflict categories for institutional strategic memory.
// VI: Đúng 8 phân loại xung đột chuẩn mực cho bộ nhớ chiến lược cấp định chế.
export type StrategicMemoryConflictCategory =
  | 'STRATEGIC_PRECEDENT_CONFLICT'
  | 'POLICY_ALIGNMENT_CONFLICT'
  | 'LEASE_ENVELOPE_CONFLICT'
  | 'FEDERATION_SCOPE_CONFLICT'
  | 'LINEAGE_AUTHENTICITY_CONFLICT'
  | 'VERSION_CAS_CONFLICT'
  | 'META_LEARNING_CONTRADICTION'
  | 'RETENTION_EXPIRATION_CONFLICT';

// EN: Exactly 10 canonical strategic drift categories.
// VI: Đúng 10 phân loại trôi dạt chiến lược chuẩn mực.
export type StrategicDriftCategory =
  | 'STRATEGIC_GOAL_DRIFT'
  | 'POLICY_COMPLIANCE_DRIFT'
  | 'FEDERATION_TOPOLOGY_DRIFT'
  | 'LEASE_INVARIANT_DRIFT'
  | 'CONFIDENCE_DEFLATION_DRIFT'
  | 'LINEAGE_DIVERGENCE_DRIFT'
  | 'RECONCILIATION_VOLATILITY_DRIFT'
  | 'TEMPORAL_STALENESS_DRIFT'
  | 'PROVENANCE_TAMPER_DRIFT'
  | 'TENANT_BOUNDARY_DRIFT';

// EN: Drift severity classifications with strict numeric thresholds.
// VI: Phân cấp mức độ nghiêm trọng trôi dạt với ngưỡng định lượng nghiêm ngặt.
export type StrategicDriftSeverity = 'HEALTHY' | 'DEGRADED' | 'WARNING' | 'CRITICAL';

export const DRIFT_THRESHOLDS = {
  HEALTHY_MAX: 0.20,
  DEGRADED_MAX: 0.50,
  WARNING_MAX: 0.75, // Above 0.75 is CRITICAL
} as const;

// EN: Exactly 16 synchronous security checkpoints.
// VI: Đúng 16 điểm kiểm soát an ninh đồng bộ.
export type StrategicMemoryCheckpoint =
  | 'STRATEGIC_MEM_ENTRY'
  | 'PRE_RECORD_REGISTRATION'
  | 'PRE_RECORD_ADMISSION'
  | 'PRE_INDEXING_COMMIT'
  | 'PRE_RETRIEVAL_QUERY'
  | 'POST_RETRIEVAL_FILTER'
  | 'PRE_SYNTHESIS_EVALUATION'
  | 'PRE_META_LEARNING_ROUND'
  | 'POST_META_LEARNING_VERIFY'
  | 'PRE_DRIFT_ANALYSIS'
  | 'POST_DRIFT_EVALUATION'
  | 'PRE_STATE_MUTATION'
  | 'PRE_CONTINUITY_COMMIT'
  | 'PRE_PERSISTENCE'
  | 'POST_PERSISTENCE'
  | 'POST_GOVERNANCE_COMMIT';

// EN: Exactly 36 canonical audit event types.
// VI: Đúng 36 loại sự kiện kiểm toán chuẩn mực.
export type StrategicMemoryAuditEventType =
  | 'STRATEGIC_MEM_SESSION_CREATED'
  | 'STRATEGIC_MEM_SESSION_INITIALIZED'
  | 'STRATEGIC_MEM_RECORD_REGISTERED'
  | 'STRATEGIC_MEM_RECORD_ADMITTED'
  | 'STRATEGIC_MEM_RECORD_REJECTED'
  | 'STRATEGIC_MEM_INDEX_UPDATED'
  | 'STRATEGIC_MEM_INDEX_PRUNED'
  | 'STRATEGIC_MEM_RETRIEVAL_REQUESTED'
  | 'STRATEGIC_MEM_RETRIEVAL_COMPLETED'
  | 'STRATEGIC_MEM_RETRIEVAL_EMPTY'
  | 'STRATEGIC_MEM_SYNTHESIS_STARTED'
  | 'STRATEGIC_MEM_SYNTHESIS_ROUND_COMPLETED'
  | 'STRATEGIC_MEM_META_LEARNING_STARTED'
  | 'STRATEGIC_MEM_META_LEARNING_ROUND_COMPLETED'
  | 'STRATEGIC_MEM_RECOMMENDATION_GENERATED'
  | 'STRATEGIC_MEM_RECOMMENDATION_REJECTED'
  | 'STRATEGIC_MEM_DRIFT_EVALUATION_STARTED'
  | 'STRATEGIC_MEM_DRIFT_EVALUATION_COMPLETED'
  | 'STRATEGIC_MEM_DRIFT_WARNING_EMITTED'
  | 'STRATEGIC_MEM_DRIFT_CRITICAL_HALT'
  | 'STRATEGIC_MEM_CONFLICT_DETECTED'
  | 'STRATEGIC_MEM_CONFLICT_RESOLVED'
  | 'STRATEGIC_MEM_REVIEW_REQUIRED_TRIGGERED'
  | 'STRATEGIC_MEM_HUMAN_OVERRIDE_RECORDED'
  | 'STRATEGIC_MEM_RECORD_SEALED'
  | 'STRATEGIC_MEM_RECORD_EXPIRED'
  | 'STRATEGIC_MEM_RECORD_INVALIDATED'
  | 'STRATEGIC_MEM_STATE_MUTATED'
  | 'STRATEGIC_MEM_CONTINUITY_SNAPSHOT_SEALED'
  | 'STRATEGIC_MEM_OCC_CONFLICT_DETECTED'
  | 'STRATEGIC_MEM_SECURITY_VIOLATION_BLOCKED'
  | 'STRATEGIC_MEM_USER_STOP_HALTED'
  | 'STRATEGIC_MEM_EMERGENCY_STOP_HALTED'
  | 'STRATEGIC_MEM_PERSISTENCE_COMMITTED'
  | 'STRATEGIC_MEM_PERSISTENCE_RECOVERED'
  | 'STRATEGIC_MEM_SESSION_COMPLETED';

// ----------------------------------------------------------------------------
// Core Data Contracts
// ----------------------------------------------------------------------------

export interface ReconciliationPrecedentEntry {
  key: string;
  reconciledValue: unknown;
  sourceFederationIds: string[];
  reconciliationRuleIndex: number;
  timestamp: number;
}

export interface ConflictResolutionPrecedentEntry {
  conflictId: string;
  category: StrategicMemoryConflictCategory;
  resolutionStrategy: 'PRECEDENT_OVERRIDE' | 'POLICY_HARMONIZED' | 'REVIEW_REQUIRED';
  resolvedOutcome: string;
  arbitratedBy: string;
  timestamp: number;
}

export interface StrategicMemoryRecord {
  recordId: string;
  tenantId: string;
  sessionId: string;
  sourceConvergenceSessionId: string;
  sourceConvergenceResultHash: string;
  missionId: string;
  objectiveId: string;
  generation: number;
  participatingFederations: string[];
  convergedStrategyDigest: string;
  reconciliationPrecedents: ReconciliationPrecedentEntry[];
  conflictResolutions: ConflictResolutionPrecedentEntry[];
  policyMetaEvaluationDigest: string;
  confidenceScore: number;       // [0.0, 1.0] - Invariant: CONFIDENCE != AUTHORITY
  frequencyCount: number;        // Invariant: FREQUENCY != PERMISSION
  stabilityScore: number;        // [0.0, 1.0]
  creationTimestamp: number;
  lastAccessedTimestamp: number;
  retentionEpoch: number;
  isSealed: boolean;
  version: number;
  provenanceHash: string;
}

export interface StrategicIndexEntry {
  indexId: string;
  tenantId: string;
  recordId: string;
  missionId: string;
  objectiveId: string;
  participatingFederations: string[];
  keywords: string[];
  confidenceScore: number;
  creationTimestamp: number;
  entryHash: string;
}

export interface StrategicRetrievalQuery {
  queryId: string;
  tenantId: string;
  sessionId: string;
  missionId?: string;
  objectiveId?: string;
  targetFederations?: string[];
  keywords?: string[];
  minConfidence?: number;
  limit?: number;
}

export interface StrategicRetrievalResult {
  record: StrategicMemoryRecord;
  relevanceScore: number;
  retrievalTimestamp: number;
}

export interface MetaLearningRound {
  roundId: string;
  tenantId: string;
  sessionId: string;
  roundIndex: number;
  evaluatedRecordIds: string[];
  extractedPatternsCount: number;
  timestamp: number;
  roundHash: string;
}

export interface MetaLearningRecommendation {
  recommendationId: string;
  tenantId: string;
  sessionId: string;
  category: 'STRATEGY_TEMPLATE' | 'DEPENDENCY_LAYOUT' | 'CONFLICT_AVOIDANCE';
  summary: string;
  recommendedTopology: string[];
  confidenceScore: number;
  isAdvisoryOnly: true; // Invariant: ADVISORY ONLY
  humanReviewRequired: boolean;
  provenanceHash: string;
  timestamp: number;
}

export interface StrategicDriftSnapshot {
  snapshotId: string;
  tenantId: string;
  sessionId: string;
  categoryDriftScores: Record<StrategicDriftCategory, number>;
  aggregateDriftScore: number;
  severity: StrategicDriftSeverity;
  evaluatedRecordsCount: number;
  timestamp: number;
  snapshotHash: string;
}

export interface InstitutionalMemoryContinuity {
  continuityId: string;
  tenantId: string;
  sessionId: string;
  sessionEpoch: number;
  totalRecordsCount: number;
  activeDriftScore: number;
  previousContinuityHash: string;
  timestamp: number;
  continuityHash: string;
}

export interface StrategicMemoryAuditEvent {
  eventId: string;
  eventType: StrategicMemoryAuditEventType;
  timestamp: number;
  tenantId: string;
  sessionId: string;
  humanOperatorId?: string;
  missionId?: string;
  objectiveId?: string;
  federationId?: string;
  generation?: number;
  details?: Record<string, unknown>;
  previousHash: string;
  eventHash: string;
  provenanceHash: string;
}

// ----------------------------------------------------------------------------
// Typed Errors
// ----------------------------------------------------------------------------

export class GovernedStrategicMemoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'GovernedStrategicMemoryError';
  }
}

export class GovernedStrategicMemoryConcurrencyError extends GovernedStrategicMemoryError {
  constructor(message: string) {
    super(message, 'OCC_CAS_VERSION_MISMATCH');
    this.name = 'GovernedStrategicMemoryConcurrencyError';
  }
}

export class GovernedStrategicMemorySecurityError extends GovernedStrategicMemoryError {
  constructor(message: string) {
    super(message, 'SECURITY_BOUNDARY_VIOLATION');
    this.name = 'GovernedStrategicMemorySecurityError';
  }
}

export class GovernedStrategicMemoryDriftError extends GovernedStrategicMemoryError {
  constructor(message: string) {
    super(message, 'CRITICAL_STRATEGIC_DRIFT');
    this.name = 'GovernedStrategicMemoryDriftError';
  }
}

export class GovernedStrategicMemoryLifecycleError extends GovernedStrategicMemoryError {
  constructor(message: string) {
    super(message, 'ILLEGAL_LIFECYCLE_TRANSITION');
    this.name = 'GovernedStrategicMemoryLifecycleError';
  }
}

// ----------------------------------------------------------------------------
// Deterministic Serialization & SHA-256 Provenance Hashers
// ----------------------------------------------------------------------------

// EN: Deterministically serializes objects by sorting keys alphabetically, omitting transient fields.
// VI: Tuần tự hoá đối tượng một cách tất định bằng cách sắp xếp khoá theo alphabet, loại bỏ trường tạm thời.
export function deterministicJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => deterministicJsonStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${deterministicJsonStringify(val)}`;
  });
  return `{${pairs.join(',')}}`;
}

export function computeSha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// 1. StrategicMemoryRecord hash
export function computeStrategicMemoryRecordHash(record: StrategicMemoryRecord): string {
  const canonical = {
    recordId: record.recordId,
    tenantId: record.tenantId,
    sessionId: record.sessionId,
    sourceConvergenceSessionId: record.sourceConvergenceSessionId,
    sourceConvergenceResultHash: record.sourceConvergenceResultHash,
    missionId: record.missionId,
    objectiveId: record.objectiveId,
    generation: record.generation,
    participatingFederations: [...record.participatingFederations].sort(),
    convergedStrategyDigest: record.convergedStrategyDigest,
    reconciliationPrecedents: record.reconciliationPrecedents,
    conflictResolutions: record.conflictResolutions,
    policyMetaEvaluationDigest: record.policyMetaEvaluationDigest,
    confidenceScore: record.confidenceScore,
    frequencyCount: record.frequencyCount,
    stabilityScore: record.stabilityScore,
    retentionEpoch: record.retentionEpoch,
    isSealed: record.isSealed,
    version: record.version,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}

// 2. StrategicIndexEntry hash
export function computeStrategicIndexEntryHash(entry: StrategicIndexEntry): string {
  const canonical = {
    indexId: entry.indexId,
    tenantId: entry.tenantId,
    recordId: entry.recordId,
    missionId: entry.missionId,
    objectiveId: entry.objectiveId,
    participatingFederations: [...entry.participatingFederations].sort(),
    keywords: [...entry.keywords].sort(),
    confidenceScore: entry.confidenceScore,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}

// 3. StrategicRetrievalQuery hash
export function computeRetrievalQueryHash(query: StrategicRetrievalQuery): string {
  const canonical = {
    queryId: query.queryId,
    tenantId: query.tenantId,
    sessionId: query.sessionId,
    missionId: query.missionId || '',
    objectiveId: query.objectiveId || '',
    targetFederations: query.targetFederations ? [...query.targetFederations].sort() : [],
    keywords: query.keywords ? [...query.keywords].sort() : [],
    minConfidence: query.minConfidence ?? 0,
    limit: query.limit ?? MAX_RETRIEVAL_RESULTS_PER_QUERY,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}

// 4. MetaLearningRound hash
export function computeMetaLearningRoundHash(round: MetaLearningRound): string {
  const canonical = {
    roundId: round.roundId,
    tenantId: round.tenantId,
    sessionId: round.sessionId,
    roundIndex: round.roundIndex,
    evaluatedRecordIds: [...round.evaluatedRecordIds].sort(),
    extractedPatternsCount: round.extractedPatternsCount,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}

// 5. MetaLearningRecommendation hash
export function computeMetaLearningRecommendationHash(rec: MetaLearningRecommendation): string {
  const canonical = {
    recommendationId: rec.recommendationId,
    tenantId: rec.tenantId,
    sessionId: rec.sessionId,
    category: rec.category,
    summary: rec.summary,
    recommendedTopology: [...rec.recommendedTopology].sort(),
    confidenceScore: rec.confidenceScore,
    isAdvisoryOnly: rec.isAdvisoryOnly,
    humanReviewRequired: rec.humanReviewRequired,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}

// 6. StrategicDriftSnapshot hash
export function computeStrategicDriftSnapshotHash(snapshot: StrategicDriftSnapshot): string {
  const canonical = {
    snapshotId: snapshot.snapshotId,
    tenantId: snapshot.tenantId,
    sessionId: snapshot.sessionId,
    categoryDriftScores: snapshot.categoryDriftScores,
    aggregateDriftScore: snapshot.aggregateDriftScore,
    severity: snapshot.severity,
    evaluatedRecordsCount: snapshot.evaluatedRecordsCount,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}

// 7. InstitutionalMemoryContinuity hash
export function computeInstitutionalMemoryContinuityHash(continuity: InstitutionalMemoryContinuity): string {
  const canonical = {
    continuityId: continuity.continuityId,
    tenantId: continuity.tenantId,
    sessionId: continuity.sessionId,
    sessionEpoch: continuity.sessionEpoch,
    totalRecordsCount: continuity.totalRecordsCount,
    activeDriftScore: continuity.activeDriftScore,
    previousContinuityHash: continuity.previousContinuityHash,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}

// 8. StrategicMemoryAuditEvent hash
export function computeStrategicMemoryAuditHash(event: StrategicMemoryAuditEvent): string {
  const canonical = {
    eventId: event.eventId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    tenantId: event.tenantId,
    sessionId: event.sessionId,
    humanOperatorId: event.humanOperatorId || '',
    missionId: event.missionId || '',
    objectiveId: event.objectiveId || '',
    federationId: event.federationId || '',
    generation: event.generation ?? 0,
    details: event.details || {},
    previousHash: event.previousHash,
  };
  return computeSha256(deterministicJsonStringify(canonical));
}
