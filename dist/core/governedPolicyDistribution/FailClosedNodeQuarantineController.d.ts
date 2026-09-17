import { type QuarantineInput, type NodeRef, type NodeQuarantineRecord, type NodePolicyAttestationReceipt, type PolicyQuarantinePublicationAdapter, type DistributionControlKeyResolver, type NodeAttestationKeyResolver, type EmergencyStopProvider, type UuidV4Generator } from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';
export declare const QUARANTINE_CALLER_TOKEN: unique symbol;
export declare class FailClosedNodeQuarantineController {
    private readonly publicationAdapter?;
    private readonly controlKeyResolver?;
    private readonly attestationKeyResolver?;
    private readonly registry;
    private readonly auditLedger?;
    private readonly baseStorageDir;
    private readonly emergencyStopProvider?;
    private readonly uuidGenerator?;
    private authorizedCallerToken?;
    constructor(registry: FleetNodeRegistry, publicationAdapter?: PolicyQuarantinePublicationAdapter, controlKeyResolver?: DistributionControlKeyResolver, attestationKeyResolver?: NodeAttestationKeyResolver, auditLedger?: PolicyDistributionAuditLedger, baseStorageDir?: string, emergencyStopProvider?: EmergencyStopProvider, uuidGenerator?: UuidV4Generator);
    setCallerToken(token: symbol): void;
    private generateUuid;
    private getPartitionDir;
    private getQuarantineFilePath;
    private acquireLock;
    private loadQuarantineRecordsUnderLock;
    private saveQuarantineRecordsUnderLock;
    /**
     * Quarantines a node fail-closed.
     */
    quarantine(input: QuarantineInput, nowMs: number, callerToken?: symbol): Promise<NodeQuarantineRecord>;
    private publishQuarantine;
    /**
     * Releases a node from quarantine.
     */
    release(nodeRef: NodeRef, receipt: NodePolicyAttestationReceipt, nowMs: number): Promise<NodeQuarantineRecord>;
    /**
     * Synchronous query of quarantine state.
     */
    get(nodeRef: NodeRef): NodeQuarantineRecord | undefined;
}
