// src/core/durableCommit/durableCommitValidator.ts
// BOWCON V4.0 — MS-1.4.08: DURABLE COMMIT VALIDATOR
//
// EN:
// Pure deterministic structural and authority validator for the Durable Commit Engine.
// Enforces the core invariant: TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT.
// Only sealed RealityVerificationResults with status === 'VERIFIED' and allRequiredPassed === true
// can satisfy the commit authority gate.
//
// VI:
// Trình xác thực cấu trúc và thẩm quyền tất định thuần túy cho Động cơ Commit Bền vững.
// Thực thi bất biến cốt lõi: TOOL_OUTPUT != REALITY_PROOF != DURABLE_COMMIT.
// Chỉ các RealityVerificationResult được niêm phong với status === 'VERIFIED' và allRequiredPassed === true
// mới có thể thỏa mãn cổng thẩm quyền commit.
import { MAX_COMMIT_PAYLOAD_BYTES, MAX_COMMIT_DEPTH, CommitValidationError, CrossTenantCommitError, StaleTaskCommitError, CommitSecurityViolationError, } from './durableCommitTypes.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class DurableCommitValidator {
    maxPayloadBytes;
    maxDepth;
    sanitizer;
    constructor(options) {
        this.maxPayloadBytes = options?.maxPayloadBytes ?? MAX_COMMIT_PAYLOAD_BYTES;
        this.maxDepth = options?.maxDepth ?? MAX_COMMIT_DEPTH;
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * EN: Defensively validates raw incoming payload for security threats.
     * Rejects prototype pollution (__proto__, constructor, prototype), null bytes,
     * excessive nesting (>10), and payloads exceeding size limits (64 KB).
     */
    defensivelyValidatePayload(payload, depth = 0) {
        if (payload === null || payload === undefined) {
            return;
        }
        if (depth > this.maxDepth) {
            throw new CommitSecurityViolationError(`Payload exceeds maximum nesting depth limit of ${this.maxDepth}`);
        }
        if (typeof payload === 'string') {
            if (payload.includes('\0')) {
                throw new CommitSecurityViolationError('Null byte injection detected in commit payload');
            }
            return;
        }
        if (typeof payload === 'number' || typeof payload === 'boolean') {
            return;
        }
        if (Array.isArray(payload)) {
            for (const item of payload) {
                this.defensivelyValidatePayload(item, depth + 1);
            }
            return;
        }
        if (typeof payload === 'object') {
            const proto = Object.getPrototypeOf(payload);
            if (proto !== null && proto !== Object.prototype && proto !== Array.prototype) {
                throw new CommitSecurityViolationError('Abnormal object prototype detected (possible prototype pollution)');
            }
            for (const key of Object.getOwnPropertyNames(payload)) {
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    throw new CommitSecurityViolationError(`Forbidden key '${key}' detected (prototype pollution attempt)`);
                }
                if (key.includes('\0')) {
                    throw new CommitSecurityViolationError('Null byte injection detected in object property name');
                }
                this.defensivelyValidatePayload(payload[key], depth + 1);
            }
        }
    }
    /**
     * EN: Validates the structural envelope of a DurableCommitRequest.
     */
    validateRequestEnvelope(request) {
        if (!request || typeof request !== 'object') {
            throw new CommitValidationError('DurableCommitRequest must be a non-null object');
        }
        // Measure serialized payload size
        try {
            const serialized = JSON.stringify(request);
            if (Buffer.byteLength(serialized, 'utf8') > this.maxPayloadBytes) {
                throw new CommitSecurityViolationError(`Commit request payload exceeds limit of ${this.maxPayloadBytes} bytes`);
            }
        }
        catch (err) {
            if (err instanceof CommitSecurityViolationError)
                throw err;
            throw new CommitValidationError(`Cannot serialize commit request: ${err.message}`);
        }
        // Defensively scan for security violations
        this.defensivelyValidatePayload(request);
        const req = request;
        if (!req.verificationResult || typeof req.verificationResult !== 'object') {
            throw new CommitValidationError('DurableCommitRequest is missing verificationResult');
        }
        if (!req.authoritativeTask || typeof req.authoritativeTask !== 'object') {
            throw new CommitValidationError('DurableCommitRequest is missing authoritativeTask');
        }
        // Validate authoritative task minimum fields
        const task = req.authoritativeTask;
        if (!task.taskId || typeof task.taskId !== 'string' || !task.taskId.trim()) {
            throw new CommitValidationError('authoritativeTask.taskId must be a non-empty string');
        }
        if (!task.tenantId || typeof task.tenantId !== 'string' || !task.tenantId.trim()) {
            throw new CommitValidationError('authoritativeTask.tenantId must be a non-empty string');
        }
        if (typeof task.version !== 'number' || task.version < 1) {
            throw new CommitValidationError('authoritativeTask.version must be a positive number');
        }
    }
    /**
     * EN: Enforces VERIFIED-only commit authority on RealityVerificationResult.
     * Invariant: A tool execution result never grants commit authority.
     * Only VERIFIED with summary.allRequiredPassed === true may proceed.
     */
    validateVerificationAuthority(verification) {
        if (!verification.verificationId || typeof verification.verificationId !== 'string') {
            throw new CommitValidationError('RealityVerificationResult must include verificationId');
        }
        if (!verification.taskId || typeof verification.taskId !== 'string') {
            throw new CommitValidationError('RealityVerificationResult must include taskId');
        }
        if (!verification.tenantId || typeof verification.tenantId !== 'string') {
            throw new CommitValidationError('RealityVerificationResult must include tenantId');
        }
        if (!verification.stepId || typeof verification.stepId !== 'string') {
            throw new CommitValidationError('RealityVerificationResult must include stepId');
        }
        if (!verification.executionId || typeof verification.executionId !== 'string') {
            throw new CommitValidationError('RealityVerificationResult must include executionId');
        }
        if (!verification.verificationProvenanceHash || typeof verification.verificationProvenanceHash !== 'string') {
            throw new CommitValidationError('RealityVerificationResult must include verificationProvenanceHash');
        }
        // Strict Status Gating
        if (verification.status !== 'VERIFIED') {
            throw new CommitValidationError(`Commit authority rejected: RealityVerification status is '${verification.status}', expected 'VERIFIED'`);
        }
        // Strict Invariant Gating
        if (!verification.summary || verification.summary.allRequiredPassed !== true) {
            throw new CommitValidationError('Commit authority rejected: RealityVerification summary.allRequiredPassed is false or missing');
        }
    }
    /**
     * EN: Validates task, tenant, step, execution, and version concurrency bindings.
     */
    validateBindings(verification, authoritativeTask, context, expectedTaskVersion) {
        // Tenant Isolation
        if (verification.tenantId.trim() !== authoritativeTask.tenantId.trim()) {
            throw new CrossTenantCommitError(`Cross-tenant commit violation: verification tenant '${verification.tenantId}' does not match task tenant '${authoritativeTask.tenantId}'`);
        }
        if (context?.tenantId && context.tenantId.trim() !== authoritativeTask.tenantId.trim()) {
            throw new CrossTenantCommitError(`Cross-tenant commit violation: context tenant '${context.tenantId}' does not match task tenant '${authoritativeTask.tenantId}'`);
        }
        // Task Binding
        if (verification.taskId.trim() !== authoritativeTask.taskId.trim()) {
            throw new CommitValidationError(`Task mismatch: verification taskId '${verification.taskId}' does not match task '${authoritativeTask.taskId}'`);
        }
        // Concurrency / Stale Task Version Check
        if (expectedTaskVersion !== undefined && expectedTaskVersion !== authoritativeTask.version) {
            throw new StaleTaskCommitError(`Stale task version: expected version ${expectedTaskVersion} but authoritative task is at version ${authoritativeTask.version}`);
        }
        // Task Path Safety
        this.validateIdentifierSafety(authoritativeTask.tenantId, 'tenantId');
        this.validateIdentifierSafety(authoritativeTask.taskId, 'taskId');
    }
    /**
     * EN: Validates identifier strings against path traversal or reserved keywords.
     */
    validateIdentifierSafety(identifier, fieldName) {
        if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
            throw new CommitValidationError(`${fieldName} must be a non-empty string`);
        }
        const trimmed = identifier.trim();
        if (trimmed.includes('..') ||
            trimmed.includes('/') ||
            trimmed.includes('\\') ||
            trimmed.includes('\0') ||
            trimmed.includes('shopofbow')) {
            throw new CommitSecurityViolationError(`Security violation: ${fieldName} '${trimmed}' contains forbidden traversal sequences or protected paths`);
        }
    }
    /**
     * EN: Sanitizes data structures using DiagnosisSanitizer for safe logging and persistence.
     */
    sanitize(data) {
        return this.sanitizer.sanitize(data);
    }
}
export const globalDurableCommitValidator = new DurableCommitValidator();
