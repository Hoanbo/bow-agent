// src/core/policyPhaseExitAudit/policyPhaseExitIndependentAssessmentEngine.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Independent Assessment & Readiness Synthesis Engine (Component 895).
// Evaluates the 24 canonical Phase 1.3 exit criteria against physical evidence.
// Determines readiness status strictly as READY_FOR_PHASE_EXIT_REVIEW or NOT_READY.
//
// Core Authority Invariants:
// - READINESS_ASSESSMENT != PHASE_EXIT_AUTHORIZATION
// - READINESS_ASSESSMENT != PHASE_EXIT_COMMIT
// - PHASE_EXIT != PHASE_1_4_ENTRY
// - ZERO AUTONOMOUS PHASE TRANSITION AUTHORITY
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import * as crypto from 'crypto';
import { createPhaseExitAuditId, createAuditReportId, createAuditCriterionId, } from './policyPhaseExitAuditTypes.js';
import { PolicyPhaseExitEvidenceStrengthEngine } from './policyPhaseExitEvidenceStrength.js';
export const CANONICAL_AUDIT_CRITERIA = Object.freeze([
    { criterionId: createAuditCriterionId('CRITERION_GOVERNANCE_COVERAGE'), criterionNumber: 1, name: 'Governance Plane Coverage', description: 'All 16 Phase 1.3 governance milestones implemented with complete codebases', requiredStrength: 'STATIC_CODE_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.63', 'MS-1.3.64', 'MS-1.3.65', 'MS-1.3.66', 'MS-1.3.67', 'MS-1.3.68', 'MS-1.3.69', 'MS-1.3.70', 'MS-1.3.71', 'MS-1.3.72', 'MS-1.3.73', 'MS-1.3.74', 'MS-1.3.75', 'MS-1.3.76', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_GOVERNANCE_SEPARATION'), criterionNumber: 2, name: 'Governance Separation of Duties', description: 'Strict authority separation across all governance planes', requiredStrength: 'INTEGRATION_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.69', 'MS-1.3.70', 'MS-1.3.72', 'MS-1.3.75', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_HUMAN_AUTHORITY'), criterionNumber: 3, name: 'Human Authority Supremacy', description: 'Human-in-the-loop gates required for candidate approvals and phase transitions', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.69', 'MS-1.3.70', 'MS-1.3.72', 'MS-1.3.75', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_ZERO_AUTONOMOUS_POLICY_MUTATION'), criterionNumber: 4, name: 'Zero Autonomous Policy Mutation', description: 'Prohibition of autonomous policy mutation capabilities', requiredStrength: 'SECURITY_SCAN_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.63', 'MS-1.3.70', 'MS-1.3.71'] },
    { criterionId: createAuditCriterionId('CRITERION_ZERO_AUTONOMOUS_ACTIVATION'), criterionNumber: 5, name: 'Zero Autonomous Activation', description: 'Prohibition of autonomous staged activation', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.70'] },
    { criterionId: createAuditCriterionId('CRITERION_ZERO_AUTONOMOUS_ROLLBACK'), criterionNumber: 6, name: 'Zero Autonomous Rollback', description: 'Prohibition of autonomous policy rollback execution', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.72', 'MS-1.3.75'] },
    { criterionId: createAuditCriterionId('CRITERION_RUNTIME_ENFORCEMENT'), criterionNumber: 7, name: 'Active Runtime Enforcement', description: 'Active policy runtime synchronization and invariant verification', requiredStrength: 'DIRECT_RUNTIME_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.63', 'MS-1.3.71'] },
    { criterionId: createAuditCriterionId('CRITERION_FAIL_CLOSED_BEHAVIOR'), criterionNumber: 8, name: 'Fail-Closed Default', description: 'Immediate fail-closed behavior upon error, missing input, or anomaly', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.63', 'MS-1.3.74', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_HARD_FORBIDDEN_FLOOR'), criterionNumber: 9, name: 'Hard-Forbidden Floor', description: 'Zero forbidden process execution primitives across governance plane', requiredStrength: 'SECURITY_SCAN_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_USER_STOP'), criterionNumber: 10, name: 'USER_STOP Supremacy', description: 'Immediate halting of all runtime operations upon USER_STOP activation', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_TENANT_ISOLATION'), criterionNumber: 11, name: 'Tenant Isolation Security', description: 'Multi-tenant data partitioning, path traversal defense, and reserved name checks', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_PROVENANCE'), criterionNumber: 12, name: 'Cryptographic Provenance Chains', description: 'Append-only SHA-256 hash chains for candidates, authorizations, and commits', requiredStrength: 'PROVENANCE_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.69', 'MS-1.3.70', 'MS-1.3.72', 'MS-1.3.75', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_AUDITABILITY'), criterionNumber: 13, name: 'Canonical Audit Ledger Integration', description: 'Structured audit events recorded under domain boundaries with secret scrubbing', requiredStrength: 'AUDIT_LEDGER_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.66', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_POLICY_LIFECYCLE_CONSISTENCY'), criterionNumber: 14, name: 'Policy Lifecycle Reconciliation', description: 'Multi-tenant active policy reconciliation and state verification', requiredStrength: 'DIRECT_RUNTIME_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.73'] },
    { criterionId: createAuditCriterionId('CRITERION_INCIDENT_SAFETY'), criterionNumber: 15, name: 'Incident Response & Containment', description: 'Circuit-breaking and containment boundaries for policy incidents', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.74'] },
    { criterionId: createAuditCriterionId('CRITERION_RECOVERY_SAFETY'), criterionNumber: 16, name: 'Recovery Authorization Boundary', description: 'Governed handoff and human recovery authorization', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.75'] },
    { criterionId: createAuditCriterionId('CRITERION_INCIDENT_CLOSURE'), criterionNumber: 17, name: 'Governed Incident Closure', description: 'Immutable incident closure and historical preservation', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.75'] },
    { criterionId: createAuditCriterionId('CRITERION_NO_AUTHORITY_DUPLICATION'), criterionNumber: 18, name: 'Zero Authority Duplication', description: 'Single authoritative source for policy decisions and enforcement', requiredStrength: 'STATIC_CODE_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.63', 'MS-1.3.68'] },
    { criterionId: createAuditCriterionId('CRITERION_INTEGRATION_REALITY'), criterionNumber: 19, name: 'Real Component Integration', description: 'High percentage of REAL components in matrix without synthetic shortcuts', requiredStrength: 'INTEGRATION_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_REGRESSION_INTEGRITY'), criterionNumber: 20, name: 'Full Regression Suite Cleanliness', description: '80+ test suites passing cleanly with zero failed tests', requiredStrength: 'REGRESSION_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_BUILD_INTEGRITY'), criterionNumber: 21, name: 'Build & Typecheck Integrity', description: 'TypeScript typechecking and production build exit with code 0', requiredStrength: 'STATIC_CODE_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_SECURITY_INTEGRITY'), criterionNumber: 22, name: 'Security AST Cleanliness', description: 'Zero unauthorized subprocess calls or dynamic evaluation in production code', requiredStrength: 'SECURITY_SCAN_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_PROTECTED_WORKSPACE'), criterionNumber: 23, name: 'Protected Workspace Isolation', description: 'Protected workspace C:\\BOW\\shopofbow untouched (0 touches)', requiredStrength: 'STATIC_CODE_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.62', 'MS-1.3.77'] },
    { criterionId: createAuditCriterionId('CRITERION_NO_UNVERIFIED_CLAIMS'), criterionNumber: 24, name: 'Evidence Grounding & Non-Circularity', description: 'All claims grounded in verifiable empirical evidence without circular citations', requiredStrength: 'DIRECT_TEST_EVIDENCE', isMandatory: true, targetMilestones: ['MS-1.3.78'] },
]);
export class PolicyPhaseExitIndependentAssessmentEngine {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Assessment engine suspended by USER_STOP supremacy');
        }
    }
    /**
     * Evaluates all 24 canonical criteria and produces an immutable IndependentAuditReport.
     */
    conductAssessment(params) {
        this.assertUserStopInactive();
        const now = new Date().toISOString();
        const auditId = createPhaseExitAuditId(`audit_${params.tenantPartition}_${Date.now()}`);
        const reportId = createAuditReportId(`rep_${auditId}`);
        const evaluations = [];
        const unresolvedRisks = [];
        let passedCount = 0;
        for (const def of CANONICAL_AUDIT_CRITERIA) {
            const matchedEvidence = params.evidenceItems.filter(e => e.criterionId === def.criterionId);
            if (matchedEvidence.length === 0) {
                evaluations.push(Object.freeze({
                    criterion: def,
                    status: 'INSUFFICIENT_EVIDENCE',
                    evidenceItems: Object.freeze([]),
                    failureReason: `No evidence items found for criterion ${def.name}`,
                    riskLevel: def.isMandatory ? 'CRITICAL' : 'MEDIUM',
                    independentVerification: false,
                }));
                if (def.isMandatory)
                    unresolvedRisks.push(`Missing evidence for mandatory criterion: ${def.name}`);
                continue;
            }
            // Check evidence verification and strength
            let hasSufficientStrength = false;
            let allVerified = true;
            let circularDetected = false;
            for (const ev of matchedEvidence) {
                if (!ev.verified)
                    allVerified = false;
                if (ev.evidenceStrength === 'CLAIM_ONLY') {
                    // CLAIM_ONLY is never sufficient for mandatory
                }
                else if (PolicyPhaseExitEvidenceStrengthEngine.isStrengthSufficient(ev.evidenceStrength, def.requiredStrength)) {
                    hasSufficientStrength = true;
                }
                if (ev.details?.circularCitation) {
                    circularDetected = true;
                }
            }
            if (circularDetected) {
                evaluations.push(Object.freeze({
                    criterion: def,
                    status: 'CIRCULAR_EVIDENCE',
                    evidenceItems: Object.freeze(matchedEvidence),
                    failureReason: `Circular evidence dependency detected for ${def.name}`,
                    riskLevel: 'CRITICAL',
                    independentVerification: false,
                }));
                unresolvedRisks.push(`Circular evidence in ${def.name}`);
            }
            else if (!allVerified) {
                evaluations.push(Object.freeze({
                    criterion: def,
                    status: 'FAIL',
                    evidenceItems: Object.freeze(matchedEvidence),
                    failureReason: `One or more evidence items failed verification for ${def.name}`,
                    riskLevel: 'CRITICAL',
                    independentVerification: true,
                }));
                unresolvedRisks.push(`Failed verification in ${def.name}`);
            }
            else if (!hasSufficientStrength) {
                evaluations.push(Object.freeze({
                    criterion: def,
                    status: 'INSUFFICIENT_EVIDENCE',
                    evidenceItems: Object.freeze(matchedEvidence),
                    failureReason: `Evidence strength is insufficient for ${def.name}; requires at least ${def.requiredStrength}`,
                    riskLevel: 'HIGH',
                    independentVerification: true,
                }));
                unresolvedRisks.push(`Insufficient evidence strength for ${def.name}`);
            }
            else {
                passedCount++;
                evaluations.push(Object.freeze({
                    criterion: def,
                    status: 'PASS',
                    evidenceItems: Object.freeze(matchedEvidence),
                    riskLevel: 'NONE',
                    independentVerification: true,
                }));
            }
        }
        const totalCriteriaCount = CANONICAL_AUDIT_CRITERIA.length;
        const allMandatoryPassed = evaluations.every(e => !e.criterion.isMandatory || e.status === 'PASS');
        const readinessStatus = allMandatoryPassed && unresolvedRisks.length === 0
            ? 'READY_FOR_PHASE_EXIT_REVIEW'
            : 'NOT_READY';
        const coveragePercentage = totalCriteriaCount > 0 ? Math.round((passedCount / totalCriteriaCount) * 100) : 0;
        const auditedMilestones = [
            'MS-1.3.62', 'MS-1.3.63', 'MS-1.3.64', 'MS-1.3.65',
            'MS-1.3.66', 'MS-1.3.67', 'MS-1.3.68', 'MS-1.3.69',
            'MS-1.3.70', 'MS-1.3.71', 'MS-1.3.72', 'MS-1.3.73',
            'MS-1.3.74', 'MS-1.3.75', 'MS-1.3.76', 'MS-1.3.77',
        ];
        const reportPayload = {
            reportId,
            auditId,
            tenantPartition: params.tenantPartition,
            assessmentTimestamp: now,
            passedCriteriaCount: passedCount,
            totalCriteriaCount,
            readinessStatus,
            unresolvedRisks,
        };
        const reportHash = crypto.createHash('sha256').update(JSON.stringify(reportPayload)).digest('hex');
        return Object.freeze({
            reportId,
            auditId,
            tenantPartition: params.tenantPartition,
            assessmentTimestamp: now,
            auditedMilestones: Object.freeze(auditedMilestones),
            criteriaEvaluations: Object.freeze(evaluations),
            passedCriteriaCount: passedCount,
            totalCriteriaCount,
            readinessStatus,
            phaseExitAuthorization: 'HUMAN_AUTHORITY_REQUIRED',
            autonomousPhaseExit: 'FORBIDDEN',
            phase14Entry: 'FORBIDDEN',
            unresolvedRisks: Object.freeze(unresolvedRisks),
            evidenceCoveragePercentage: coveragePercentage,
            reportHash,
        });
    }
}
