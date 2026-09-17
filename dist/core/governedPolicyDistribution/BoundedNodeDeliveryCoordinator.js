// src/core/governedPolicyDistribution/BoundedNodeDeliveryCoordinator.ts
// Component 1221: BoundedNodeDeliveryCoordinator
//
// Bounded delivery coordination across fleet nodes via injected transport adapter.
import { assertEmergencyStopInactive, assertValidIdentifier, DistributionTimeoutError, } from './GovernedPolicyDistributionTypes.js';
export class BoundedNodeDeliveryCoordinator {
    transportAdapter;
    registry;
    auditLedger;
    emergencyStopProvider;
    constructor(transportAdapter, registry, auditLedger, emergencyStopProvider) {
        this.transportAdapter = transportAdapter;
        this.registry = registry;
        this.auditLedger = auditLedger;
        this.emergencyStopProvider = emergencyStopProvider;
    }
    /**
     * Delivers PREPARE message to cohort nodes.
     * Exactly one transport message targets one node.
     */
    async deliverPrepare(manifest, cohort, nowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        assertValidIdentifier(manifest.tenantId, 'tenantId');
        const deadlineMs = Math.min(5000, manifest.expiresAt - nowMs);
        const acceptedNodeIds = [];
        const failedNodeIds = [];
        for (const node of cohort) {
            if (node.tenantId !== manifest.tenantId) {
                failedNodeIds.push(node.nodeId);
                continue;
            }
            if (deadlineMs <= 0) {
                failedNodeIds.push(node.nodeId);
                continue;
            }
            try {
                const message = {
                    messageType: 'PREPARE',
                    nodeId: node.nodeId,
                    manifest,
                };
                const ack = await Promise.race([
                    this.transportAdapter.deliver(message, deadlineMs),
                    new Promise((_, reject) => setTimeout(() => reject(new DistributionTimeoutError(`Delivery timeout after ${deadlineMs}ms`)), deadlineMs)),
                ]);
                if (ack && ack.accepted && ack.nodeId === node.nodeId && ack.messageType === 'PREPARE') {
                    acceptedNodeIds.push(node.nodeId);
                    if (this.registry) {
                        await this.registry.updateNodeSyncStatus(node.tenantId, node.federationId, node.policyDomain, node.nodeId, 'SYNC_PENDING', nowMs);
                    }
                }
                else {
                    failedNodeIds.push(node.nodeId);
                    if (this.registry) {
                        await this.registry.updateNodeSyncStatus(node.tenantId, node.federationId, node.policyDomain, node.nodeId, 'SYNC_FAILED', nowMs);
                    }
                }
            }
            catch {
                failedNodeIds.push(node.nodeId);
                if (this.registry) {
                    try {
                        await this.registry.updateNodeSyncStatus(node.tenantId, node.federationId, node.policyDomain, node.nodeId, 'SYNC_FAILED', nowMs);
                    }
                    catch {
                        // Ignore status update failure on catch
                    }
                }
            }
        }
        const result = {
            manifestId: manifest.manifestId,
            epoch: manifest.targetEpoch,
            messageType: 'PREPARE',
            acceptedNodeIds: Object.freeze(acceptedNodeIds),
            failedNodeIds: Object.freeze(failedNodeIds),
            completedAt: nowMs,
        };
        if (this.auditLedger) {
            await this.auditLedger.append({
                eventType: acceptedNodeIds.length > 0 ? 'PREPARE_DELIVERED' : 'DELIVERY_FAILED',
                tenantId: manifest.tenantId,
                policyDomain: manifest.policyDomain,
                actorSource: 'SYSTEM',
                data: {
                    manifestId: manifest.manifestId,
                    epoch: manifest.targetEpoch,
                    acceptedCount: acceptedNodeIds.length,
                    failedCount: failedNodeIds.length,
                    acceptedNodeIds,
                    failedNodeIds,
                },
            }, nowMs);
        }
        return Object.freeze(result);
    }
    /**
     * Delivers COMMIT message to cohort nodes.
     */
    async deliverCommit(decision, manifest, cohort, nowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        assertValidIdentifier(manifest.tenantId, 'tenantId');
        const deadlineMs = Math.min(5000, manifest.expiresAt - nowMs);
        const acceptedNodeIds = [];
        const failedNodeIds = [];
        for (const node of cohort) {
            if (node.tenantId !== manifest.tenantId) {
                failedNodeIds.push(node.nodeId);
                continue;
            }
            if (deadlineMs <= 0) {
                failedNodeIds.push(node.nodeId);
                continue;
            }
            try {
                const message = {
                    messageType: 'COMMIT',
                    nodeId: node.nodeId,
                    manifestId: manifest.manifestId,
                    targetEpoch: decision.epoch,
                    decisionId: decision.decisionId,
                    commitAt: decision.commitAt || nowMs,
                };
                const ack = await Promise.race([
                    this.transportAdapter.deliver(message, deadlineMs),
                    new Promise((_, reject) => setTimeout(() => reject(new DistributionTimeoutError(`Delivery timeout after ${deadlineMs}ms`)), deadlineMs)),
                ]);
                if (ack && ack.accepted && ack.nodeId === node.nodeId && ack.messageType === 'COMMIT') {
                    acceptedNodeIds.push(node.nodeId);
                }
                else {
                    failedNodeIds.push(node.nodeId);
                }
            }
            catch {
                failedNodeIds.push(node.nodeId);
            }
        }
        return Object.freeze({
            manifestId: manifest.manifestId,
            epoch: decision.epoch,
            messageType: 'COMMIT',
            acceptedNodeIds: Object.freeze(acceptedNodeIds),
            failedNodeIds: Object.freeze(failedNodeIds),
            completedAt: nowMs,
        });
    }
    /**
     * Delivers ABORT message to cohort nodes.
     */
    async deliverAbort(decision, manifest, reason, cohort, nowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        const deadlineMs = 5000;
        const acceptedNodeIds = [];
        const failedNodeIds = [];
        for (const node of cohort) {
            try {
                const message = {
                    messageType: 'ABORT',
                    nodeId: node.nodeId,
                    manifestId: manifest.manifestId,
                    targetEpoch: decision.epoch,
                    decisionId: decision.decisionId,
                    reason,
                };
                const ack = await this.transportAdapter.deliver(message, deadlineMs);
                if (ack && ack.accepted && ack.nodeId === node.nodeId) {
                    acceptedNodeIds.push(node.nodeId);
                }
                else {
                    failedNodeIds.push(node.nodeId);
                }
            }
            catch {
                failedNodeIds.push(node.nodeId);
            }
        }
        return Object.freeze({
            manifestId: manifest.manifestId,
            epoch: decision.epoch,
            messageType: 'ABORT',
            acceptedNodeIds: Object.freeze(acceptedNodeIds),
            failedNodeIds: Object.freeze(failedNodeIds),
            completedAt: nowMs,
        });
    }
}
