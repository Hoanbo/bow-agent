import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type PolicyLineageNode, type PolicyLineageNodeType, type PolicyLineageGraphSnapshot } from './GovernedPolicyLifecycleTypes.js';
export declare class PolicyLifecycleLineageGraph {
    private readonly graphStore;
    /**
     * Append a new node to the policy lineage graph.
     */
    attachNode(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyVersion: number;
        nodeType: PolicyLineageNodeType;
        entityId: string;
        parentNodeIds?: readonly string[];
        metadata?: Record<string, unknown>;
    }): PolicyLineageNode;
    /**
     * Export an immutable snapshot of the lineage graph with a deterministic fingerprint.
     */
    getGraphSnapshot(tenantId: string, policyDomain: PolicyDomain, policyVersion: number): PolicyLineageGraphSnapshot | undefined;
    /**
     * Cryptographically verify graph integrity from root to leaf.
     */
    verifyLineageIntegrity(tenantId: string, policyDomain: PolicyDomain, policyVersion: number): {
        verified: boolean;
        nodeCount: number;
        error?: string;
    };
    private computeGraphFingerprint;
    private validateScope;
}
