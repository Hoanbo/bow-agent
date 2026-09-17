import type { CanonicalStrategicPolicy, AuthoritativeRatificationRecord } from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';
import type { PolicyLifecycleRecord } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
import { type PolicyDistributionManifest, type CanaryRing, type EmergencyStopProvider, type UuidV4Generator } from './GovernedPolicyDistributionTypes.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';
export interface PolicyDistributionManifestPackagerOptions {
    baseStorageDir?: string;
    emergencyStopProvider?: EmergencyStopProvider;
    uuidGenerator?: UuidV4Generator;
    auditLedger?: PolicyDistributionAuditLedger;
}
export declare class PolicyDistributionManifestPackager {
    private readonly baseStorageDir;
    private readonly emergencyStopProvider?;
    private readonly uuidGenerator?;
    private readonly auditLedger?;
    constructor(baseStorageDirOrOptions?: string | PolicyDistributionManifestPackagerOptions, emergencyStopProvider?: EmergencyStopProvider, uuidGenerator?: UuidV4Generator, auditLedger?: PolicyDistributionAuditLedger);
    private getPartitionDir;
    private getManifestFilePath;
    private generateUuid;
    private acquireLock;
    /**
     * Packages an immutable PolicyDistributionManifest from verified upstream records.
     * Reconstructs exact MS-1.5.20 envelope and verifies canonical policy hash.
     */
    packageManifest(policy: CanonicalStrategicPolicy, ratification: AuthoritativeRatificationRecord, lifecycle: PolicyLifecycleRecord, targetFederation: string, ring: CanaryRing, targetEpoch: number, nowMs: number, ttlMs?: number): Promise<PolicyDistributionManifest>;
}
