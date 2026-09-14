import { type ExecutionLease, type ExecutionOperationKind } from './executionTypes.js';
import type { GroundedPlanRiskLevel } from '../groundedPlanning/groundedPlanTypes.js';
export interface IssueLeaseParams {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly stepId: string;
    readonly stepIndex: number;
    readonly operationKind: ExecutionOperationKind;
    readonly riskLevel: GroundedPlanRiskLevel;
    readonly ttlMs?: number;
    readonly singleUse?: boolean;
}
export declare class ExecutionLeaseManager {
    private readonly leases;
    private readonly consumedLeaseIds;
    private readonly userStopProvider;
    constructor(options?: {
        readonly userStopProvider?: () => boolean;
    });
    /**
     * EN: Issues a new cryptographically signed execution lease.
     * VI: Cấp một hợp đồng thuê thực thi mới được ký mật mã.
     */
    issueLease(params: IssueLeaseParams): ExecutionLease;
    /**
     * EN: Consumes an active execution lease, guaranteeing single-use execution semantics.
     * VI: Tiêu thụ một hợp đồng thuê thực thi đang hoạt động, đảm bảo ngữ nghĩa thực thi một lần duy nhất.
     */
    consumeLease(leaseId: string, expectedVersion: number, context: {
        tenantId: string;
        sessionId: string;
    }): ExecutionLease;
    /**
     * EN: Explicitly invalidates a lease or all leases for a session.
     * VI: Vô hiệu hóa tường minh một hợp đồng thuê hoặc toàn bộ hợp đồng thuê của một phiên.
     */
    invalidateLeasesForSession(tenantId: string, sessionId: string): number;
    /**
     * EN: Retrieves an active lease if valid.
     * VI: Lấy một hợp đồng thuê đang hoạt động nếu hợp lệ.
     */
    getLease(leaseId: string): ExecutionLease | undefined;
}
