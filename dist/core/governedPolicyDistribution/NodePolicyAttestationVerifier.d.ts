import { type NodePolicyAttestationReceipt, type PolicyDistributionManifest, type VerifiedReceipt, type NodeAttestationKeyResolver, type EmergencyStopProvider } from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';
export interface NodePolicyAttestationVerifierOptions {
    keyResolver: NodeAttestationKeyResolver;
    baseStorageDir?: string;
    registry?: FleetNodeRegistry;
    auditLedger?: PolicyDistributionAuditLedger;
    emergencyStopProvider?: EmergencyStopProvider;
}
export declare class NodePolicyAttestationVerifier {
    private readonly keyResolver;
    private readonly baseStorageDir;
    private readonly registry?;
    private readonly auditLedger?;
    private readonly emergencyStopProvider?;
    constructor(keyResolverOrOptions: NodeAttestationKeyResolver | NodePolicyAttestationVerifierOptions, baseStorageDir?: string, registry?: FleetNodeRegistry, auditLedger?: PolicyDistributionAuditLedger, emergencyStopProvider?: EmergencyStopProvider);
    private getPartitionDir;
    private getNoncesFilePath;
    private acquireLock;
    private loadNoncesUnderLock;
    private saveNoncesUnderLock;
    /**
     * Verifies a NodePolicyAttestationReceipt.
     */
    verifyReceipt(receipt: NodePolicyAttestationReceipt, manifest: PolicyDistributionManifest, nowMs: number): Promise<VerifiedReceipt>;
}
