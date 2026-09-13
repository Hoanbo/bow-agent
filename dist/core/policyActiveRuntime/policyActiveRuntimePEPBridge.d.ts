import { ApprovalService } from '../approvalService.js';
import type { RuntimePolicySnapshot, RuntimePEPEnforcementResult, PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
import { PolicyActiveRuntimePDPBridge } from './policyActiveRuntimePDPBridge.js';
export declare class PolicyActiveRuntimePEPBridge {
    private readonly pdpBridge;
    private readonly approvalService;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRuntimeOptions, pdpBridge?: PolicyActiveRuntimePDPBridge, approvalService?: ApprovalService);
    private assertUserStopInactive;
    /**
     * Enforces policy boundaries prior to execution.
     * If action is HIGH_IMPACT, verifies valid single-use execution token.
     */
    enforceBeforeExecution(action: string, snapshot: RuntimePolicySnapshot, args?: Record<string, any>, executionToken?: string, actorUserId?: string): RuntimePEPEnforcementResult;
}
