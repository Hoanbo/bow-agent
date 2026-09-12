import { type PolicyLifecycleTrace } from './policyEvidenceQueryTypes.js';
import type { PolicyCandidateId } from '../policyCanary/policyCanaryTypes.js';
import { PolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
import { PolicyCanaryProvenanceEngine } from '../policyCanary/policyCanaryProvenanceEngine.js';
export interface PolicyLifecycleTraceEngineOptions {
    readonly evidenceCollector?: PolicyEvidenceCollector;
    readonly provenanceEngine?: PolicyCanaryProvenanceEngine;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyLifecycleTraceEngine {
    private readonly evidenceCollector;
    private readonly provenanceEngine;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyLifecycleTraceEngineOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Reconstructs the end-to-end lifecycle trace for a policy candidate.
     * Tái tạo dấu vết vòng đời đầu-cuối cho một ứng viên chính sách.
     */
    reconstructTrace(tenantPartition: string, candidateId: PolicyCandidateId): PolicyLifecycleTrace;
}
export declare const globalPolicyLifecycleTraceEngine: PolicyLifecycleTraceEngine;
