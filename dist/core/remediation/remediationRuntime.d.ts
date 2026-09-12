import { type AuditLedger } from '../auditLedger.js';
import { MasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import { ObservabilityRuntime } from '../observability/observabilityRuntime.js';
import { type ObservabilitySessionId } from '../observability/observabilityTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { type GovernedRemediationPlan, type RemediationExecutionResult, type RemediationSnapshot, type PostMitigationVerificationResult, type RemediationRollbackResult, type RemediationProvenanceRecord } from './remediationTypes.js';
import { RemediationTokenValidator } from './remediationTokenValidator.js';
import { RemediationSnapshotEngine } from './remediationSnapshotEngine.js';
import { RemediationExecutionEngine } from './remediationExecutionEngine.js';
import { PostMitigationVerificationEngine } from './postMitigationVerificationEngine.js';
import { RemediationRollbackEngine } from './remediationRollbackEngine.js';
import { RemediationProvenanceEngine } from './remediationProvenanceEngine.js';
export interface ExecuteGovernedRemediationRequest {
    readonly plan: GovernedRemediationPlan;
    readonly token?: AuthorizationToken;
    readonly operatorId?: string;
    readonly sessionId?: ObservabilitySessionId;
    readonly baseDirectory?: string;
    readonly storageDirectory?: string;
    readonly simulateVerificationFailure?: boolean;
    readonly simulateRollbackFailure?: boolean;
}
export interface GovernedRemediationPipelineResponse {
    readonly executionResult: RemediationExecutionResult;
    readonly snapshot?: RemediationSnapshot;
    readonly verificationResult?: PostMitigationVerificationResult;
    readonly rollbackResult?: RemediationRollbackResult;
    readonly provenanceRecord?: RemediationProvenanceRecord;
}
export declare class RemediationRuntime {
    readonly tokenValidator: RemediationTokenValidator;
    readonly snapshotEngine: RemediationSnapshotEngine;
    readonly executionEngine: RemediationExecutionEngine;
    readonly verificationEngine: PostMitigationVerificationEngine;
    readonly rollbackEngine: RemediationRollbackEngine;
    readonly provenanceEngine: RemediationProvenanceEngine;
    readonly observabilityRuntime: ObservabilityRuntime;
    readonly supervisorHumanGate: SupervisorHumanGate;
    readonly masterAuthority: MasterHumanAuthority;
    private readonly auditLedger;
    private isUserStopActiveFlag;
    constructor(tokenValidator?: RemediationTokenValidator, snapshotEngine?: RemediationSnapshotEngine, executionEngine?: RemediationExecutionEngine, verificationEngine?: PostMitigationVerificationEngine, rollbackEngine?: RemediationRollbackEngine, provenanceEngine?: RemediationProvenanceEngine, observabilityRuntime?: ObservabilityRuntime, supervisorHumanGate?: SupervisorHumanGate, masterAuthority?: MasterHumanAuthority, auditLedger?: AuditLedger);
    /**
     * Triggers or clears emergency USER_STOP.
     * Kích hoạt hoặc xóa tín hiệu USER_STOP khẩn cấp.
     */
    setUserStop(active: boolean): void;
    isUserStopActive(): boolean;
    /**
     * Helper to append an immutable event to canonical globalAuditLedger under domain 'INCIDENT_REMEDIATION'.
     * Trợ giúp ghi sự kiện bất biến vào globalAuditLedger chuẩn tắc dưới miền 'INCIDENT_REMEDIATION'.
     */
    private logAudit;
    /**
     * Main closed-loop governed remediation execution pipeline.
     * Đường ống thực thi khắc phục có quản trị vòng lặp kín chính.
     */
    executeRemediation(request: ExecuteGovernedRemediationRequest): Promise<GovernedRemediationPipelineResponse>;
}
