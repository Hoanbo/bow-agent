import { type PhaseTransitionProvenanceRecord, type PhaseTransitionType, type PhaseState } from './policyPhaseTransitionTypes.js';
export declare class PolicyPhaseTransitionProvenanceEngine {
    private readonly chains;
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Records a phase transition governance event in the tenant's append-only cryptographic chain.
     */
    recordTransitionEvent(params: {
        readonly tenantId: string;
        readonly transitionType: PhaseTransitionType;
        readonly targetPhase: PhaseState;
        readonly entityId: string;
        readonly payload: Record<string, any>;
        readonly timestamp?: string;
    }): PhaseTransitionProvenanceRecord;
    /**
     * Verifies the cryptographic chain integrity for a tenant.
     * Fails closed if any link is altered or missing.
     */
    verifyChain(tenantId: string): {
        readonly valid: boolean;
        readonly error?: string;
    };
    /**
     * Retrieves the immutable record trail for a tenant.
     */
    getChain(tenantId: string): readonly PhaseTransitionProvenanceRecord[];
}
