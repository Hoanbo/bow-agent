// src/core/phase14Readiness/phase14ExecutionGate.ts
// BOWCON V4.0 — MS-1.4.12: END-TO-END AGENT REALITY VALIDATION & GOVERNED READINESS ASSESSMENT
// Component 970: Phase14ExecutionGate
// Synchronous USER_STOP Supremacy & Multi-Vector Security Boundary
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalAuditLedger } from '../auditLedger.js';
import { Phase14ReadinessAbortedError, Phase14SecurityError, Phase14ValidationError, } from './phase14ReadinessTypes.js';
export class Phase14ExecutionGate {
    _isUserStopActive;
    _getUserStopReason;
    constructor(options) {
        this._isUserStopActive =
            options?.isUserStopActive ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this._getUserStopReason =
            options?.getUserStopReason ?? (() => globalMasterHumanAuthority.userStopReason ?? null);
    }
    assertUserStop(checkpointName, tenantId) {
        if (this._isUserStopActive()) {
            const reason = this._getUserStopReason() || 'Master human emergency stop activated';
            try {
                globalAuditLedger.record({
                    timestamp: new Date().toISOString(),
                    actor: { userId: 'master_human_authority', role: 'MASTER_HUMAN', channel: 'LOCAL_AUTHORITY' },
                    domain: 'phase14_readiness',
                    toolName: 'Phase14ExecutionGate',
                    classification: 'USER_STOP_PREEMPTION',
                    argumentsHash: `user_stop_${checkpointName}`,
                    policyDecision: 'DENY',
                    executionStatus: 'BLOCKED',
                    resultHash: 'assessment_aborted',
                });
            }
            catch {
                // Fail closed; audit recording attempt completed
            }
            throw new Phase14ReadinessAbortedError(`USER_STOP at checkpoint [${checkpointName}] for tenant [${tenantId || 'GLOBAL'}]: ${reason}`);
        }
    }
    validateIdentifier(value, fieldName) {
        if (!value || typeof value !== 'string') {
            throw new Phase14ValidationError(`${fieldName} must be a non-empty string`);
        }
        if (value.length > 256) {
            throw new Phase14ValidationError(`${fieldName} exceeds maximum length of 256 characters`);
        }
        if (value.includes('\0')) {
            throw new Phase14SecurityError(`${fieldName} contains forbidden null byte`);
        }
        if (value.includes('..') || value.includes('/') || value.includes('\\')) {
            throw new Phase14SecurityError(`${fieldName} contains forbidden path traversal characters`);
        }
        if (value.toLowerCase().includes('shopofbow')) {
            throw new Phase14SecurityError(`${fieldName} references protected workspace shopofbow`);
        }
        if (value === '__proto__' || value === 'constructor' || value === 'prototype') {
            throw new Phase14SecurityError(`${fieldName} contains forbidden prototype pollution property name`);
        }
    }
    validatePayload(payload, depth = 0) {
        if (depth > 10) {
            throw new Phase14SecurityError('Payload exceeds maximum nesting depth of 10');
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
        for (const key of Object.keys(payload)) {
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                throw new Phase14SecurityError(`Payload contains prototype pollution key: ${key}`);
            }
            this.validatePayload(payload[key], depth + 1);
        }
    }
    /**
     * Checkpoint 1: Assessment Intake
     */
    assertCheckpoint1_AssessmentIntake(tenantId) {
        this.assertUserStop('CHECKPOINT_1_ASSESSMENT_INTAKE', tenantId);
        this.validateIdentifier(tenantId, 'tenantId');
    }
    /**
     * Checkpoint 2: Chaos Scenario Execution
     */
    assertCheckpoint2_ChaosScenario(scenarioId, tenantId) {
        this.assertUserStop('CHECKPOINT_2_CHAOS_SCENARIO', tenantId);
        this.validateIdentifier(scenarioId, 'scenarioId');
        this.validateIdentifier(tenantId, 'tenantId');
    }
    /**
     * Checkpoint 3: Exit Criteria Evaluation
     */
    assertCheckpoint3_CriteriaEvaluation(criterionId, tenantId) {
        this.assertUserStop('CHECKPOINT_3_CRITERIA_EVALUATION', tenantId);
        this.validateIdentifier(tenantId, 'tenantId');
    }
    /**
     * Checkpoint 4: Provenance Manifest Calculation
     */
    assertCheckpoint4_ProvenanceCalculation(tenantId) {
        this.assertUserStop('CHECKPOINT_4_PROVENANCE_CALCULATION', tenantId);
    }
    /**
     * Checkpoint 5: Readiness Report Sealing
     */
    assertCheckpoint5_ReportSealing(reportId, tenantId) {
        this.assertUserStop('CHECKPOINT_5_REPORT_SEALING', tenantId);
        this.validateIdentifier(reportId, 'reportId');
    }
    /**
     * Checkpoint 6: Result Export
     */
    assertCheckpoint6_ResultExport(reportId, tenantId) {
        this.assertUserStop('CHECKPOINT_6_RESULT_EXPORT', tenantId);
    }
}
