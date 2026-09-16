// src/core/governedPolicyLifecycle/PolicyLifecycleLineageGraph.ts
// Component 1182: PolicyLifecycleLineageGraph (REAL)
//
// Tamper-evident directed acyclic graph (DAG) capturing policy operational lineage.
// Connects operational lifecycle states and incidents back to MS-1.5.20 ratifications
// and MS-1.5.19 proposal origin. Proves HASH != AUTHORIZATION.
import { createHash } from 'crypto';
import { MAX_LINEAGE_DEPTH, computeLineageNodeHash, deepFreeze, PolicyLineageIntegrityError, PolicyLifecycleTenantIsolationError, } from './GovernedPolicyLifecycleTypes.js';
export class PolicyLifecycleLineageGraph {
    // key: tenant:domain:version -> list of nodes in insertion order
    graphStore = new Map();
    /**
     * Append a new node to the policy lineage graph.
     */
    attachNode(params) {
        this.validateScope(params.tenantId, params.policyDomain);
        const graphKey = `${params.tenantId}:${params.policyDomain}:v${params.policyVersion}`;
        const existingNodes = this.graphStore.get(graphKey) || [];
        if (existingNodes.length >= MAX_LINEAGE_DEPTH) {
            throw new PolicyLineageIntegrityError(`LINEAGE_DEPTH_EXCEEDED: Lineage graph for '${graphKey}' has reached maximum depth limit (${MAX_LINEAGE_DEPTH}).`);
        }
        const parentIds = params.parentNodeIds || (existingNodes.length > 0 ? [existingNodes[existingNodes.length - 1].nodeId] : []);
        const parentHashes = [];
        // Verify parent nodes exist within the same tenant and domain
        for (const pId of parentIds) {
            const parentNode = existingNodes.find((n) => n.nodeId === pId);
            if (!parentNode) {
                throw new PolicyLineageIntegrityError(`PARENT_NODE_NOT_FOUND: Parent node '${pId}' does not exist in lineage graph '${graphKey}'.`);
            }
            parentHashes.push(parentNode.nodeHash);
        }
        const nodeId = `lin_${params.tenantId}_${params.nodeType.toLowerCase()}_${Date.now()}_${existingNodes.length + 1}`;
        const rawNode = {
            nodeId,
            nodeType: params.nodeType,
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            entityId: params.entityId,
            parentNodeIds: Object.freeze([...parentIds]),
            parentHashes: Object.freeze(parentHashes),
            timestamp: Date.now(),
            metadata: params.metadata || {},
        };
        const nodeHash = computeLineageNodeHash(rawNode);
        const frozenNode = deepFreeze({
            ...rawNode,
            nodeHash,
        });
        existingNodes.push(frozenNode);
        this.graphStore.set(graphKey, existingNodes);
        return frozenNode;
    }
    /**
     * Export an immutable snapshot of the lineage graph with a deterministic fingerprint.
     */
    getGraphSnapshot(tenantId, policyDomain, policyVersion) {
        this.validateScope(tenantId, policyDomain);
        const graphKey = `${tenantId}:${policyDomain}:v${policyVersion}`;
        const nodes = this.graphStore.get(graphKey);
        if (!nodes || nodes.length === 0)
            return undefined;
        const graphFingerprint = this.computeGraphFingerprint(nodes);
        return deepFreeze({
            tenantId,
            policyDomain,
            policyVersion,
            nodes: Object.freeze([...nodes]),
            rootNodeId: nodes[0].nodeId,
            latestNodeId: nodes[nodes.length - 1].nodeId,
            graphFingerprint,
        });
    }
    /**
     * Cryptographically verify graph integrity from root to leaf.
     */
    verifyLineageIntegrity(tenantId, policyDomain, policyVersion) {
        this.validateScope(tenantId, policyDomain);
        const graphKey = `${tenantId}:${policyDomain}:v${policyVersion}`;
        const nodes = this.graphStore.get(graphKey);
        if (!nodes || nodes.length === 0) {
            return { verified: true, nodeCount: 0 };
        }
        const nodeMap = new Map();
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            nodeMap.set(node.nodeId, node);
            // 1. Verify individual node hash
            const expectedHash = computeLineageNodeHash({
                nodeId: node.nodeId,
                nodeType: node.nodeType,
                tenantId: node.tenantId,
                policyDomain: node.policyDomain,
                entityId: node.entityId,
                parentNodeIds: node.parentNodeIds,
                parentHashes: node.parentHashes,
                timestamp: node.timestamp,
                metadata: node.metadata,
            });
            if (node.nodeHash !== expectedHash) {
                return {
                    verified: false,
                    nodeCount: i,
                    error: `CORRUPTED_NODE_HASH: Node '${node.nodeId}' has tampered content or hash mismatch.`,
                };
            }
            // 2. Verify parent hashes match actual parent nodes
            for (let pIdx = 0; pIdx < node.parentNodeIds.length; pIdx++) {
                const pId = node.parentNodeIds[pIdx];
                const pHash = node.parentHashes[pIdx];
                const parentNode = nodeMap.get(pId);
                if (!parentNode) {
                    return {
                        verified: false,
                        nodeCount: i,
                        error: `BROKEN_PARENT_REFERENCE: Node '${node.nodeId}' references non-existent parent '${pId}'.`,
                    };
                }
                if (parentNode.nodeHash !== pHash) {
                    return {
                        verified: false,
                        nodeCount: i,
                        error: `PARENT_HASH_MISMATCH: Node '${node.nodeId}' expected parent hash '${pHash}', but parent has '${parentNode.nodeHash}'.`,
                    };
                }
            }
        }
        return { verified: true, nodeCount: nodes.length };
    }
    computeGraphFingerprint(nodes) {
        const raw = nodes.map((n) => n.nodeHash).join('|');
        return createHash('sha256').update(raw, 'utf8').digest('hex');
    }
    validateScope(tenantId, policyDomain) {
        if (!tenantId || !policyDomain) {
            throw new PolicyLifecycleTenantIsolationError('TENANT_AND_DOMAIN_REQUIRED');
        }
        if (tenantId.includes('..') || policyDomain.includes('..') || tenantId.includes('\0')) {
            throw new PolicyLifecycleTenantIsolationError('MALFORMED_TENANT_OR_DOMAIN');
        }
    }
}
