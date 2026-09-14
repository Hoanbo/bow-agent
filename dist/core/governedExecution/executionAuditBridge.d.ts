import { type AuditLedger } from '../auditLedger.js';
import { type GovernedExecutionResultEnvelope, type ExecutionRequest, type GovernedExecutionState } from './executionTypes.js';
export declare class ExecutionAuditBridge {
    private readonly auditLedger;
    constructor(options?: {
        readonly auditLedger?: AuditLedger;
    });
    /**
     * EN: Records execution lifecycle transition into append-only cryptographic ledger.
     * VI: Ghi nhận bước chuyển vòng đời thực thi vào sổ cái mật mã chỉ ghi thêm.
     */
    recordTransition(params: {
        readonly tenantId: string;
        readonly eventType: string;
        readonly state: GovernedExecutionState;
        readonly request: ExecutionRequest;
        readonly result?: GovernedExecutionResultEnvelope;
        readonly reason?: string;
    }): string;
}
