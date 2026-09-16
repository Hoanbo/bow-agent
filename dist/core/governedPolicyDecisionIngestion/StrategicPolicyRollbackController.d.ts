import { type PolicyRollbackRecord } from './GovernedPolicyDecisionIngestionTypes.js';
import type { StrategicPolicyVersionStore } from './StrategicPolicyVersionStore.js';
import type { StrategicPolicyStagedDeploymentController } from './StrategicPolicyStagedDeploymentController.js';
import type { HumanDecisionRecord, HumanDecisionToken } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { HumanDecisionTokenVerificationEngine } from './HumanDecisionTokenVerificationEngine.js';
export declare class StrategicPolicyRollbackController {
    private readonly versionStore;
    private readonly deploymentController?;
    private readonly tokenVerifier?;
    private readonly isEmergencyStopActiveFn?;
    private readonly rollbackRecords;
    constructor(versionStore: StrategicPolicyVersionStore, deploymentController?: StrategicPolicyStagedDeploymentController | undefined, tokenVerifier?: HumanDecisionTokenVerificationEngine | undefined, isEmergencyStopActiveFn?: ((domain?: string) => boolean) | undefined);
    /**
     * Execute automated or manual rollback of active policy to the verified prior version.
     * Thực hiện rollback tự động hoặc thủ công về phiên bản chính sách đã xác minh trước đó.
     */
    executeRollback(params: {
        tenantId: string;
        policyDomain: string;
        reason: string;
        triggeredBy: 'AUTOMATIC_CIRCUIT_BREAKER' | 'AUTOMATIC_HEALTH_CHECK' | 'MANUAL_OPERATOR_REVOCATION' | 'USER_STOP' | 'EMERGENCY_STOP';
        rollbackAuthorization?: {
            token: HumanDecisionToken;
            record: HumanDecisionRecord;
        };
    }): PolicyRollbackRecord;
    getRollbackRecord(rollbackId: string): PolicyRollbackRecord | undefined;
}
