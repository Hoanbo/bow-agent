import { type AuditLedger } from '../auditLedger.js';
import { LongHorizonAutonomySecurityBoundary } from './longHorizonAutonomySecurityBoundary.js';
export type LongHorizonAuditEventType = 'LONG_HORIZON_STARTED' | 'OBJECTIVE_AUTHORIZED' | 'GENERATION_STARTED' | 'GENERATION_COMPLETED' | 'GENERATION_SUPERSEDED' | 'STEP_PROGRESS_RECORDED' | 'OBJECTIVE_PROGRESS_UPDATED' | 'ENVIRONMENT_DRIFT_DETECTED' | 'REPLANNING_REQUIRED' | 'AUTHORIZATION_REFRESH_REQUIRED' | 'HUMAN_CONFIRMATION_REQUIRED' | 'HUMAN_CONFIRMED' | 'EXECUTION_DELEGATED' | 'EXECUTION_FAILED' | 'RETRY_STARTED' | 'STAGNATION_DETECTED' | 'BUDGET_EXHAUSTED' | 'OBJECTIVE_COMPLETED' | 'OBJECTIVE_FAILED' | 'OBJECTIVE_ABORTED' | 'OBJECTIVE_EXPIRED' | 'USER_STOP_PREEMPTED' | 'RECOVERY_REQUIRED' | 'TERMINATED';
export interface RecordEventParams {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly objectiveId: string;
    readonly generationId?: string;
    readonly eventType: LongHorizonAuditEventType;
    readonly outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PAUSED' | 'PREEMPTED';
    readonly details?: Record<string, unknown>;
}
export declare class LongHorizonAuditBridge {
    private readonly ledger;
    private readonly securityBoundary;
    constructor(options?: {
        readonly ledger?: AuditLedger;
        readonly securityBoundary?: LongHorizonAutonomySecurityBoundary;
    });
    /**
     * EN: Emits an immutable, sanitized audit record to AuditLedger.
     * VI: Phát ra một bản ghi kiểm toán bất biến, đã khử trùng tới AuditLedger.
     */
    recordEvent(params: RecordEventParams): void;
    recordLifecycleEvent(params: {
        readonly eventType: LongHorizonAuditEventType;
        readonly tenantId: string;
        readonly sessionId: string;
        readonly objectiveId: string;
        readonly generationId?: string;
        readonly outcome?: 'SUCCESS' | 'FAILURE' | 'BLOCKED' | 'PAUSED' | 'PREEMPTED';
        readonly metadata?: Record<string, unknown>;
        readonly details?: Record<string, unknown>;
    }): void;
}
