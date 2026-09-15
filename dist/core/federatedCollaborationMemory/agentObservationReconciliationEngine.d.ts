import { AgentObservation, ObservationReconciliationRecord } from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export interface SubmitObservationParams {
    readonly observationId: string;
    readonly tenantId: string;
    readonly sessionId: string;
    readonly missionId: string;
    readonly objectiveId: string;
    readonly federationId: string;
    readonly agentId: string;
    readonly generation: number;
    readonly observationType: string;
    readonly target: string;
    readonly observedValue: string;
    readonly confidence: number;
}
export declare class AgentObservationReconciliationEngine {
    private readonly securityBoundary;
    private readonly observations;
    private readonly reconciliations;
    constructor(options?: {
        readonly securityBoundary?: CollaborationMemorySecurityBoundary;
    });
    /**
     * EN: Submits a single agent observation with security validation.
     * VI: Gửi một quan sát tác tử đơn lẻ với xác thực bảo mật.
     */
    submitObservation(params: SubmitObservationParams): AgentObservation;
    /**
     * EN: Reconciles a set of observation IDs for a specific target.
     * VI: Đối soát một tập hợp các mã định danh quan sát cho một mục tiêu cụ thể.
     */
    reconcileObservations(reconciliationId: string, observationIds: readonly string[], tenantId: string, sessionId: string, federationId: string, target: string, minConfidenceThreshold?: number): ObservationReconciliationRecord;
    /**
     * EN: Retrieves an observation by ID.
     * VI: Lấy một quan sát theo mã định danh.
     */
    getObservation(id: string): AgentObservation | undefined;
    /**
     * EN: Retrieves a reconciliation record by ID.
     * VI: Lấy một bản ghi đối soát theo mã định danh.
     */
    getReconciliation(id: string): ObservationReconciliationRecord | undefined;
    /**
     * EN: Clears state.
     * VI: Xóa trạng thái.
     */
    clear(): void;
}
