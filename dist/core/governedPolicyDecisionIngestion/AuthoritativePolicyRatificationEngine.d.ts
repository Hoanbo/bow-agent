import type { PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type AuthoritativeRatificationRecord } from './GovernedPolicyDecisionIngestionTypes.js';
import type { ValidatedIntakeRecord } from './PdpPolicyHandoffIntakeGateway.js';
import type { GovernanceKeyProvider, HumanVerificationResult } from './HumanDecisionTokenVerificationEngine.js';
export declare const SUPREME_FORBIDDEN_MODIFICATIONS: readonly string[];
export interface AuthoritativePolicyRatificationEngineOptions {
    ratificationSecret?: string;
    keyProvider?: GovernanceKeyProvider;
    keyId?: string;
    isUserStopActive?: (tenantId?: string) => boolean;
    isEmergencyStopActive?: (domain?: string) => boolean;
}
export declare class AuthoritativePolicyRatificationEngine {
    private readonly ratificationRecords;
    private readonly activeVersionMap;
    private readonly pdpAuthorityId;
    private readonly ratificationSecret;
    private readonly isUserStopActiveFn?;
    private readonly isEmergencyStopActiveFn?;
    constructor(options?: AuthoritativePolicyRatificationEngineOptions);
    /**
     * Authoritatively ratify a validated handoff package into a canonical ratified policy record.
     * Phê chuẩn có thẩm quyền gói bàn giao đã được xác minh thành bản ghi chính sách chuẩn.
     */
    ratifyPolicy(intake: ValidatedIntakeRecord, humanVerification: HumanVerificationResult, deltas: PolicyDelta[], expectedBaseVersion: number): AuthoritativeRatificationRecord;
    getRatificationRecord(ratificationId: string): AuthoritativeRatificationRecord | undefined;
    getCurrentVersion(tenantId: string, policyDomain: string): number;
    private assertConstitutionalInvariants;
}
