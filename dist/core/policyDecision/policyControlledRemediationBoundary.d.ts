import { type RemediationRequest, type ControlledRemediationResult } from './policyDecisionTypes.js';
import { PolicyCanaryCircuitBreaker } from '../policyCanary/policyCanaryCircuitBreaker.js';
export interface PolicyControlledRemediationBoundaryOptions {
    readonly circuitBreaker?: PolicyCanaryCircuitBreaker;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyControlledRemediationBoundary {
    private readonly circuitBreaker;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyControlledRemediationBoundaryOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Validates safety preconditions and creates a governed execution envelope.
     * Does NOT call tools directly; prepares the envelope for downstream governed dispatch.
     *
     * Thẩm định các điều kiện tiên quyết an toàn và tạo phong bì thực thi có quản trị.
     * KHÔNG gọi trực tiếp công cụ; chuẩn bị phong bì cho việc điều phối có quản trị tiếp theo.
     */
    dispatchRemediation(request: RemediationRequest): ControlledRemediationResult;
}
export declare const globalPolicyControlledRemediationBoundary: PolicyControlledRemediationBoundary;
