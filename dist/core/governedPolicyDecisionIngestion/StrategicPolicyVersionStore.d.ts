import { type CanonicalStrategicPolicy, type AuthoritativeRatificationRecord, type PolicyDeploymentRecord } from './GovernedPolicyDecisionIngestionTypes.js';
import type { HumanDecisionRecord, HumanDecisionToken } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { HumanDecisionTokenVerificationEngine } from './HumanDecisionTokenVerificationEngine.js';
export declare class StrategicPolicyVersionStore {
    #private;
    private readonly baseDir;
    private readonly inMemoryCache;
    constructor(customBaseDir?: string, security?: {
        tokenVerifier?: HumanDecisionTokenVerificationEngine;
        isEmergencyStopActive?: (domain?: string) => boolean;
        isUserStopActive?: (tenantId?: string) => boolean;
    });
    /**
     * Save a compiled canonical policy as an immutable historical version and active candidate.
     * Lưu chính sách đã biên dịch thành phiên bản lịch sử bất biến và dự phòng cho active.
     */
    savePolicyVersion(policy: CanonicalStrategicPolicy): void;
    /**
     * Authoritative deployment mutation gate.
     * Direct active-policy mutation without verified sole-human authority, valid
     * ratification certificate, and emergency-stop interlock validation is strictly
     * rejected fail-closed.
     * The underlying mutation primitive is runtime-private (#activateVerifiedPolicy).
     */
    activatePolicy(policy: CanonicalStrategicPolicy, activationAuthorization?: {
        token: HumanDecisionToken;
        record: HumanDecisionRecord;
    }): void;
    /**
     * Get current active policy for a tenant and domain.
     */
    getActivePolicy(tenantId: string, policyDomain: string): CanonicalStrategicPolicy | undefined;
    /**
     * Restore the immediate backup snapshot into active policy.
     * Khôi phục bản sao lưu tức thời thành active policy.
     */
    /**
     * The only restore-capable public API. It verifies sole-human rollback evidence
     * and emergency-stop state itself; the raw mutation primitive is runtime-private.
     */
    restoreFromBackup(tenantId: string, policyDomain: string, rollbackAuthorization?: {
        token: HumanDecisionToken;
        record: HumanDecisionRecord;
    }): CanonicalStrategicPolicy;
    /**
     * Save a ratification record.
     */
    saveRatificationRecord(record: AuthoritativeRatificationRecord): void;
    /**
     * Save a deployment record.
     */
    saveDeploymentRecord(record: PolicyDeploymentRecord): void;
    private ensureDomainDirectory;
    private assertValidTenantAndDomain;
    private atomicWriteJson;
    private atomicWriteJsonWithBackup;
    private recoverActiveFromBackup;
    private reconcileAllPartitions;
}
