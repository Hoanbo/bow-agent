import type { ResolutionProvenanceRecord, PolicyActiveIncidentResolutionOptions } from './policyActiveIncidentResolutionTypes.js';
export declare const GENESIS_HASH_RESOLUTION = "0000000000000000000000000000000000000000000000000000000000000000";
export interface AppendProvenanceInput {
    readonly tenantPartition: string;
    readonly incidentId: any;
    readonly activePolicyStateId?: any;
    readonly containmentAssessmentId?: any;
    readonly containmentClearanceId?: any;
    readonly recoveryAuthorizationId?: any;
    readonly recoveryHandoffId?: any;
    readonly recoveryVerificationId?: any;
    readonly resolutionId?: any;
    readonly closureId?: any;
    readonly eventType: string;
    readonly payload: Record<string, any>;
}
export declare class PolicyActiveIncidentResolutionProvenanceEngine {
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    private readonly chains;
    constructor(options?: PolicyActiveIncidentResolutionOptions);
    private assertUserStopInactive;
    private getChainFilePath;
    private loadChainIfEmpty;
    getHeadHash(tenantPartition: string): string;
    appendRecord(input: AppendProvenanceInput): ResolutionProvenanceRecord;
    verifyChainIntegrity(tenantPartition: string): boolean;
    getRecords(tenantPartition: string): readonly ResolutionProvenanceRecord[];
}
