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
};
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
export const TERMINAL_STRATEGIC_MEMORY_STATES = new Set([
    'COMPLETED',
    'INVALIDATED',
    'FAILED',
    'HALTED_BY_USER_STOP',
    'HALTED_BY_EMERGENCY_STOP',
]);
export const DRIFT_THRESHOLDS = {
    HEALTHY_MAX: 0.20,
    DEGRADED_MAX: 0.50,
    WARNING_MAX: 0.75, // Above 0.75 is CRITICAL
};
// ----------------------------------------------------------------------------
// Typed Errors
// ----------------------------------------------------------------------------
export class GovernedStrategicMemoryError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'GovernedStrategicMemoryError';
    }
}
export class GovernedStrategicMemoryConcurrencyError extends GovernedStrategicMemoryError {
    constructor(message) {
        super(message, 'OCC_CAS_VERSION_MISMATCH');
        this.name = 'GovernedStrategicMemoryConcurrencyError';
    }
}
export class GovernedStrategicMemorySecurityError extends GovernedStrategicMemoryError {
    constructor(message) {
        super(message, 'SECURITY_BOUNDARY_VIOLATION');
        this.name = 'GovernedStrategicMemorySecurityError';
    }
}
export class GovernedStrategicMemoryDriftError extends GovernedStrategicMemoryError {
    constructor(message) {
        super(message, 'CRITICAL_STRATEGIC_DRIFT');
        this.name = 'GovernedStrategicMemoryDriftError';
    }
}
export class GovernedStrategicMemoryLifecycleError extends GovernedStrategicMemoryError {
    constructor(message) {
        super(message, 'ILLEGAL_LIFECYCLE_TRANSITION');
        this.name = 'GovernedStrategicMemoryLifecycleError';
    }
}
// ----------------------------------------------------------------------------
// Deterministic Serialization & SHA-256 Provenance Hashers
// ----------------------------------------------------------------------------
// EN: Deterministically serializes objects by sorting keys alphabetically, omitting transient fields.
// VI: Tuần tự hoá đối tượng một cách tất định bằng cách sắp xếp khoá theo alphabet, loại bỏ trường tạm thời.
export function deterministicJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return `[${obj.map((item) => deterministicJsonStringify(item)).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((key) => {
        const val = obj[key];
        return `${JSON.stringify(key)}:${deterministicJsonStringify(val)}`;
    });
    return `{${pairs.join(',')}}`;
}
export function computeSha256(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}
// 1. StrategicMemoryRecord hash
export function computeStrategicMemoryRecordHash(record) {
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
export function computeStrategicIndexEntryHash(entry) {
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
export function computeRetrievalQueryHash(query) {
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
export function computeMetaLearningRoundHash(round) {
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
export function computeMetaLearningRecommendationHash(rec) {
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
export function computeStrategicDriftSnapshotHash(snapshot) {
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
export function computeInstitutionalMemoryContinuityHash(continuity) {
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
export function computeStrategicMemoryAuditHash(event) {
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
