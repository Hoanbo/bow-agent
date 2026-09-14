// src/core/governedExecution/executionRequestValidator.ts
// BOWCON V4.0 — MS-1.5.09: EXECUTION REQUEST VALIDATOR
// Component 1059 — REAL
//
// EN: Fails-closed pure validator for execution requests, operations, leases,
//     and authorization envelopes. Enforces prototype pollution defense, CoT prohibition,
//     payload size constraints, and prompt-injection defense.
// VI: Bộ xác thực thuần túy fail-closed cho các yêu cầu thực thi, thao tác, hợp đồng thuê
//     và phong bì ủy quyền. Thực thi phòng thủ prototype pollution, cấm CoT, giới hạn
//     kích thước payload và phòng thủ chèn prompt.
import { ExecutionValidationError, MAX_EXECUTION_PAYLOAD_BYTES, } from './executionTypes.js';
export const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];
export const PROHIBITED_COT_MARKERS = [
    '<thought>',
    '</thought>',
    '[scratchpad]',
    'chainofthought',
    'chain_of_thought',
    'internalreasoning',
    'internal_reasoning',
    'reasoning_trace',
    'hidden_reasoning',
    'privatedeliberation',
    'modelthinking',
];
export const SUSPICIOUS_INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /system\s+override/i,
    /you\s+are\s+now/i,
    /developer\s+message/i,
    /jailbreak/i,
    /disable\s+safety/i,
    /bypass\s+policy/i,
    /reveal\s+secret/i,
    /send\s+password/i,
];
export class ExecutionRequestValidator {
    /**
     * EN: Validates a full ExecutionRequest, failing closed on any irregularity.
     * VI: Xác thực toàn bộ ExecutionRequest, fail-closed đối với bất kỳ điểm bất thường nào.
     */
    static validateRequest(request) {
        if (!request || typeof request !== 'object') {
            throw new ExecutionValidationError('Execution request must be a non-null object');
        }
        // 1. Prototype Pollution Defense
        this.assertNoPrototypePollution(request);
        // 2. CoT and Hidden Reasoning Prohibition
        this.assertNoCoTArtifacts(request);
        // 3. Payload Size Boundary Check
        const serialized = JSON.stringify(request);
        if (Buffer.byteLength(serialized, 'utf8') > MAX_EXECUTION_PAYLOAD_BYTES) {
            throw new ExecutionValidationError(`Execution request exceeds maximum allowed size of ${MAX_EXECUTION_PAYLOAD_BYTES} bytes`);
        }
        const candidate = request;
        // 4. Identity & Nonce Structure
        if (!candidate.requestId || typeof candidate.requestId !== 'string' || candidate.requestId.trim().length === 0) {
            throw new ExecutionValidationError('Execution request must have a non-empty requestId');
        }
        if (!candidate.tenantId || typeof candidate.tenantId !== 'string' || candidate.tenantId.trim().length === 0) {
            throw new ExecutionValidationError('Execution request must have a non-empty tenantId');
        }
        if (!candidate.sessionId || typeof candidate.sessionId !== 'string' || candidate.sessionId.trim().length === 0) {
            throw new ExecutionValidationError('Execution request must have a non-empty sessionId');
        }
        if (!candidate.taskId || typeof candidate.taskId !== 'string' || candidate.taskId.trim().length === 0) {
            throw new ExecutionValidationError('Execution request must have a non-empty taskId');
        }
        if (!candidate.stepId || typeof candidate.stepId !== 'string' || candidate.stepId.trim().length === 0) {
            throw new ExecutionValidationError('Execution request must have a non-empty stepId');
        }
        if (typeof candidate.stepIndex !== 'number' || candidate.stepIndex < 0 || !Number.isInteger(candidate.stepIndex)) {
            throw new ExecutionValidationError('Execution request stepIndex must be a non-negative integer');
        }
        // 5. Operation Validation
        this.validateOperation(candidate.operation);
        // 6. Lease Validation
        this.validateLease(candidate.lease);
        // 7. Authorization Envelope Validation
        this.validateAuthorization(candidate.authorization);
        // 8. Snapshot Envelopes
        if (!candidate.bindingSnapshot || typeof candidate.bindingSnapshot !== 'object') {
            throw new ExecutionValidationError('Execution request must carry a valid GroundedPlanTaskBinding snapshot');
        }
        if (!candidate.taskSnapshot || typeof candidate.taskSnapshot !== 'object') {
            throw new ExecutionValidationError('Execution request must carry a valid AgentTask snapshot');
        }
    }
    /**
     * EN: Validates an ExecutionOperation structure.
     * VI: Xác thực cấu trúc của ExecutionOperation.
     */
    static validateOperation(operation) {
        if (!operation || typeof operation !== 'object') {
            throw new ExecutionValidationError('Execution operation must be a non-null object');
        }
        this.assertNoPrototypePollution(operation);
        this.assertNoCoTArtifacts(operation);
        const candidate = operation;
        const validKinds = [
            'INSPECT_ELEMENT',
            'READ_STATE',
            'VERIFY_ASSERTION',
            'SIMULATE_INTERACTION',
            'EXECUTE_GOVERNED_ACTION',
            'CUSTOM_REGISTERED',
        ];
        if (!candidate.kind || !validKinds.includes(candidate.kind)) {
            throw new ExecutionValidationError(`Invalid operation kind: "${candidate.kind}"`);
        }
        if (!candidate.operationName || typeof candidate.operationName !== 'string' || candidate.operationName.trim().length === 0) {
            throw new ExecutionValidationError('Operation name must be a non-empty string');
        }
        if (!candidate.parameters || typeof candidate.parameters !== 'object') {
            throw new ExecutionValidationError('Operation parameters must be a non-null object');
        }
        // Check parameters for prompt injections
        this.assertNoPromptInjection(candidate.parameters);
    }
    /**
     * EN: Validates an ExecutionLease structure.
     * VI: Xác thực cấu trúc của ExecutionLease.
     */
    static validateLease(lease) {
        if (!lease || typeof lease !== 'object') {
            throw new ExecutionValidationError('Execution lease must be a non-null object');
        }
        this.assertNoPrototypePollution(lease);
        const candidate = lease;
        if (!candidate.leaseId || typeof candidate.leaseId !== 'string' || candidate.leaseId.trim().length === 0) {
            throw new ExecutionValidationError('Lease must have a non-empty leaseId');
        }
        if (!candidate.tenantId || typeof candidate.tenantId !== 'string' || candidate.tenantId.trim().length === 0) {
            throw new ExecutionValidationError('Lease must have a non-empty tenantId');
        }
        if (!candidate.sessionId || typeof candidate.sessionId !== 'string' || candidate.sessionId.trim().length === 0) {
            throw new ExecutionValidationError('Lease must have a non-empty sessionId');
        }
        if (!candidate.taskId || typeof candidate.taskId !== 'string' || candidate.taskId.trim().length === 0) {
            throw new ExecutionValidationError('Lease must have a non-empty taskId');
        }
        if (!candidate.stepId || typeof candidate.stepId !== 'string' || candidate.stepId.trim().length === 0) {
            throw new ExecutionValidationError('Lease must have a non-empty stepId');
        }
        if (typeof candidate.stepIndex !== 'number' || candidate.stepIndex < 0 || !Number.isInteger(candidate.stepIndex)) {
            throw new ExecutionValidationError('Lease stepIndex must be a non-negative integer');
        }
        if (!candidate.issuedAt || Number.isNaN(Date.parse(candidate.issuedAt))) {
            throw new ExecutionValidationError('Lease must have a valid issuedAt timestamp');
        }
        if (!candidate.expiresAt || Number.isNaN(Date.parse(candidate.expiresAt))) {
            throw new ExecutionValidationError('Lease must have a valid expiresAt timestamp');
        }
        if (Date.parse(candidate.expiresAt) <= Date.parse(candidate.issuedAt)) {
            throw new ExecutionValidationError('Lease expiresAt must be strictly greater than issuedAt');
        }
        if (!candidate.nonce || typeof candidate.nonce !== 'string' || candidate.nonce.trim().length === 0) {
            throw new ExecutionValidationError('Lease must contain a non-empty anti-replay nonce');
        }
        if (!candidate.signatureHash || typeof candidate.signatureHash !== 'string' || candidate.signatureHash.trim().length === 0) {
            throw new ExecutionValidationError('Lease must contain a non-empty signatureHash');
        }
        if (typeof candidate.version !== 'number' || candidate.version < 1) {
            throw new ExecutionValidationError('Lease version must be a positive integer');
        }
    }
    /**
     * EN: Validates an ExecutionAuthorizationEnvelope structure.
     * VI: Xác thực cấu trúc của ExecutionAuthorizationEnvelope.
     */
    static validateAuthorization(auth) {
        if (!auth || typeof auth !== 'object') {
            throw new ExecutionValidationError('Execution authorization must be a non-null object');
        }
        this.assertNoPrototypePollution(auth);
        const candidate = auth;
        if (!candidate.authorizationId || typeof candidate.authorizationId !== 'string' || candidate.authorizationId.trim().length === 0) {
            throw new ExecutionValidationError('Authorization must have a non-empty authorizationId');
        }
        if (!candidate.tenantId || typeof candidate.tenantId !== 'string' || candidate.tenantId.trim().length === 0) {
            throw new ExecutionValidationError('Authorization must have a non-empty tenantId');
        }
        if (!candidate.sessionId || typeof candidate.sessionId !== 'string' || candidate.sessionId.trim().length === 0) {
            throw new ExecutionValidationError('Authorization must have a non-empty sessionId');
        }
        if (!candidate.bindingId || typeof candidate.bindingId !== 'string' || candidate.bindingId.trim().length === 0) {
            throw new ExecutionValidationError('Authorization must have a non-empty bindingId');
        }
        if (!candidate.sourcePlanId || typeof candidate.sourcePlanId !== 'string' || candidate.sourcePlanId.trim().length === 0) {
            throw new ExecutionValidationError('Authorization must have a non-empty sourcePlanId');
        }
        if (!candidate.sourcePlanProvenanceHash || typeof candidate.sourcePlanProvenanceHash !== 'string') {
            throw new ExecutionValidationError('Authorization must contain sourcePlanProvenanceHash');
        }
        if (!candidate.bindingProvenanceHash || typeof candidate.bindingProvenanceHash !== 'string') {
            throw new ExecutionValidationError('Authorization must contain bindingProvenanceHash');
        }
        if (!candidate.taskId || typeof candidate.taskId !== 'string') {
            throw new ExecutionValidationError('Authorization must contain taskId');
        }
        if (!candidate.stepId || typeof candidate.stepId !== 'string') {
            throw new ExecutionValidationError('Authorization must contain stepId');
        }
        if (!candidate.pdpVerdict || !['PERMIT', 'DENY', 'REQUIRES_CONFIRMATION'].includes(candidate.pdpVerdict)) {
            throw new ExecutionValidationError(`Invalid PDP verdict in authorization: "${candidate.pdpVerdict}"`);
        }
        if (!candidate.pepLeaseId || typeof candidate.pepLeaseId !== 'string') {
            throw new ExecutionValidationError('Authorization must contain pepLeaseId');
        }
        if (!candidate.authorizationHash || typeof candidate.authorizationHash !== 'string') {
            throw new ExecutionValidationError('Authorization must contain authorizationHash');
        }
    }
    /**
     * EN: Recursively asserts no prototype pollution keys exist.
     * VI: Đệ quy khẳng định không tồn tại các khóa prototype pollution nguy hiểm.
     */
    static assertNoPrototypePollution(target) {
        if (!target || typeof target !== 'object') {
            return;
        }
        for (const key of Object.keys(target)) {
            if (DANGEROUS_KEYS.includes(key)) {
                throw new ExecutionValidationError(`Prototype pollution attempt detected via prohibited key: "${key}"`);
            }
            const val = target[key];
            if (val && typeof val === 'object') {
                this.assertNoPrototypePollution(val);
            }
        }
    }
    /**
     * EN: Recursively asserts no CoT markers exist in object strings.
     * VI: Đệ quy khẳng định không có dấu vết CoT trong các chuỗi của đối tượng.
     */
    static assertNoCoTArtifacts(target) {
        if (!target)
            return;
        if (typeof target === 'string') {
            const lower = target.toLowerCase();
            for (const marker of PROHIBITED_COT_MARKERS) {
                if (lower.includes(marker)) {
                    throw new ExecutionValidationError(`Prohibited Chain-of-Thought artifact detected: "${marker}"`);
                }
            }
            return;
        }
        if (Array.isArray(target)) {
            for (const item of target) {
                this.assertNoCoTArtifacts(item);
            }
            return;
        }
        if (typeof target === 'object') {
            for (const val of Object.values(target)) {
                this.assertNoCoTArtifacts(val);
            }
        }
    }
    /**
     * EN: Asserts no prompt-injection patterns exist in execution parameters.
     * VI: Khẳng định không có mẫu chèn prompt trong tham số thực thi.
     */
    static assertNoPromptInjection(target) {
        if (!target)
            return;
        if (typeof target === 'string') {
            for (const pattern of SUSPICIOUS_INJECTION_PATTERNS) {
                if (pattern.test(target)) {
                    throw new ExecutionValidationError(`Untrusted prompt injection pattern detected in execution payload: "${target}"`);
                }
            }
            return;
        }
        if (Array.isArray(target)) {
            for (const item of target) {
                this.assertNoPromptInjection(item);
            }
            return;
        }
        if (typeof target === 'object') {
            for (const val of Object.values(target)) {
                this.assertNoPromptInjection(val);
            }
        }
    }
}
