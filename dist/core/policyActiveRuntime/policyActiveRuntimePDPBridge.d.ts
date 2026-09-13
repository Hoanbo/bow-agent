import { PolicyDecisionPoint } from '../policyDecisionPoint.js';
import type { RuntimePolicySnapshot, RuntimePDPDecision, PolicyActiveRuntimeOptions } from './policyActiveRuntimeTypes.js';
export declare class PolicyActiveRuntimePDPBridge {
    private readonly pdp;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyActiveRuntimeOptions, pdp?: PolicyDecisionPoint);
    private assertUserStopInactive;
    /**
     * Evaluates a proposed tool action against the active runtime policy snapshot.
     */
    evaluateActionAgainstSnapshot(action: string, snapshot: RuntimePolicySnapshot, args?: Record<string, any>, actor?: {
        userId?: string;
        role?: string;
        channel?: string;
        isOwner?: boolean;
    }): RuntimePDPDecision;
}
