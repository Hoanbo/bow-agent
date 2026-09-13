import type { RemediationExecutionEnvelope } from '../policyDecision/policyDecisionTypes.js';
import { type ExecutionReceipt, type ExecutionVerificationResult, type PolicyExecutionOptions } from './policyExecutionTypes.js';
import { PolicyRemediationExecutionValidator } from './policyRemediationExecutionValidator.js';
import { PolicyExecutionIdempotencyGuard } from './policyExecutionIdempotencyGuard.js';
import { PolicyExecutionOutcomeVerifier } from './policyExecutionOutcomeVerifier.js';
import { PolicyExecutionAuditEngine } from './policyExecutionAuditEngine.js';
import { PolicyExecutionProvenanceEngine } from './policyExecutionProvenanceEngine.js';
import { PolicyCanaryCircuitBreaker } from '../policyCanary/policyCanaryCircuitBreaker.js';
import { PolicyCanaryRollbackEngine } from '../policyCanary/policyCanaryRollbackEngine.js';
import { PolicyRingRouter } from '../policyCanary/policyRingRouter.js';
import { GovernedPolicyEnforcementPoint } from '../policyEnforcement/governedPolicyEnforcementPoint.js';
export interface PolicyExecutionRuntimeOptions extends PolicyExecutionOptions {
    readonly validator?: PolicyRemediationExecutionValidator;
    readonly idempotencyGuard?: PolicyExecutionIdempotencyGuard;
    readonly outcomeVerifier?: PolicyExecutionOutcomeVerifier;
    readonly auditEngine?: PolicyExecutionAuditEngine;
    readonly provenanceEngine?: PolicyExecutionProvenanceEngine;
    readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
    readonly rollbackEngine?: PolicyCanaryRollbackEngine;
    readonly ringRouter?: PolicyRingRouter;
    readonly pep?: GovernedPolicyEnforcementPoint;
}
export declare class PolicyExecutionRuntime {
    private readonly validator;
    private readonly idempotencyGuard;
    private readonly outcomeVerifier;
    private readonly auditEngine;
    private readonly provenanceEngine;
    private readonly circuitBreaker;
    private readonly rollbackEngine;
    private readonly ringRouter;
    private readonly pep?;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyExecutionRuntimeOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Executes a sealed remediation execution envelope through the governed pipeline.
     * Thực thi một phong bì thực thi khắc phục đã niêm phong qua đường ống có quản trị.
     */
    executeEnvelope(envelope: RemediationExecutionEnvelope): Promise<{
        readonly receipt: ExecutionReceipt;
        readonly verification: ExecutionVerificationResult;
    }>;
}
export declare const globalPolicyExecutionRuntime: PolicyExecutionRuntime;
