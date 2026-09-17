import { type FleetNodeRecord, type FleetNodeId, type CanaryRing, type NodeSyncStatus, type EmergencyStopProvider, type PolicyDomain } from './GovernedPolicyDistributionTypes.js';
import type { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';
export interface FleetNodeRegistryOptions {
    baseStorageDir?: string;
    auditLedger?: PolicyDistributionAuditLedger;
    emergencyStopProvider?: EmergencyStopProvider;
}
export declare class FleetNodeRegistry {
    private readonly baseStorageDir;
    private readonly emergencyStopProvider?;
    private readonly auditLedger?;
    private readonly memoryStore;
    constructor(baseStorageDirOrOptions?: string | FleetNodeRegistryOptions, emergencyStopProvider?: EmergencyStopProvider);
    private getNodeKey;
    private getPartitionDir;
    private getNodesFilePath;
    private acquireLock;
    private loadNodesUnderLock;
    private saveNodesUnderLock;
    /**
     * Registers a fleet node.
     * Identity key is (tenantId, federationId, nodeId).
     * Initial status is INITIALIZING.
     */
    registerNode(record: FleetNodeRecord, nowMs: number): Promise<FleetNodeRecord>;
    /**
     * Records an authenticated node heartbeat.
      * lastHeartbeatAt is never permitted to decrease.
     */
    recordHeartbeat(tenantId: string, federationId: string, domainOrNodeId: PolicyDomain | FleetNodeId, nodeIdOrNowMs: FleetNodeId | number, maybeNowMs?: number): Promise<FleetNodeRecord>;
    /**
     * Cohort read model query.
     * Returns de-duplicated registered nodes matching (tenantId, federationId, domain, ring).
     */
    getFleetCohort(tenantId: string, federationId: string, domain: PolicyDomain, ring: CanaryRing, _nowMs: number): readonly FleetNodeRecord[];
    updateNodeSyncStatus(tenantId: string, federationId: string, domain: PolicyDomain, nodeId: FleetNodeId, status: NodeSyncStatus, _nowMs: number, epoch?: number, policyVersion?: number, policyHash?: string): Promise<FleetNodeRecord>;
    updateNodeQuarantine(tenantId: string, federationId: string, domain: PolicyDomain, nodeId: FleetNodeId, quarantined: boolean, nowMs: number): Promise<FleetNodeRecord>;
    updateNodeQuarantineStatus: (tenantId: string, federationId: string, domain: PolicyDomain, nodeId: FleetNodeId, quarantined: boolean, nowMs: number) => Promise<FleetNodeRecord>;
    getNode(tenantId: string, federationId: string, domain: PolicyDomain, nodeId: FleetNodeId): FleetNodeRecord | undefined;
}
