// src/core/governedPolicyDistribution/SynchronizedEpochCutoverController.ts
// Component 1224: SynchronizedEpochCutoverController
//
// Epoch decision state machine, durable commit semantics, retry scheduling, and recovery.

import * as fs from 'fs';
import * as path from 'path';
import {
  type PolicyDistributionManifest,
  type EpochDecision,
  type FleetNodeRecord,
  type PolicyDomain,
  type Clock,
  type EmergencyStopProvider,
  assertValidIdentifier,
  assertValidDomain,
  assertEmergencyStopInactive,
  sha256,
  canonicalJson,
  DistributionValidationError,
  DistributionTenantIsolationError,
  DistributionEpochConflictError,
  DistributionConvergenceError,
  DistributionLockTimeoutError,
  DistributionPersistenceCorruptionError,
} from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { BoundedNodeDeliveryCoordinator } from './BoundedNodeDeliveryCoordinator.js';
import { NodePolicyAttestationVerifier } from './NodePolicyAttestationVerifier.js';
import { FleetConvergenceEvaluator } from './FleetConvergenceEvaluator.js';
import { FailClosedNodeQuarantineController, QUARANTINE_CALLER_TOKEN } from './FailClosedNodeQuarantineController.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';

export interface SynchronizedEpochCutoverControllerOptions {
  registry: FleetNodeRegistry;
  deliveryCoordinator: BoundedNodeDeliveryCoordinator;
  convergenceEvaluator: FleetConvergenceEvaluator;
  quarantineController: FailClosedNodeQuarantineController;
  clock: Clock;
  attestationVerifier?: NodePolicyAttestationVerifier;
  auditLedger?: PolicyDistributionAuditLedger;
  baseStorageDir?: string;
  emergencyStopProvider?: EmergencyStopProvider;
  callerToken?: symbol;
}

export class SynchronizedEpochCutoverController {
  private readonly registry: FleetNodeRegistry;
  private readonly deliveryCoordinator: BoundedNodeDeliveryCoordinator;
  private readonly convergenceEvaluator: FleetConvergenceEvaluator;
  private readonly quarantineController: FailClosedNodeQuarantineController;
  private readonly clock: Clock;
  private readonly attestationVerifier?: NodePolicyAttestationVerifier;
  private readonly auditLedger?: PolicyDistributionAuditLedger;
  private readonly baseStorageDir: string;
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly callerToken: symbol;

  constructor(
    registryOrOptions: FleetNodeRegistry | SynchronizedEpochCutoverControllerOptions,
    deliveryCoordinator?: BoundedNodeDeliveryCoordinator,
    convergenceEvaluator?: FleetConvergenceEvaluator,
    quarantineController?: FailClosedNodeQuarantineController,
    clock?: Clock,
    attestationVerifier?: NodePolicyAttestationVerifier,
    auditLedger?: PolicyDistributionAuditLedger,
    baseStorageDir?: string,
    emergencyStopProvider?: EmergencyStopProvider,
    callerToken?: symbol
  ) {
    if ('registry' in registryOrOptions) {
      const opts = registryOrOptions;
      this.registry = opts.registry;
      this.deliveryCoordinator = opts.deliveryCoordinator;
      this.convergenceEvaluator = opts.convergenceEvaluator;
      this.quarantineController = opts.quarantineController;
      this.clock = opts.clock;
      this.attestationVerifier = opts.attestationVerifier;
      this.auditLedger = opts.auditLedger;
      this.baseStorageDir = opts.baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
      this.emergencyStopProvider = opts.emergencyStopProvider;
      this.callerToken = opts.callerToken || QUARANTINE_CALLER_TOKEN;
    } else {
      this.registry = registryOrOptions;
      this.deliveryCoordinator = deliveryCoordinator!;
      this.convergenceEvaluator = convergenceEvaluator!;
      this.quarantineController = quarantineController!;
      this.clock = clock!;
      this.attestationVerifier = attestationVerifier;
      this.auditLedger = auditLedger;
      this.baseStorageDir = baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
      this.emergencyStopProvider = emergencyStopProvider;
      this.callerToken = callerToken || QUARANTINE_CALLER_TOKEN;
    }
  }

  private getPartitionDir(tenantId: string, domain: PolicyDomain): string {
    assertValidIdentifier(tenantId, 'tenantId');
    assertValidDomain(domain);
    return path.join(this.baseStorageDir, tenantId, domain);
  }

  private getEpochsFilePath(tenantId: string, domain: PolicyDomain): string {
    return path.join(this.getPartitionDir(tenantId, domain), 'epochs.json');
  }

  private async acquireLock(filePath: string, timeoutMs: number = 5000): Promise<() => void> {
    const lockPath = `${filePath}.lock`;
    const start = Date.now();
    const pollInterval = 50;

    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    while (Date.now() - start < timeoutMs) {
      try {
        const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR);
        fs.closeSync(fd);
        return () => {
          try {
            if (fs.existsSync(lockPath)) {
              fs.unlinkSync(lockPath);
            }
          } catch {
            // Ignore unlock error
          }
        };
      } catch (err: any) {
        if (err.code === 'EEXIST') {
          await new Promise((r) => setTimeout(r, pollInterval));
        } else {
          throw new DistributionPersistenceCorruptionError(`Failed to acquire lock: ${err.message}`);
        }
      }
    }

    throw new DistributionLockTimeoutError(`Timeout waiting for lock on ${filePath}`);
  }

  private loadEpochDecisionsUnderLock(filePath: string): Record<string, EpochDecision> {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw.trim()) return {};
      return JSON.parse(raw);
    } catch (err: any) {
      throw new DistributionPersistenceCorruptionError(`Failed to load epochs file: ${err.message}`);
    }
  }

  private saveEpochDecisionsUnderLock(filePath: string, records: Record<string, EpochDecision>): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${filePath}.tmp`;
    const serialized = canonicalJson(records);
    try {
      const fd = fs.openSync(tmpPath, 'w');
      fs.writeFileSync(fd, serialized, 'utf-8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fs.renameSync(tmpPath, filePath);
    } catch (err: any) {
      try {
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      } catch {
        // Ignore tmp cleanup error
      }
      throw new DistributionPersistenceCorruptionError(`Failed to save epochs file: ${err.message}`);
    }
  }

  private deriveDecisionId(manifest: PolicyDistributionManifest): string {
    return sha256(
      canonicalJson({
        tenantId: manifest.tenantId,
        policyDomain: manifest.policyDomain,
        manifestId: manifest.manifestId,
        epoch: manifest.targetEpoch,
      })
    );
  }

  /**
   * Prepares an epoch decision.
   * State machine: PREPARED
   */
  public async prepare(manifest: PolicyDistributionManifest, nowMs: number): Promise<EpochDecision> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(manifest.tenantId, 'tenantId');
    assertValidDomain(manifest.policyDomain);

    const filePath = this.getEpochsFilePath(manifest.tenantId, manifest.policyDomain);
    const unlock = await this.acquireLock(filePath);

    try {
      const decisions = this.loadEpochDecisionsUnderLock(filePath);
      const decisionId = this.deriveDecisionId(manifest);

      // Check for repeated prepare
      if (decisions[decisionId]) {
        return decisions[decisionId];
      }

      // Determine expected epoch E
      // E must equal the greatest durable distribution epoch for (tenantId, policyDomain) plus one; when none exists, E=1.
      let maxEpoch = 0;
      for (const d of Object.values(decisions)) {
        if (d.epoch > maxEpoch) {
          maxEpoch = d.epoch;
        }
      }
      const expectedEpoch = maxEpoch + 1;

      if (manifest.targetEpoch < expectedEpoch) {
        throw new DistributionEpochConflictError(
          `Stale targetEpoch: ${manifest.targetEpoch} < expected ${expectedEpoch}`
        );
      }
      if (manifest.targetEpoch > expectedEpoch) {
        throw new DistributionEpochConflictError(
          `Future targetEpoch: ${manifest.targetEpoch} > expected ${expectedEpoch}`
        );
      }

      const decision: EpochDecision = {
        decisionId,
        tenantId: manifest.tenantId,
        policyDomain: manifest.policyDomain,
        manifestId: manifest.manifestId,
        epoch: manifest.targetEpoch,
        state: 'PREPARED',
        preparedAt: nowMs,
      };

      decisions[decisionId] = decision;
      this.saveEpochDecisionsUnderLock(filePath, decisions);

      if (this.auditLedger) {
        await this.auditLedger.append(
          {
            eventType: 'EPOCH_PREPARED',
            tenantId: manifest.tenantId,
            policyDomain: manifest.policyDomain,
            actorSource: 'SYSTEM',
            data: {
              decisionId,
              manifestId: manifest.manifestId,
              epoch: manifest.targetEpoch,
              preparedAt: nowMs,
            },
          },
          nowMs
        );
      }

      return decision;
    } finally {
      unlock();
    }
  }

  /**
   * Commits an epoch cutover.
   * State machine: PREPARED -> COMMIT_DURABLE -> COMMIT_DELIVERY -> ATTESTATION_PENDING -> CONVERGED | DIVERGED | RECOVERY_EXHAUSTED
   */
  public async commit(manifest: PolicyDistributionManifest, nowMs: number): Promise<EpochDecision> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(manifest.tenantId, 'tenantId');
    assertValidDomain(manifest.policyDomain);

    const filePath = this.getEpochsFilePath(manifest.tenantId, manifest.policyDomain);
    const unlock = await this.acquireLock(filePath);

    let decision: EpochDecision;
    let cohort: readonly FleetNodeRecord[];

    try {
      const decisions = this.loadEpochDecisionsUnderLock(filePath);
      const decisionId = this.deriveDecisionId(manifest);

      const existing = decisions[decisionId];
      if (!existing) {
        throw new DistributionEpochConflictError(`No prepared epoch decision found for ${decisionId}`);
      }

      // Re-validate supplied manifest against durable prepared decision record
      if (
        existing.manifestId !== manifest.manifestId ||
        existing.tenantId !== manifest.tenantId ||
        existing.policyDomain !== manifest.policyDomain ||
        existing.epoch !== manifest.targetEpoch
      ) {
        throw new DistributionEpochConflictError('Manifest parameters mismatch prepared decision record');
      }

      // Check idempotency if already committed or beyond
      if (existing.state !== 'PREPARED') {
        return existing;
      }

      // Check pre-commit convergence readiness
      const preCommitConvergence = this.convergenceEvaluator.evaluate(manifest, nowMs);
      if (!preCommitConvergence.isCommitEligible) {
        throw new DistributionConvergenceError(
          `Cohort is not commit eligible: status=${preCommitConvergence.status}, ratio=${preCommitConvergence.convergenceRatio}`
        );
      }

      // Authoritative commitAt strictly from this.clock.nowMs() inside lock transaction
      const commitAt = this.clock.nowMs();
      if (
        !Number.isSafeInteger(commitAt) ||
        commitAt < existing.preparedAt ||
        commitAt > manifest.expiresAt
      ) {
        throw new DistributionEpochConflictError(
          `Invalid commitAt timestamp: ${commitAt}, preparedAt=${existing.preparedAt}, expiresAt=${manifest.expiresAt}`
        );
      }

      // 1. Persist COMMIT_DURABLE
      existing.state = 'COMMIT_DURABLE';
      existing.commitAt = commitAt;
      this.saveEpochDecisionsUnderLock(filePath, decisions);

      if (this.auditLedger) {
        await this.auditLedger.append(
          {
            eventType: 'EPOCH_COMMIT_DURABLE',
            tenantId: manifest.tenantId,
            policyDomain: manifest.policyDomain,
            actorSource: 'SYSTEM',
            data: {
              decisionId,
              manifestId: manifest.manifestId,
              epoch: manifest.targetEpoch,
              commitAt,
            },
          },
          commitAt
        );
      }

      // 2. Transition to COMMIT_DELIVERY
      existing.state = 'COMMIT_DELIVERY';
      this.saveEpochDecisionsUnderLock(filePath, decisions);

      if (this.auditLedger) {
        await this.auditLedger.append(
          {
            eventType: 'EPOCH_COMMIT_DELIVERY',
            tenantId: manifest.tenantId,
            policyDomain: manifest.policyDomain,
            actorSource: 'SYSTEM',
            data: {
              decisionId,
              manifestId: manifest.manifestId,
              epoch: manifest.targetEpoch,
              commitAt,
            },
          },
          commitAt
        );
      }

      decision = { ...existing };
      cohort = this.registry.getFleetCohort(
        manifest.tenantId,
        manifest.federationId,
        manifest.policyDomain,
        manifest.targetCanaryRing,
        commitAt
      );
    } finally {
      unlock();
    }

    // 3. Post-commit delivery and reconciliation
    return await this.executePostCommitCoordination(manifest, decision, cohort, nowMs);
  }

  /**
   * Executes post-commit delivery, bounded retries, attestation pending, divergence detection, and reconciliation.
   */
  private async executePostCommitCoordination(
    manifest: PolicyDistributionManifest,
    decision: EpochDecision,
    cohort: readonly FleetNodeRecord[],
    invocationNowMs: number
  ): Promise<EpochDecision> {
    const filePath = this.getEpochsFilePath(manifest.tenantId, manifest.policyDomain);
    const commitAt = decision.commitAt!;
    const maxRetries = 30;
    const retryWindowMs = 30000;

    let attempts = 0;
    let diverged = false;
    let recoveryExhausted = false;

    // Transition decision to ATTESTATION_PENDING under lock
    const lock1 = await this.acquireLock(filePath);
    try {
      const decisions = this.loadEpochDecisionsUnderLock(filePath);
      decisions[decision.decisionId].state = 'ATTESTATION_PENDING';
      this.saveEpochDecisionsUnderLock(filePath, decisions);
      decision.state = 'ATTESTATION_PENDING';
    } finally {
      lock1();
    }

    // Deliver commit message to cohort
    const deliveryResult = await this.deliveryCoordinator.deliverCommit(decision, manifest, cohort, commitAt);
    attempts++;

    // Check delivery failures and schedule retries if needed
    let remainingFailedNodeIds = [...deliveryResult.failedNodeIds];

    while (
      remainingFailedNodeIds.length > 0 &&
      attempts < maxRetries &&
      this.clock.nowMs() - commitAt < retryWindowMs
    ) {
      // Bounded retry attempt
      const retryNodes = cohort.filter((n) => remainingFailedNodeIds.includes(n.nodeId));
      if (retryNodes.length === 0) break;

      const retryResult = await this.deliveryCoordinator.deliverCommit(decision, manifest, retryNodes, this.clock.nowMs());
      attempts++;
      remainingFailedNodeIds = [...retryResult.failedNodeIds];

      if (remainingFailedNodeIds.length === 0) break;
    }

    const currentNowMs = this.clock.nowMs();

    // Check for delivery exhaustion: any remaining failed nodes after retry budget
    if (remainingFailedNodeIds.length > 0) {
      recoveryExhausted = true;
      for (const failedNodeId of remainingFailedNodeIds) {
        const evidenceHash = sha256(
          canonicalJson({
            decisionId: decision.decisionId,
            nodeId: failedNodeId,
            attempts,
            commitAt,
            exhaustedAt: currentNowMs,
          })
        );
        try {
          await this.quarantineController.quarantine(
            {
              tenantId: manifest.tenantId,
              federationId: manifest.federationId,
              policyDomain: manifest.policyDomain,
              nodeId: failedNodeId,
              reason: 'COMMIT_DELIVERY_EXHAUSTED',
              evidenceHash,
              epoch: manifest.targetEpoch,
            },
            currentNowMs,
            this.callerToken
          );
        } catch {
          // Best-effort quarantine under failure
        }
      }
    }

    // Inspect cohort nodes for divergence or synchronization
    const freshCohort = this.registry.getFleetCohort(
      manifest.tenantId,
      manifest.federationId,
      manifest.policyDomain,
      manifest.targetCanaryRing,
      currentNowMs
    );

    let inSyncCount = 0;
    for (const node of freshCohort) {
      if (node.quarantined) {
        continue;
      }
      // Check for split-brain or divergence
      if (
        node.currentPolicyHash &&
        node.currentPolicyHash !== manifest.canonicalPolicyHash &&
        node.currentEpoch >= manifest.targetEpoch
      ) {
        diverged = true;
        const splitBrainEvidence = sha256(
          canonicalJson({
            nodeId: node.nodeId,
            manifestHash: manifest.canonicalPolicyHash,
            nodeHash: node.currentPolicyHash,
            targetEpoch: manifest.targetEpoch,
            nodeEpoch: node.currentEpoch,
          })
        );
        try {
          await this.quarantineController.quarantine(
            {
              tenantId: manifest.tenantId,
              federationId: manifest.federationId,
              policyDomain: manifest.policyDomain,
              nodeId: node.nodeId,
              reason: 'SPLIT_BRAIN',
              evidenceHash: splitBrainEvidence,
              epoch: manifest.targetEpoch,
            },
            currentNowMs,
            this.callerToken
          );
        } catch {
          // Best effort quarantine
        }
        if (this.auditLedger) {
          await this.auditLedger.append(
            {
              eventType: 'SPLIT_BRAIN_DETECTED',
              tenantId: manifest.tenantId,
              policyDomain: manifest.policyDomain,
              actorSource: `NODE:${node.nodeId}`,
              data: {
                nodeId: node.nodeId,
                evidenceHash: splitBrainEvidence,
              },
            },
            currentNowMs
          );
        }
      } else if (
        node.syncStatus === 'IN_SYNC' &&
        node.currentPolicyHash === manifest.canonicalPolicyHash &&
        node.currentEpoch === manifest.targetEpoch
      ) {
        inSyncCount++;
      }
    }

    // Determine final epoch state
    const terminalLock = await this.acquireLock(filePath);
    try {
      const decisions = this.loadEpochDecisionsUnderLock(filePath);
      const stored = decisions[decision.decisionId];

      const terminalAt = this.clock.nowMs();
      stored.terminalAt = terminalAt;

      if (diverged) {
        stored.state = 'DIVERGED';
        if (this.auditLedger) {
          await this.auditLedger.append(
            {
              eventType: 'EPOCH_DIVERGED',
              tenantId: manifest.tenantId,
              policyDomain: manifest.policyDomain,
              actorSource: 'SYSTEM',
              data: { decisionId: decision.decisionId, epoch: manifest.targetEpoch, terminalAt },
            },
            terminalAt
          );
        }
      } else if (recoveryExhausted || inSyncCount < freshCohort.length) {
        stored.state = 'RECOVERY_EXHAUSTED';
        if (this.auditLedger) {
          await this.auditLedger.append(
            {
              eventType: 'EPOCH_RECOVERY_EXHAUSTED',
              tenantId: manifest.tenantId,
              policyDomain: manifest.policyDomain,
              actorSource: 'SYSTEM',
              data: { decisionId: decision.decisionId, epoch: manifest.targetEpoch, terminalAt },
            },
            terminalAt
          );
        }
      } else {
        stored.state = 'CONVERGED';
        if (this.auditLedger) {
          await this.auditLedger.append(
            {
              eventType: 'EPOCH_CONVERGED',
              tenantId: manifest.tenantId,
              policyDomain: manifest.policyDomain,
              actorSource: 'SYSTEM',
              data: { decisionId: decision.decisionId, epoch: manifest.targetEpoch, terminalAt },
            },
            terminalAt
          );
        }
      }

      this.saveEpochDecisionsUnderLock(filePath, decisions);
      return { ...stored };
    } finally {
      terminalLock();
    }
  }

  /**
   * Aborts a prepared epoch before durable commit.
   * State machine: PREPARED -> ABORTED
   */
  public async abort(
    manifest: PolicyDistributionManifest,
    reason: string,
    nowMs: number
  ): Promise<EpochDecision> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(manifest.tenantId, 'tenantId');
    assertValidDomain(manifest.policyDomain);

    const filePath = this.getEpochsFilePath(manifest.tenantId, manifest.policyDomain);
    const unlock = await this.acquireLock(filePath);

    try {
      const decisions = this.loadEpochDecisionsUnderLock(filePath);
      const decisionId = this.deriveDecisionId(manifest);

      const existing = decisions[decisionId];
      if (!existing) {
        throw new DistributionEpochConflictError(`No prepared epoch decision found for ${decisionId}`);
      }

      if (existing.state === 'ABORTED') {
        return existing;
      }

      if (existing.state !== 'PREPARED') {
        throw new DistributionEpochConflictError(
          `Cannot abort epoch in durable state '${existing.state}'`
        );
      }

      const cohort = this.registry.getFleetCohort(
        manifest.tenantId,
        manifest.federationId,
        manifest.policyDomain,
        manifest.targetCanaryRing,
        nowMs
      );

      // Deliver ABORT to cohort nodes
      await this.deliveryCoordinator.deliverAbort(existing, manifest, reason, cohort, nowMs);

      existing.state = 'ABORTED';
      existing.reason = reason;
      existing.terminalAt = nowMs;

      this.saveEpochDecisionsUnderLock(filePath, decisions);

      if (this.auditLedger) {
        await this.auditLedger.append(
          {
            eventType: 'EPOCH_ABORTED',
            tenantId: manifest.tenantId,
            policyDomain: manifest.policyDomain,
            actorSource: 'SYSTEM',
            data: {
              decisionId,
              manifestId: manifest.manifestId,
              epoch: manifest.targetEpoch,
              reason,
              terminalAt: nowMs,
            },
          },
          nowMs
        );
      }

      return { ...existing };
    } finally {
      unlock();
    }
  }

  /**
   * Recovers unfinished epoch decisions.
   */
  public async recover(
    tenantId: string,
    domain: PolicyDomain,
    nowMs: number
  ): Promise<readonly EpochDecision[]> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(tenantId, 'tenantId');
    assertValidDomain(domain);

    const filePath = this.getEpochsFilePath(tenantId, domain);
    const unlock = await this.acquireLock(filePath);

    try {
      const decisions = this.loadEpochDecisionsUnderLock(filePath);
      const results: EpochDecision[] = [];

      for (const decision of Object.values(decisions)) {
        if (
          decision.state === 'COMMIT_DURABLE' ||
          decision.state === 'COMMIT_DELIVERY' ||
          decision.state === 'ATTESTATION_PENDING'
        ) {
          // Bounded recovery: check elapsed time since commitAt
          const commitAt = decision.commitAt || decision.preparedAt;
          const elapsed = nowMs - commitAt;
          const terminalAt = nowMs;

          if (elapsed > 30000) {
            decision.state = 'RECOVERY_EXHAUSTED';
            decision.terminalAt = terminalAt;
            if (this.auditLedger) {
              await this.auditLedger.append(
                {
                  eventType: 'EPOCH_RECOVERY_EXHAUSTED',
                  tenantId,
                  policyDomain: domain,
                  actorSource: 'SYSTEM',
                  data: {
                    decisionId: decision.decisionId,
                    epoch: decision.epoch,
                    terminalAt,
                  },
                },
                terminalAt
              );
            }
          }
        }
        results.push(decision);
      }

      this.saveEpochDecisionsUnderLock(filePath, decisions);
      return results;
    } finally {
      unlock();
    }
  }
}
