// src/core/missionCoordination/missionCoordinationValidator.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1099 — REAL
//
// EN: Pure fail-closed validator for mission envelopes, multi-objective bindings, DAG cycles,
//     prototype pollution defense, CoT prohibition, and prompt-injection quarantine.
// VI: Trình xác thực thuần túy đóng-khi-lỗi cho phong bì sứ mệnh, ràng buộc đa mục tiêu, chu trình DAG,
//     phòng vệ ô nhiễm nguyên mẫu, cấm CoT và cách ly tiêm nhiễm nhắc lệnh.
import { MissionCoordinationValidationError, MissionCoordinationDependencyError, computeMissionAuthorizationHash, MAX_OBJECTIVES_PER_MISSION, MAX_ACTIVE_OBJECTIVE_SESSIONS, MAX_COORDINATION_CYCLES, MAX_REASSESSMENTS, MAX_MISSION_DURATION_MS, MAX_OBJECTIVE_DEPENDENCY_DEPTH, } from './missionCoordinationTypes.js';
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const COT_PATTERNS = [
    /<thought[\s\S]*?>[\s\S]*?<\/thought>/i,
    /<thought\b/i,
    /<\/thought>/i,
    /\[scratchpad\]/i,
    /\bchainOfThought\b/i,
    /\bmodelThinking\b/i,
    /<deliberation\b/i,
    /<\/deliberation>/i,
    /<cot\b/i,
    /<\/cot>/i,
];
const PROMPT_INJECTION_PATTERNS = [
    /ignore\s+previous\s+instructions/i,
    /system\s+override/i,
    /you\s+are\s+now/i,
    /disable\s+safety/i,
    /jailbreak/i,
    /reveal\s+secret/i,
    /bypass\s+authorization/i,
    /override\s+policy/i,
];
const VALID_MISSION_TRANSITIONS = {
    INITIALIZING: new Set(['AUTHORIZED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
    AUTHORIZED: new Set(['READY', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
    READY: new Set(['COORDINATING', 'SUSPENDED', 'REVIEW_REQUIRED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
    COORDINATING: new Set([
        'OBJECTIVE_ACTIVE',
        'OBJECTIVE_BLOCKED',
        'REVIEW_REQUIRED',
        'SUSPENDED',
        'COMPLETED',
        'FAILED',
        'HALTED_BY_USER_STOP',
        'HALTED_BY_EMERGENCY_STOP',
        'INVALIDATED',
    ]),
    OBJECTIVE_ACTIVE: new Set([
        'COORDINATING',
        'OBJECTIVE_BLOCKED',
        'REVIEW_REQUIRED',
        'SUSPENDED',
        'COMPLETED',
        'FAILED',
        'HALTED_BY_USER_STOP',
        'HALTED_BY_EMERGENCY_STOP',
    ]),
    OBJECTIVE_BLOCKED: new Set([
        'COORDINATING',
        'REVIEW_REQUIRED',
        'SUSPENDED',
        'FAILED',
        'HALTED_BY_USER_STOP',
        'HALTED_BY_EMERGENCY_STOP',
    ]),
    REVIEW_REQUIRED: new Set(['RESUMABLE', 'COORDINATING', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
    SUSPENDED: new Set(['RESUMABLE', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
    RESUMABLE: new Set(['COORDINATING', 'READY', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP', 'INVALIDATED']),
    COMPLETED: new Set([]), // Terminal
    FAILED: new Set([]), // Terminal
    HALTED_BY_USER_STOP: new Set([]), // Terminal
    HALTED_BY_EMERGENCY_STOP: new Set([]), // Terminal
    INVALIDATED: new Set([]), // Terminal
};
export class MissionCoordinationValidator {
    /**
     * EN: Asserts recursive prototype pollution defense across inputs.
     * VI: Khẳng định phòng vệ ô nhiễm nguyên mẫu đệ quy trên các dữ liệu đầu vào.
     */
    assertNoPrototypePollution(data, path = 'root') {
        if (data === null || typeof data !== 'object') {
            return;
        }
        if (Array.isArray(data)) {
            data.forEach((item, index) => this.assertNoPrototypePollution(item, `${path}[${index}]`));
            return;
        }
        for (const key of Object.getOwnPropertyNames(data)) {
            if (FORBIDDEN_KEYS.has(key)) {
                throw new MissionCoordinationValidationError(`Prototype pollution attempt detected at key: ${path}.${key}`);
            }
            const value = data[key];
            this.assertNoPrototypePollution(value, `${path}.${key}`);
        }
    }
    /**
     * EN: Asserts recursive Chain-of-Thought (CoT) marker prohibition.
     * VI: Khẳng định nghiêm cấm các dấu hiệu Chain-of-Thought (CoT) đệ quy.
     */
    assertNoCoT(data, path = 'root') {
        if (typeof data === 'string') {
            for (const pattern of COT_PATTERNS) {
                if (pattern.test(data)) {
                    throw new MissionCoordinationValidationError(`Forbidden Chain-of-Thought reasoning detected at ${path}: "${data.slice(0, 40)}..."`);
                }
            }
            return;
        }
        if (data === null || typeof data !== 'object') {
            return;
        }
        if (Array.isArray(data)) {
            data.forEach((item, index) => this.assertNoCoT(item, `${path}[${index}]`));
            return;
        }
        for (const [key, value] of Object.entries(data)) {
            for (const pattern of COT_PATTERNS) {
                if (pattern.test(key)) {
                    throw new MissionCoordinationValidationError(`Forbidden Chain-of-Thought key detected: ${path}.${key}`);
                }
            }
            this.assertNoCoT(value, `${path}.${key}`);
        }
    }
    /**
     * EN: Quarantines untrusted environment text and rejects adversarial prompt injection.
     * VI: Cách ly văn bản môi trường không tin cậy và từ chối tiêm nhiễm nhắc lệnh đối nghịch.
     */
    quarantineUntrustedText(text) {
        if (!text || typeof text !== 'string') {
            return { isQuarantined: false, sanitizedText: '' };
        }
        for (const pattern of PROMPT_INJECTION_PATTERNS) {
            if (pattern.test(text)) {
                return {
                    isQuarantined: true,
                    sanitizedText: '[QUARANTINED_UNTRUSTED_ENVIRONMENT_DATA]',
                    reason: `Detected forbidden prompt-injection pattern: ${pattern.source}`,
                };
            }
        }
        return {
            isQuarantined: false,
            sanitizedText: text,
        };
    }
    /**
     * EN: Validates mission authorization envelope structure, scope, risk tier, and provenance hash.
     * VI: Xác thực cấu trúc phong bì ủy quyền sứ mệnh, phạm vi, mức rủi ro và mã băm nguồn gốc.
     */
    validateAuthorizationEnvelope(envelope) {
        if (!envelope || typeof envelope !== 'object') {
            throw new MissionCoordinationValidationError('Mission authorization envelope must be a valid non-null object');
        }
        this.assertNoPrototypePollution(envelope, 'envelope');
        this.assertNoCoT(envelope, 'envelope');
        if (!envelope.envelopeId || typeof envelope.envelopeId !== 'string') {
            throw new MissionCoordinationValidationError('Missing or invalid envelopeId');
        }
        if (!envelope.tenantId || typeof envelope.tenantId !== 'string') {
            throw new MissionCoordinationValidationError('Missing or invalid tenantId');
        }
        if (!envelope.sessionId || typeof envelope.sessionId !== 'string') {
            throw new MissionCoordinationValidationError('Missing or invalid sessionId');
        }
        if (!envelope.humanOperatorId || typeof envelope.humanOperatorId !== 'string') {
            throw new MissionCoordinationValidationError('Missing or invalid humanOperatorId');
        }
        if (!envelope.leaseId || typeof envelope.leaseId !== 'string') {
            throw new MissionCoordinationValidationError('Missing or invalid leaseId');
        }
        if (!Array.isArray(envelope.authorizationScope) || envelope.authorizationScope.length === 0) {
            throw new MissionCoordinationValidationError('Mission authorization scope must be a non-empty array of permissions');
        }
        const validRiskTiers = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
        if (!validRiskTiers.has(envelope.riskTier)) {
            throw new MissionCoordinationValidationError(`Invalid risk tier: ${envelope.riskTier}`);
        }
        if (envelope.riskTier === 'HIGH' || envelope.riskTier === 'CRITICAL') {
            if (!envelope.humanConfirmationToken || typeof envelope.humanConfirmationToken !== 'string') {
                throw new MissionCoordinationValidationError(`High/Critical risk tier requires explicit humanConfirmationToken`);
            }
            if (!envelope.humanConfirmationExpiresAt || envelope.humanConfirmationExpiresAt <= Date.now()) {
                throw new MissionCoordinationValidationError('Human confirmation token is missing expiration or has expired');
            }
        }
        if (!envelope.expiresAt || envelope.expiresAt <= Date.now()) {
            throw new MissionCoordinationValidationError('Mission authorization envelope has expired');
        }
        const { provenanceHash, ...payload } = envelope;
        const computedHash = computeMissionAuthorizationHash(payload);
        if (provenanceHash !== computedHash) {
            throw new MissionCoordinationValidationError(`Envelope provenance hash mismatch: expected ${computedHash}, got ${provenanceHash}`);
        }
    }
    /**
     * EN: Validates mission dependency DAG, detecting cycles and bounding dependency depth.
     * VI: Xác thực DAG phụ thuộc sứ mệnh, phát hiện chu trình và giới hạn độ sâu phụ thuộc.
     */
    validateDependencyGraph(graph, maxDepth = MAX_OBJECTIVE_DEPENDENCY_DEPTH) {
        if (!graph || typeof graph !== 'object') {
            throw new MissionCoordinationValidationError('Dependency graph must be a valid non-null object');
        }
        this.assertNoPrototypePollution(graph, 'graph');
        const nodeSet = new Set(graph.nodes);
        const adjList = new Map();
        for (const node of graph.nodes) {
            adjList.set(node, []);
        }
        for (const edge of graph.edges) {
            if (!nodeSet.has(edge.from) || !nodeSet.has(edge.to)) {
                throw new MissionCoordinationDependencyError(`Edge references unknown node: ${edge.from} -> ${edge.to}`);
            }
            if (edge.from === edge.to) {
                throw new MissionCoordinationDependencyError(`Self-referential dependency cycle detected at node '${edge.from}'`);
            }
            adjList.get(edge.from)?.push(edge.to);
        }
        // Cycle detection & depth calculation via bounded DFS
        const visited = new Set();
        const recStack = new Set();
        const checkCycleAndDepth = (node, depth) => {
            if (depth > maxDepth) {
                throw new MissionCoordinationDependencyError(`Dependency depth ${depth} exceeds maximum allowable depth of ${maxDepth}`);
            }
            visited.add(node);
            recStack.add(node);
            const neighbors = adjList.get(node) ?? [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    checkCycleAndDepth(neighbor, depth + 1);
                }
                else if (recStack.has(neighbor)) {
                    throw new MissionCoordinationDependencyError(`Dependency cycle detected involving node '${node}' -> '${neighbor}'`);
                }
            }
            recStack.delete(node);
        };
        for (const node of graph.nodes) {
            if (!visited.has(node)) {
                checkCycleAndDepth(node, 1);
            }
        }
    }
    /**
     * EN: Validates mission budget snapshot bounds.
     * VI: Xác thực các giới hạn ảnh chụp ngân sách sứ mệnh.
     */
    validateBudget(budget) {
        if (!budget || typeof budget !== 'object') {
            throw new MissionCoordinationValidationError('Budget snapshot must be a valid non-null object');
        }
        this.assertNoPrototypePollution(budget, 'budget');
        if (budget.maxObjectives <= 0 || budget.maxObjectives > MAX_OBJECTIVES_PER_MISSION) {
            throw new MissionCoordinationValidationError(`maxObjectives must be in range 1..${MAX_OBJECTIVES_PER_MISSION}`);
        }
        if (budget.maxActiveObjectiveSessions <= 0 || budget.maxActiveObjectiveSessions > MAX_ACTIVE_OBJECTIVE_SESSIONS) {
            throw new MissionCoordinationValidationError(`maxActiveObjectiveSessions must be in range 1..${MAX_ACTIVE_OBJECTIVE_SESSIONS}`);
        }
        if (budget.maxCoordinationCycles <= 0 || budget.maxCoordinationCycles > MAX_COORDINATION_CYCLES) {
            throw new MissionCoordinationValidationError(`maxCoordinationCycles must be in range 1..${MAX_COORDINATION_CYCLES}`);
        }
        if (budget.maxReassessments <= 0 || budget.maxReassessments > MAX_REASSESSMENTS) {
            throw new MissionCoordinationValidationError(`maxReassessments must be in range 1..${MAX_REASSESSMENTS}`);
        }
        if (budget.missionDurationLimitMs <= 0 || budget.missionDurationLimitMs > MAX_MISSION_DURATION_MS) {
            throw new MissionCoordinationValidationError(`missionDurationLimitMs must be in range 1..${MAX_MISSION_DURATION_MS}`);
        }
    }
    /**
     * EN: Asserts valid state transition according to mission lifecycle state machine.
     * VI: Khẳng định chuyển đổi trạng thái hợp lệ theo máy trạng thái vòng đời sứ mệnh.
     */
    assertValidStateTransition(fromState, toState) {
        const allowed = VALID_MISSION_TRANSITIONS[fromState];
        if (!allowed || !allowed.has(toState)) {
            throw new MissionCoordinationValidationError(`Illegal mission state transition from ${fromState} to ${toState}`);
        }
    }
}
