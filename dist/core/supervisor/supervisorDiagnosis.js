// src/core/supervisor/supervisorDiagnosis.ts
// BOWCON V4.0 — MS-1.3.35: REAL BOWCON SUPERVISORY AUTONOMOUS RECOVERY & HUMAN GOVERNANCE RUNTIME
//
// Supervisory Diagnosis Engine.
//
// INVARIANTS:
// DETECTION != DIAGNOSIS
// DIAGNOSIS != AUTHORIZATION
// Honest handling of uncertainty: supports DIAGNOSIS_INCONCLUSIVE.
import crypto from 'node:crypto';
export class SupervisorDiagnosisEngine {
    diagnose(anomaly) {
        const diagnosisId = `diag_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const evidenceList = [anomaly.evidence];
        // 1. Inconclusive Handling
        if (anomaly.type === 'UNKNOWN_ANOMALY' || anomaly.confidence < 0.5) {
            return {
                diagnosisId,
                anomalyId: anomaly.anomalyId,
                timestamp: Date.now(),
                probableCause: 'DIAGNOSIS_INCONCLUSIVE',
                evidence: evidenceList,
                severity: anomaly.severity,
                isInconclusive: true,
                recoverability: 'UNRECOVERABLE',
                recommendedRecovery: 'ESCALATE_TO_OPERATOR',
                requiresHumanApproval: true,
            };
        }
        // 2. Specific Causal Diagnosis
        let probableCause = '';
        let recoverability = 'AUTO_SAFE';
        let recommendedRecovery = '';
        let requiresHumanApproval = false;
        let affectedCapability = undefined;
        let affectedResource = undefined;
        switch (anomaly.type) {
            case 'CAPABILITY_DEGRADED':
                probableCause = 'Transient network latency or capability adapter degradation.';
                recoverability = 'AUTO_SAFE';
                recommendedRecovery = 'REPROBE_CAPABILITY';
                affectedCapability = anomaly.observedState?.capabilityId;
                requiresHumanApproval = false;
                break;
            case 'COGNITIVE_PROVIDER_UNAVAILABLE':
                probableCause = 'Local Ollama daemon unreachable or cognitive circuit breaker open.';
                recoverability = 'AUTO_SAFE';
                recommendedRecovery = 'RECONNECT_COGNITIVE_PROVIDER';
                requiresHumanApproval = false;
                break;
            case 'PROCESS_UNEXPECTED_EXIT':
                probableCause = 'Governed child process terminated unexpectedly.';
                recoverability = 'AUTO_REVERSIBLE';
                recommendedRecovery = 'RESTART_GOVERNED_PROCESS';
                affectedCapability = 'cap_proc_start';
                requiresHumanApproval = false;
                break;
            case 'RESOURCE_LOCK_STUCK':
                probableCause = 'Resource lock remained held beyond nominal timeout threshold.';
                recoverability = 'AUTO_SAFE';
                recommendedRecovery = 'RELEASE_STALE_LOCK';
                requiresHumanApproval = false;
                break;
            case 'WORLDACTION_EXECUTION_FAILURE':
            case 'WORLDACTION_VERIFICATION_FAILURE':
                probableCause = 'Physical filesystem or process mutation verification failure.';
                recoverability = 'HUMAN_REQUIRED';
                recommendedRecovery = 'PROMPT_HUMAN_INSPECTION_AND_ROLLBACK';
                requiresHumanApproval = true;
                break;
            case 'HOST_RESOURCE_EXHAUSTION':
                probableCause = 'Severe host RAM or CPU starvation.';
                recoverability = 'HUMAN_REQUIRED';
                recommendedRecovery = 'TERMINATE_NON_CRITICAL_PROCESSES';
                requiresHumanApproval = true;
                break;
            default:
                probableCause = `General anomaly observed on source: ${anomaly.source}`;
                recoverability = 'AUTO_SAFE';
                recommendedRecovery = 'REFRESH_OBSERVATION';
                requiresHumanApproval = false;
                break;
        }
        return {
            diagnosisId,
            anomalyId: anomaly.anomalyId,
            timestamp: Date.now(),
            probableCause,
            evidence: evidenceList,
            affectedCapability,
            affectedResource,
            severity: anomaly.severity,
            isInconclusive: false,
            recoverability,
            recommendedRecovery,
            requiresHumanApproval,
        };
    }
}
export const globalSupervisorDiagnosis = new SupervisorDiagnosisEngine();
