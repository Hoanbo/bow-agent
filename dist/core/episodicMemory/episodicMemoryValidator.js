// src/core/episodicMemory/episodicMemoryValidator.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY VALIDATOR
//
// EN:
// Pure deterministic validator for the Episodic Memory Subsystem.
// Enforces that only valid DurableCommitRecords with status === 'COMMITTED' can be ingested.
// Validates multi-tuple identity bindings, version concurrency, path traversal defenses,
// prototype pollution defense, null-byte injection, and payload bounds.
//
// VI:
// Trình xác thực tất định thuần túy cho Phân hệ Bộ nhớ Episodic.
// Thực thi quy tắc chỉ các DurableCommitRecord hợp lệ có status === 'COMMITTED' mới được tiếp nhận.
import { MAX_MEMORY_PAYLOAD_BYTES, MAX_MEMORY_DEPTH, MemoryValidationError, CrossTenantMemoryError, MemorySecurityViolationError, } from './episodicMemoryTypes.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export class EpisodicMemoryValidator {
    maxPayloadBytes;
    maxDepth;
    sanitizer;
    constructor(options) {
        this.maxPayloadBytes = options?.maxPayloadBytes ?? MAX_MEMORY_PAYLOAD_BYTES;
        this.maxDepth = options?.maxDepth ?? MAX_MEMORY_DEPTH;
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
            throw new MemorySecurityViolationError(`Payload exceeds maximum nesting depth limit of ${this.maxDepth}`);
        }
        if (typeof payload === 'string') {
            if (payload.includes('\0')) {
                throw new MemorySecurityViolationError('Null byte injection detected in memory payload');
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
                throw new MemorySecurityViolationError('Abnormal object prototype detected (possible prototype pollution)');
            }
            for (const key of Object.getOwnPropertyNames(payload)) {
                if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                    throw new MemorySecurityViolationError(`Forbidden key '${key}' detected (prototype pollution attempt)`);
                }
                if (key.includes('\0')) {
                    throw new MemorySecurityViolationError('Null byte injection detected in object property name');
                }
                this.defensivelyValidatePayload(payload[key], depth + 1);
            }
        }
    }
    /**
     * EN: Validates the structural envelope of an EpisodicMemoryRequest.
     */
    validateRequestEnvelope(request) {
        if (!request || typeof request !== 'object') {
            throw new MemoryValidationError('EpisodicMemoryRequest must be a non-null object');
        }
        try {
            const serialized = JSON.stringify(request);
            if (Buffer.byteLength(serialized, 'utf8') > this.maxPayloadBytes) {
                throw new MemorySecurityViolationError(`Memory request payload exceeds limit of ${this.maxPayloadBytes} bytes`);
            }
        }
        catch (err) {
            if (err instanceof MemorySecurityViolationError)
                throw err;
            throw new MemoryValidationError(`Cannot serialize memory request: ${err.message}`);
        }
        this.defensivelyValidatePayload(request);
        const req = request;
        if (!req.commitRecord || typeof req.commitRecord !== 'object') {
            throw new MemoryValidationError('EpisodicMemoryRequest is missing commitRecord');
        }
        if (!req.authoritativeTask || typeof req.authoritativeTask !== 'object') {
            throw new MemoryValidationError('EpisodicMemoryRequest is missing authoritativeTask');
        }
        const task = req.authoritativeTask;
        if (!task.taskId || typeof task.taskId !== 'string' || !task.taskId.trim()) {
            throw new MemoryValidationError('authoritativeTask.taskId must be a non-empty string');
        }
        if (!task.tenantId || typeof task.tenantId !== 'string' || !task.tenantId.trim()) {
            throw new MemoryValidationError('authoritativeTask.tenantId must be a non-empty string');
        }
        if (typeof task.version !== 'number' || task.version < 1) {
            throw new MemoryValidationError('authoritativeTask.version must be a positive number');
        }
    }
    /**
     * EN: Validates that the input DurableCommitRecord satisfies commit authority rules.
     * Invariant: Only status === 'COMMITTED' may create authoritative episodic memory.
     */
    validateCommitAuthority(commitRecord) {
        if (!commitRecord.commitId || typeof commitRecord.commitId !== 'string') {
            throw new MemoryValidationError('DurableCommitRecord must include commitId');
        }
        if (!commitRecord.taskId || typeof commitRecord.taskId !== 'string') {
            throw new MemoryValidationError('DurableCommitRecord must include taskId');
        }
        if (!commitRecord.tenantId || typeof commitRecord.tenantId !== 'string') {
            throw new MemoryValidationError('DurableCommitRecord must include tenantId');
        }
        if (!commitRecord.stepId || typeof commitRecord.stepId !== 'string') {
            throw new MemoryValidationError('DurableCommitRecord must include stepId');
        }
        if (!commitRecord.executionId || typeof commitRecord.executionId !== 'string') {
            throw new MemoryValidationError('DurableCommitRecord must include executionId');
        }
        if (!commitRecord.verificationProvenanceHash || typeof commitRecord.verificationProvenanceHash !== 'string' || commitRecord.verificationProvenanceHash.trim().length !== 64) {
            throw new MemoryValidationError('DurableCommitRecord must include valid 64-character verificationProvenanceHash');
        }
        if (!commitRecord.commitProvenanceHash || typeof commitRecord.commitProvenanceHash !== 'string' || commitRecord.commitProvenanceHash.trim().length !== 64) {
            throw new MemoryValidationError('DurableCommitRecord must include valid 64-character commitProvenanceHash');
        }
        if (commitRecord.status !== 'COMMITTED') {
            throw new MemoryValidationError(`Memory authority rejected: DurableCommitRecord status is '${commitRecord.status}', expected 'COMMITTED'`);
        }
    }
    /**
     * EN: Validates task, tenant, step, execution, and version concurrency bindings.
     */
    validateBindings(commitRecord, authoritativeTask, context, expectedTaskVersion) {
        // Tenant Isolation
        if (commitRecord.tenantId.trim() !== authoritativeTask.tenantId.trim()) {
            throw new CrossTenantMemoryError(`Cross-tenant memory violation: commit tenant '${commitRecord.tenantId}' does not match task tenant '${authoritativeTask.tenantId}'`);
        }
        if (context?.tenantId && context.tenantId.trim() !== authoritativeTask.tenantId.trim()) {
            throw new CrossTenantMemoryError(`Cross-tenant memory violation: context tenant '${context.tenantId}' does not match task tenant '${authoritativeTask.tenantId}'`);
        }
        // Task Binding
        if (commitRecord.taskId.trim() !== authoritativeTask.taskId.trim()) {
            throw new MemoryValidationError(`Task mismatch: commit taskId '${commitRecord.taskId}' does not match task '${authoritativeTask.taskId}'`);
        }
        // Concurrency / Version Checks
        if (expectedTaskVersion !== undefined && expectedTaskVersion !== authoritativeTask.version) {
            throw new MemoryValidationError(`Expected task version (${expectedTaskVersion}) does not match authoritative task version ${authoritativeTask.version}`);
        }
        if (commitRecord.taskVersion !== authoritativeTask.version) {
            throw new MemoryValidationError(`Task version mismatch: commit record taskVersion ${commitRecord.taskVersion} does not match authoritative task version ${authoritativeTask.version}`);
        }
        // Path Safety & Identity Checks
        this.validateIdentifierSafety(authoritativeTask.tenantId, 'tenantId');
        this.validateIdentifierSafety(authoritativeTask.taskId, 'taskId');
        this.validateIdentifierSafety(commitRecord.stepId, 'stepId');
        this.validateIdentifierSafety(commitRecord.executionId, 'executionId');
        this.validateIdentifierSafety(commitRecord.verificationId, 'verificationId');
    }
    /**
     * EN: Validates identifier strings against path traversal or reserved keywords.
     */
    validateIdentifierSafety(identifier, fieldName) {
        if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
            throw new MemoryValidationError(`${fieldName} must be a non-empty string`);
        }
        const trimmed = identifier.trim();
        if (trimmed.includes('..') ||
            trimmed.includes('/') ||
            trimmed.includes('\\') ||
            trimmed.includes('\0') ||
            trimmed.includes('shopofbow')) {
            throw new MemorySecurityViolationError(`Security violation: ${fieldName} '${trimmed}' contains forbidden traversal sequences or protected paths`);
        }
    }
    /**
     * EN: Alias for validateIdentifierSafety to validate path safety of identifier tokens.
     */
    validatePathSafety(identifier, fieldName) {
        this.validateIdentifierSafety(identifier, fieldName);
    }
    /**
     * EN: Sanitizes data structures using DiagnosisSanitizer for safe logging and persistence.
     */
    sanitize(data) {
        return this.sanitizer.sanitize(data);
    }
}
export const globalEpisodicMemoryValidator = new EpisodicMemoryValidator();
