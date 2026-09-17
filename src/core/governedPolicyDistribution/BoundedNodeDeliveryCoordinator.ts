// src/core/governedPolicyDistribution/BoundedNodeDeliveryCoordinator.ts
// Component 1221: BoundedNodeDeliveryCoordinator
//
// Bounded delivery coordination across fleet nodes via injected transport adapter.

import {
  type PolicyDistributionManifest,
  type FleetNodeRecord,
  type FleetNodeId,
  type DeliveryBatchResult,
  type EpochDecision,
  type PolicyDistributionTransportAdapter,
  type EmergencyStopProvider,
  assertEmergencyStopInactive,
  assertValidIdentifier,
  DistributionValidationError,
  DistributionTenantIsolationError,
  DistributionTimeoutError,
  DistributionTransportError,
} from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';

export class BoundedNodeDeliveryCoordinator {
  private readonly transportAdapter: PolicyDistributionTransportAdapter;
  private readonly registry?: FleetNodeRegistry;
  private readonly auditLedger?: PolicyDistributionAuditLedger;
  private readonly emergencyStopProvider?: EmergencyStopProvider;

  constructor(
    transportAdapter: PolicyDistributionTransportAdapter,
    registry?: FleetNodeRegistry,
    auditLedger?: PolicyDistributionAuditLedger,
    emergencyStopProvider?: EmergencyStopProvider
  ) {
    this.transportAdapter = transportAdapter;
    this.registry = registry;
    this.auditLedger = auditLedger;
    this.emergencyStopProvider = emergencyStopProvider;
  }

  /**
   * Delivers PREPARE message to cohort nodes.
   * Exactly one transport message targets one node.
   */
  public async deliverPrepare(
    manifest: PolicyDistributionManifest,
    cohort: readonly FleetNodeRecord[],
    nowMs: number
  ): Promise<DeliveryBatchResult> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(manifest.tenantId, 'tenantId');

    const deadlineMs = Math.min(5000, manifest.expiresAt - nowMs);
    const acceptedNodeIds: FleetNodeId[] = [];
    const failedNodeIds: FleetNodeId[] = [];

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
          messageType: 'PREPARE' as const,
          nodeId: node.nodeId,
          manifest,
        };

        const ack = await Promise.race([
          this.transportAdapter.deliver(message, deadlineMs),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new DistributionTimeoutError(`Delivery timeout after ${deadlineMs}ms`)), deadlineMs)
          ),
        ]);

        if (ack && ack.accepted && ack.nodeId === node.nodeId && ack.messageType === 'PREPARE') {
          acceptedNodeIds.push(node.nodeId);
          if (this.registry) {
            await this.registry.updateNodeSyncStatus(
              node.tenantId,
              node.federationId,
              node.policyDomain,
              node.nodeId,
              'SYNC_PENDING',
              nowMs
            );
          }
        } else {
          failedNodeIds.push(node.nodeId);
          if (this.registry) {
            await this.registry.updateNodeSyncStatus(
              node.tenantId,
              node.federationId,
              node.policyDomain,
              node.nodeId,
              'SYNC_FAILED',
              nowMs
            );
          }
        }
      } catch {
        failedNodeIds.push(node.nodeId);
        if (this.registry) {
          try {
            await this.registry.updateNodeSyncStatus(
              node.tenantId,
              node.federationId,
              node.policyDomain,
              node.nodeId,
              'SYNC_FAILED',
              nowMs
            );
          } catch {
            // Ignore status update failure on catch
          }
        }
      }
    }

    const result: DeliveryBatchResult = {
      manifestId: manifest.manifestId,
      epoch: manifest.targetEpoch,
      messageType: 'PREPARE',
      acceptedNodeIds: Object.freeze(acceptedNodeIds),
      failedNodeIds: Object.freeze(failedNodeIds),
      completedAt: nowMs,
    };

    if (this.auditLedger) {
      await this.auditLedger.append(
        {
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
        },
        nowMs
      );
    }

    return Object.freeze(result);
  }

  /**
   * Delivers COMMIT message to cohort nodes.
   */
  public async deliverCommit(
    decision: EpochDecision,
    manifest: PolicyDistributionManifest,
    cohort: readonly FleetNodeRecord[],
    nowMs: number
  ): Promise<DeliveryBatchResult> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(manifest.tenantId, 'tenantId');

    const deadlineMs = Math.min(5000, manifest.expiresAt - nowMs);
    const acceptedNodeIds: FleetNodeId[] = [];
    const failedNodeIds: FleetNodeId[] = [];

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
          messageType: 'COMMIT' as const,
          nodeId: node.nodeId,
          manifestId: manifest.manifestId,
          targetEpoch: decision.epoch,
          decisionId: decision.decisionId,
          commitAt: decision.commitAt || nowMs,
        };

        const ack = await Promise.race([
          this.transportAdapter.deliver(message, deadlineMs),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new DistributionTimeoutError(`Delivery timeout after ${deadlineMs}ms`)), deadlineMs)
          ),
        ]);

        if (ack && ack.accepted && ack.nodeId === node.nodeId && ack.messageType === 'COMMIT') {
          acceptedNodeIds.push(node.nodeId);
        } else {
          failedNodeIds.push(node.nodeId);
        }
      } catch {
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
  public async deliverAbort(
    decision: EpochDecision,
    manifest: PolicyDistributionManifest,
    reason: string,
    cohort: readonly FleetNodeRecord[],
    nowMs: number
  ): Promise<DeliveryBatchResult> {
    assertEmergencyStopInactive(this.emergencyStopProvider);

    const deadlineMs = 5000;
    const acceptedNodeIds: FleetNodeId[] = [];
    const failedNodeIds: FleetNodeId[] = [];

    for (const node of cohort) {
      try {
        const message = {
          messageType: 'ABORT' as const,
          nodeId: node.nodeId,
          manifestId: manifest.manifestId,
          targetEpoch: decision.epoch,
          decisionId: decision.decisionId,
          reason,
        };

        const ack = await this.transportAdapter.deliver(message, deadlineMs);
        if (ack && ack.accepted && ack.nodeId === node.nodeId) {
          acceptedNodeIds.push(node.nodeId);
        } else {
          failedNodeIds.push(node.nodeId);
        }
      } catch {
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
