import type { HumanDecisionRecord, HumanDecisionToken, HumanReviewRequirements } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export interface HumanVerificationResult {
    verified: boolean;
    operatorId: string;
    proposalId: string;
    dossierProvenanceHash: string;
    policyDeltaHash: string;
    criticalAffirmed: boolean;
    verificationTimestamp: number;
    tokenHash: string;
}
export interface GovernanceKeyProvider {
    resolveKey(keyId: string): string | undefined;
}
export declare class HumanDecisionTokenVerificationEngine {
    private readonly consumedNonces;
    private readonly keyProvider;
    private readonly isUserStopActiveFn?;
    private readonly isEmergencyStopActiveFn?;
    private readonly criticalTtlMs;
    private readonly nonceRegistryPath;
    constructor(options?: {
        signingSecret?: string;
        keyProvider?: GovernanceKeyProvider;
        criticalTtlMs?: number;
        nonceRegistryPath?: string;
        isUserStopActive?: (tenantId?: string) => boolean;
        isEmergencyStopActive?: (domain?: string) => boolean;
    });
    verifyDecisionToken(token: HumanDecisionToken, record: HumanDecisionRecord, dossierProvenanceHash: string, requirements?: HumanReviewRequirements): HumanVerificationResult;
    isNonceConsumed(nonce: string, tenantId?: string): boolean;
    private loadNonceRegistry;
    private persistNonceRegistry;
    private acquireNonceLock;
    private assertEmergencyStopInactive;
    private isSyntheticIdentity;
    private hasSecondaryAuthorityClaim;
}
