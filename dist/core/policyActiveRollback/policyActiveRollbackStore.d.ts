import type { HistoricalPolicyVersion, RollbackRequest, SunsetRequest, RecoveryRequest, PolicyActiveRollbackOptions } from './policyActiveRollbackTypes.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export declare class PolicyActiveRollbackStore {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly sanitizer;
    private readonly historicalPolicies;
    private readonly versionLookup;
    private readonly rollbackRequests;
    private readonly sunsetRequests;
    private readonly recoveryRequests;
    constructor(options?: PolicyActiveRollbackOptions, sanitizer?: DiagnosisSanitizer);
    private assertUserStopInactive;
    private getTenantStorageDir;
    private loadTenantStateIfEmpty;
    private persistHistoricalPolicies;
    private persistRollbackRequests;
    private persistSunsetRequests;
    private persistRecoveryRequests;
    /**
     * Records a historical verified policy version. Immutable once written.
     */
    saveHistoricalPolicy(policy: HistoricalPolicyVersion): HistoricalPolicyVersion;
    /**
     * Retrieves a historical policy by targetId.
     */
    getHistoricalPolicyById(tenantPartition: string, targetId: string): HistoricalPolicyVersion | null;
    /**
     * Retrieves a historical policy by version.
     */
    getHistoricalPolicyByVersion(tenantPartition: string, version: string): HistoricalPolicyVersion | null;
    /**
     * Lists all historical policies for a tenant.
     */
    listHistoricalPolicies(tenantPartition: string): readonly HistoricalPolicyVersion[];
    /**
     * Saves or updates a rollback request.
     */
    saveRollbackRequest(request: RollbackRequest): RollbackRequest;
    /**
     * Retrieves a rollback request by ID.
     */
    getRollbackRequest(tenantPartition: string, rollbackRequestId: string): RollbackRequest | null;
    /**
     * Saves or updates a sunset request.
     */
    saveSunsetRequest(request: SunsetRequest): SunsetRequest;
    /**
     * Retrieves a sunset request by ID.
     */
    getSunsetRequest(tenantPartition: string, sunsetRequestId: string): SunsetRequest | null;
    /**
     * Saves or updates a recovery request.
     */
    saveRecoveryRequest(request: RecoveryRequest): RecoveryRequest;
    /**
     * Retrieves a recovery request by ID.
     */
    getRecoveryRequest(tenantPartition: string, recoveryRequestId: string): RecoveryRequest | null;
    /**
     * Lists all rollback requests for a tenant.
     */
    listRollbackRequests(tenantPartition: string): readonly RollbackRequest[];
    getRollbackRequests(tenantPartition: string): readonly RollbackRequest[];
    /**
     * Lists all sunset requests for a tenant.
     */
    listSunsetRequests(tenantPartition: string): readonly SunsetRequest[];
    getSunsetRequests(tenantPartition: string): readonly SunsetRequest[];
    /**
     * Lists all recovery requests for a tenant.
     */
    listRecoveryRequests(tenantPartition: string): readonly RecoveryRequest[];
    getRecoveryRequests(tenantPartition: string): readonly RecoveryRequest[];
}
