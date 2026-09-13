// src/core/agentObservability/agentExecutionSpanGate.ts
// BOWCON V4.0 — MS-1.4.11: AGENT TASK OBSERVABILITY & DISTRIBUTED TRACING
// Component 964: AgentExecutionSpanGate
// Synchronous USER_STOP Enforcement & Multi-Vector Security Gate
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger } from '../auditLedger.js';
import { AgentObservabilityAbortedError, AgentObservabilityConcurrencyError, AgentObservabilitySecurityError, AgentObservabilityValidationError, OBSERVABILITY_BOUNDS, } from './agentTraceTypes.js';
export class AgentExecutionSpanGate {
    _isUserStopActive;
    _getUserStopReason;
    constructor(options) {
        this._isUserStopActive =
            options?.isUserStopActive ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this._getUserStopReason =
            options?.getUserStopReason ?? (() => globalMasterHumanAuthority.userStopReason ?? null);
    }
    /**
     * Internal helper to assert USER_STOP supremacy synchronously at a checkpoint
     */
    assertUserStop(checkpointName, tenantId, taskId) {
        if (this._isUserStopActive()) {
            const reason = this._getUserStopReason() || 'Master human emergency stop activated';
            try {
                globalAuditLedger.record({
                    timestamp: new Date().toISOString(),
                    actor: { userId: 'master_human_authority', role: 'MASTER_HUMAN', channel: 'LOCAL_AUTHORITY' },
                    domain: 'agent_observability',
                    toolName: 'AgentExecutionSpanGate',
                    classification: 'USER_STOP_PREEMPTION',
                    argumentsHash: 'user_stop_preemption',
                    policyDecision: 'DENY',
                    executionStatus: 'BLOCKED',
                    resultHash: 'user_stop_aborted',
                });
            }
            catch {
                // Fail closed; audit recording attempt completed
            }
            throw new AgentObservabilityAbortedError(`USER_STOP at checkpoint [${checkpointName}] for tenant [${tenantId}] task [${taskId}]: ${reason}`);
        }
    }
    /**
     * Validate string against injection, path traversal, prototype pollution, and null bytes
     */
    validateIdentifier(value, fieldName) {
        if (!value || typeof value !== 'string') {
            throw new AgentObservabilityValidationError(`${fieldName} must be a non-empty string`);
        }
        if (value.length > 256) {
            throw new AgentObservabilityValidationError(`${fieldName} exceeds maximum length of 256 characters`);
        }
        if (value.includes('\0')) {
            throw new AgentObservabilitySecurityError(`${fieldName} contains forbidden null byte`);
        }
        if (value.includes('..') || value.includes('/') || value.includes('\\')) {
            throw new AgentObservabilitySecurityError(`${fieldName} contains forbidden path traversal characters`);
        }
        if (value.toLowerCase().includes('shopofbow')) {
            throw new AgentObservabilitySecurityError(`${fieldName} references protected workspace shopofbow`);
        }
        if (value === '__proto__' || value === 'constructor' || value === 'prototype') {
            throw new AgentObservabilitySecurityError(`${fieldName} contains forbidden prototype pollution property name`);
        }
    }
    /**
     * Validate generic object payload against prototype pollution and size limits
     */
    validatePayload(payload, depth = 0) {
        if (depth > 10) {
            throw new AgentObservabilitySecurityError('Payload exceeds maximum nesting depth of 10');
        }
        if (payload === null || typeof payload !== 'object') {
            return;
        }
        if (Array.isArray(payload)) {
            for (const item of payload) {
                this.validatePayload(item, depth + 1);
            }
            return;
        }
        const jsonString = JSON.stringify(payload);
        if (jsonString && jsonString.length > OBSERVABILITY_BOUNDS.MAX_PAYLOAD_SIZE_BYTES) {
            throw new AgentObservabilitySecurityError(`Payload size ${jsonString.length} bytes exceeds maximum limit of ${OBSERVABILITY_BOUNDS.MAX_PAYLOAD_SIZE_BYTES}`);
        }
        for (const key of Object.keys(payload)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                throw new AgentObservabilitySecurityError(`Payload contains prototype pollution key: ${key}`);
            }
            this.validatePayload(payload[key], depth + 1);
        }
    }
    /**
     * Checkpoint 1: Trace Creation
     */
    assertCheckpoint1_TraceCreation(tenantId, taskId, taskVersion) {
        this.assertUserStop('CHECKPOINT_1_TRACE_CREATION', tenantId, taskId);
        this.validateIdentifier(tenantId, 'tenantId');
        this.validateIdentifier(taskId, 'taskId');
        if (typeof taskVersion !== 'number' || taskVersion < 1 || !Number.isInteger(taskVersion)) {
            throw new AgentObservabilityValidationError(`Invalid taskVersion: ${taskVersion}`);
        }
    }
    /**
     * Checkpoint 2: Span Collection
     */
    assertCheckpoint2_SpanCollection(expectedTenantId, spanTenantId, expectedTaskId, spanTaskId, expectedTaskVersion, spanTaskVersion) {
        this.assertUserStop('CHECKPOINT_2_SPAN_COLLECTION', expectedTenantId, expectedTaskId);
        if (expectedTenantId !== spanTenantId) {
            throw new AgentObservabilitySecurityError(`Cross-tenant span violation: expected ${expectedTenantId}, got ${spanTenantId}`);
        }
        if (expectedTaskId !== spanTaskId) {
            throw new AgentObservabilityValidationError(`Task mismatch in span: expected ${expectedTaskId}, got ${spanTaskId}`);
        }
        if (expectedTaskVersion !== spanTaskVersion) {
            throw new AgentObservabilityConcurrencyError(`Stale task version in span: expected ${expectedTaskVersion}, got ${spanTaskVersion}`);
        }
    }
    /**
     * Checkpoint 3: Telemetry Emission
     */
    assertCheckpoint3_TelemetryEmission(expectedTenantId, eventTenantId, expectedTaskId, eventTaskId, payload) {
        this.assertUserStop('CHECKPOINT_3_TELEMETRY_EMISSION', expectedTenantId, expectedTaskId);
        if (expectedTenantId !== eventTenantId) {
            throw new AgentObservabilitySecurityError(`Cross-tenant telemetry violation: expected ${expectedTenantId}, got ${eventTenantId}`);
        }
        if (expectedTaskId !== eventTaskId) {
            throw new AgentObservabilityValidationError(`Task mismatch in telemetry: expected ${expectedTaskId}, got ${eventTaskId}`);
        }
        this.validatePayload(payload);
    }
    /**
     * Checkpoint 4: SLO Measurement
     */
    assertCheckpoint4_SLOMeasurement(tenantId, taskId) {
        this.assertUserStop('CHECKPOINT_4_SLO_MEASUREMENT', tenantId, taskId);
    }
    /**
     * Checkpoint 5: Span Sealing
     */
    assertCheckpoint5_SpanSealing(tenantId, taskId, spanId) {
        this.assertUserStop('CHECKPOINT_5_SPAN_SEALING', tenantId, taskId);
        this.validateIdentifier(spanId, 'spanId');
    }
    /**
     * Checkpoint 6: Trace Sealing
     */
    assertCheckpoint6_TraceSealing(tenantId, taskId, provenanceReferences) {
        this.assertUserStop('CHECKPOINT_6_TRACE_SEALING', tenantId, taskId);
        // Validate provenance hashes if provided
        for (const [key, hash] of Object.entries(provenanceReferences)) {
            if (hash !== null && hash !== undefined) {
                if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)) {
                    throw new AgentObservabilityValidationError(`Invalid SHA-256 provenance hash for ${key}: ${hash}`);
                }
            }
        }
    }
    /**
     * Checkpoint 7: Export / Result Generation
     */
    assertCheckpoint7_Export(tenantId, taskId) {
        this.assertUserStop('CHECKPOINT_7_EXPORT', tenantId, taskId);
    }
}
