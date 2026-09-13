import type { RemediationExecutionEnvelope } from '../policyDecision/policyDecisionTypes.js';
import type { ExecutionPreflightValidation, PolicyExecutionOptions } from './policyExecutionTypes.js';
import { PolicyCanaryCircuitBreaker } from '../policyCanary/policyCanaryCircuitBreaker.js';
export interface PolicyRemediationExecutionValidatorOptions extends PolicyExecutionOptions {
    readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
}
export declare class PolicyRemediationExecutionValidator {
    private readonly circuitBreaker;
    private readonly maxEnvelopeAgeMs;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyRemediationExecutionValidatorOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Pre-flight validates an execution envelope.
     * Throws fail-closed errors on security violations, or returns an ExecutionPreflightValidation.
     *
     * Xác thực tiền bay cho một phong bì thực thi.
     * Ném ra lỗi đóng khi có vi phạm bảo mật, hoặc trả về một ExecutionPreflightValidation.
     */
    validate(envelope: RemediationExecutionEnvelope): ExecutionPreflightValidation;
}
export declare const globalPolicyRemediationExecutionValidator: PolicyRemediationExecutionValidator;
