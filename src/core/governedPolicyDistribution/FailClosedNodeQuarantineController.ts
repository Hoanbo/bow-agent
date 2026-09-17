// src/core/governedPolicyDistribution/FailClosedNodeQuarantineController.ts
// Component 1225: FailClosedNodeQuarantineController
//
// Node quarantine record lifecycle, publication adapter coordination, and fail-closed release gate.

import * as fs from 'fs';
import * as path from 'path';
import {
  type QuarantineInput,
  type NodeRef,
  type NodeQuarantineRecord,
  type NodePolicyAttestationReceipt,
  type PolicyQuarantinePublicationAdapter,
  type QuarantinePublicationRequest,
  type QuarantinePublicationAck,
  type DistributionControlKeyResolver,
  type NodeAttestationKeyResolver,
  type EmergencyStopProvider,
  type UuidV4Generator,
  type PolicyDomain,
  assertValidIdentifier,
  assertValidDomain,
  assertEmergencyStopInactive,
  sha256,
  hmacSha256,
  timingSafeEqualHex,
  canonicalJson,
  computeQuarantineRequestProofPayload,
  computeQuarantineAckProofPayload,
  asNodeQuarantineId,
  DistributionValidationError,
  DistributionTenantIsolationError,
  DistributionQuarantineError,
  DistributionQuarantinePublicationError,
  DistributionLockTimeoutError,
  DistributionPersistenceCorruptionError,
  ALL_QUARANTINE_REASONS,
} from './GovernedPolicyDistributionTypes.js';
import { FleetNodeRegistry } from './FleetNodeRegistry.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';

export const QUARANTINE_CALLER_TOKEN = Symbol('QUARANTINE_CALLER_TOKEN');

export class FailClosedNodeQuarantineController {
  private readonly publicationAdapter?: PolicyQuarantinePublicationAdapter;
  private readonly controlKeyResolver?: DistributionControlKeyResolver;
  private readonly attestationKeyResolver?: NodeAttestationKeyResolver;
  private readonly registry: FleetNodeRegistry;
  private readonly auditLedger?: PolicyDistributionAuditLedger;
  private readonly baseStorageDir: string;
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly uuidGenerator?: UuidV4Generator;

  private authorizedCallerToken?: symbol;

  constructor(
    registry: FleetNodeRegistry,
    publicationAdapter?: PolicyQuarantinePublicationAdapter,
    controlKeyResolver?: DistributionControlKeyResolver,
    attestationKeyResolver?: NodeAttestationKeyResolver,
    auditLedger?: PolicyDistributionAuditLedger,
    baseStorageDir?: string,
    emergencyStopProvider?: EmergencyStopProvider,
    uuidGenerator?: UuidV4Generator
  ) {
    this.registry = registry;
    this.publicationAdapter = publicationAdapter;
    this.controlKeyResolver = controlKeyResolver;
    this.attestationKeyResolver = attestationKeyResolver;
    this.auditLedger = auditLedger;
    this.baseStorageDir = baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
    this.emergencyStopProvider = emergencyStopProvider;
    this.uuidGenerator = uuidGenerator;
  }

  public setCallerToken(token: symbol): void {
    this.authorizedCallerToken = token;
  }

  private generateUuid(): string {
    if (this.uuidGenerator) {
      return this.uuidGenerator.next();
    }
    const { randomUUID } = require('crypto');
    return randomUUID();
  }

  private getPartitionDir(tenantId: string, domain: PolicyDomain): string {
    assertValidIdentifier(tenantId, 'tenantId');
    assertValidDomain(domain);
    return path.join(this.baseStorageDir, tenantId, domain);
  }

  private getQuarantineFilePath(tenantId: string, domain: PolicyDomain): string {
    return path.join(this.getPartitionDir(tenantId, domain), 'quarantine.json');
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
          await new Promise(r => setTimeout(r, pollInterval));
        } else {
          throw new DistributionPersistenceCorruptionError(`Failed to acquire lock: ${err.message}`);
        }
      }
    }

    throw new DistributionLockTimeoutError(`Timeout waiting for lock on ${filePath}`);
  }

  private loadQuarantineRecordsUnderLock(filePath: string): Record<string, NodeQuarantineRecord> {
    if (!fs.existsSync(filePath)) {
      return {};
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw.trim()) return {};
      return JSON.parse(raw);
    } catch (err: any) {
      throw new DistributionPersistenceCorruptionError(`Failed to load quarantine file: ${err.message}`);
    }
  }

  private saveQuarantineRecordsUnderLock(filePath: string, records: Record<string, NodeQuarantineRecord>): void {
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
      throw new DistributionPersistenceCorruptionError(`Failed to save quarantine file: ${err.message}`);
    }
  }

  /**
   * Quarantines a node fail-closed.
   */
  public async quarantine(
    input: QuarantineInput,
    nowMs: number,
    callerToken?: symbol
  ): Promise<NodeQuarantineRecord> {
    assertEmergencyStopInactive(this.emergencyStopProvider);

    // 1. Validate caller token
    if (
      !callerToken ||
      callerToken !== this.authorizedCallerToken && callerToken !== QUARANTINE_CALLER_TOKEN
    ) {
      throw new DistributionQuarantineError('Unauthorized quarantine caller: internal caller token required');
    }

    // 2. Validate input
    assertValidIdentifier(input.tenantId, 'tenantId');
    assertValidIdentifier(input.federationId, 'federationId');
    assertValidIdentifier(input.nodeId, 'nodeId');
    assertValidDomain(input.policyDomain);

    if (!ALL_QUARANTINE_REASONS.includes(input.reason)) {
      throw new DistributionValidationError(`Invalid quarantine reason: ${input.reason}`);
    }
    if (!input.evidenceHash) {
      throw new DistributionValidationError('Missing quarantine evidenceHash');
    }

    const nodeKey = `${input.tenantId}:${input.federationId}:${input.nodeId}`;
    const filePath = this.getQuarantineFilePath(input.tenantId, input.policyDomain);
    const unlock = await this.acquireLock(filePath);

    try {
      const records = this.loadQuarantineRecordsUnderLock(filePath);

      // Check if already quarantined with exact same record
      if (records[nodeKey] && !records[nodeKey].releasedAt) {
        const existing = records[nodeKey];
        return existing;
      }

      const quarantineId = asNodeQuarantineId(this.generateUuid());
      const quarantineRecord: NodeQuarantineRecord = {
        quarantineId,
        nodeId: input.nodeId,
        tenantId: input.tenantId,
        federationId: input.federationId,
        policyDomain: input.policyDomain,
        reason: input.reason,
        evidenceHash: input.evidenceHash,
        epoch: input.epoch,
        quarantinedAt: nowMs,
      };

      records[nodeKey] = quarantineRecord;
      this.saveQuarantineRecordsUnderLock(filePath, records);

      // Update registry
      await this.registry.updateNodeQuarantine(
        input.tenantId,
        input.federationId,
        input.policyDomain,
        input.nodeId,
        true,
        nowMs
      );

      // Audit log
      if (this.auditLedger) {
        await this.auditLedger.append(
          {
            eventType: 'NODE_QUARANTINED',
            tenantId: input.tenantId,
            policyDomain: input.policyDomain,
            actorSource: 'SYSTEM',
            data: {
              quarantineId,
              nodeId: input.nodeId,
              federationId: input.federationId,
              reason: input.reason,
              evidenceHash: input.evidenceHash,
              epoch: input.epoch,
            },
          },
          nowMs
        );
      }

      // 3. Publish to adapter if configured
      if (this.publicationAdapter && this.controlKeyResolver) {
        await this.publishQuarantine(quarantineRecord, nowMs);
      }

      return Object.freeze(quarantineRecord);
    } finally {
      unlock();
    }
  }

  private async publishQuarantine(record: NodeQuarantineRecord, nowMs: number): Promise<void> {
    const nonce = this.generateUuid();
    const keyId = 'control-key-1';

    const reqPayload = {
      tenantId: record.tenantId,
      federationId: record.federationId,
      nodeId: record.nodeId,
      policyDomain: record.policyDomain,
      canonicalPolicyHash: record.evidenceHash,
      quarantineEpoch: record.epoch,
      nonce,
    };
    const requestId = sha256(canonicalJson(reqPayload));

    let resolvedKey: Uint8Array | undefined;
    try {
      resolvedKey = this.controlKeyResolver?.resolve(
        record.tenantId,
        record.federationId,
        record.nodeId,
        keyId
      );
    } catch {
      resolvedKey = undefined;
    }

    if (!resolvedKey) {
      if (this.auditLedger) {
        await this.auditLedger.append(
          {
            eventType: 'QUARANTINE_PUBLICATION_FAILED',
            tenantId: record.tenantId,
            policyDomain: record.policyDomain,
            actorSource: 'SYSTEM',
            data: { requestId, reason: 'KEY_RESOLUTION_FAILED' },
          },
          nowMs
        );
      }
      return; // Fail-closed: node remains quarantined in registry
    }

    const requestWithoutProof: Omit<QuarantinePublicationRequest, 'proof'> = {
      requestId,
      tenantId: record.tenantId,
      federationId: record.federationId,
      nodeId: record.nodeId,
      policyDomain: record.policyDomain,
      policyVersion: 1,
      canonicalPolicyHash: record.evidenceHash,
      reason: record.reason,
      evidenceFingerprint: record.evidenceHash,
      quarantineEpoch: record.epoch,
      issuedAt: nowMs,
      nonce,
      keyId,
    };

    const proof = hmacSha256(resolvedKey, computeQuarantineRequestProofPayload(requestWithoutProof));
    const request: QuarantinePublicationRequest = {
      ...requestWithoutProof,
      proof,
    };

    let attempts = 0;
    let success = false;

    while (attempts < 5 && !success) {
      attempts++;
      try {
        const ack = await this.publicationAdapter!.publish(request, 5000);
        if (ack && ack.status === 'ACK_SUCCESS') {
          // Verify ack HMAC
          if (this.attestationKeyResolver) {
            const attestationKey = this.attestationKeyResolver.resolve(
              ack.tenantId,
              ack.federationId,
              ack.nodeId,
              ack.keyId
            );
            if (attestationKey) {
              const expectedAckProof = hmacSha256(attestationKey, computeQuarantineAckProofPayload(ack));
              if (timingSafeEqualHex(ack.proof, expectedAckProof)) {
                success = true;
                break;
              }
            }
          }
        }
      } catch {
        // Wait 1000ms before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!success && this.auditLedger) {
      await this.auditLedger.append(
        {
          eventType: 'QUARANTINE_PUBLICATION_FAILED',
          tenantId: record.tenantId,
          policyDomain: record.policyDomain,
          actorSource: 'SYSTEM',
          data: { requestId, reason: 'ADAPTER_RETRY_EXHAUSTED' },
        },
        nowMs
      );
    }
  }

  /**
   * Releases a node from quarantine.
   */
  public async release(
    nodeRef: NodeRef,
    receipt: NodePolicyAttestationReceipt,
    nowMs: number
  ): Promise<NodeQuarantineRecord> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(nodeRef.tenantId, 'tenantId');
    assertValidIdentifier(nodeRef.federationId, 'federationId');
    assertValidIdentifier(nodeRef.nodeId, 'nodeId');
    assertValidDomain(nodeRef.policyDomain);

    if (
      receipt.tenantId !== nodeRef.tenantId ||
      receipt.federationId !== nodeRef.federationId ||
      receipt.nodeId !== nodeRef.nodeId ||
      receipt.policyDomain !== nodeRef.policyDomain
    ) {
      throw new DistributionValidationError('Receipt bindings do not match node reference for release');
    }

    if (receipt.status !== 'COMMITTED') {
      throw new DistributionValidationError('Quarantine release requires valid COMMITTED receipt');
    }

    const nodeKey = `${nodeRef.tenantId}:${nodeRef.federationId}:${nodeRef.nodeId}`;
    const filePath = this.getQuarantineFilePath(nodeRef.tenantId, nodeRef.policyDomain);
    const unlock = await this.acquireLock(filePath);

    try {
      const records = this.loadQuarantineRecordsUnderLock(filePath);
      const existing = records[nodeKey];
      if (!existing || existing.releasedAt) {
        throw new DistributionQuarantineError(`Node not currently quarantined: ${nodeKey}`);
      }

      const updatedRecord: NodeQuarantineRecord = {
        ...existing,
        releasedAt: nowMs,
        releaseReceiptId: receipt.attestationId,
      };

      records[nodeKey] = updatedRecord;
      this.saveQuarantineRecordsUnderLock(filePath, records);

      // Update registry
      await this.registry.updateNodeQuarantine(
        nodeRef.tenantId,
        nodeRef.federationId,
        nodeRef.policyDomain,
        nodeRef.nodeId,
        false,
        nowMs
      );

      // Audit log
      if (this.auditLedger) {
        await this.auditLedger.append(
          {
            eventType: 'NODE_QUARANTINE_RELEASED',
            tenantId: nodeRef.tenantId,
            policyDomain: nodeRef.policyDomain,
            actorSource: 'SYSTEM',
            data: {
              quarantineId: existing.quarantineId,
              nodeId: nodeRef.nodeId,
              releaseReceiptId: receipt.attestationId,
            },
          },
          nowMs
        );
      }

      return Object.freeze(updatedRecord);
    } finally {
      unlock();
    }
  }

  /**
   * Synchronous query of quarantine state.
   */
  public get(nodeRef: NodeRef): NodeQuarantineRecord | undefined {
    assertValidIdentifier(nodeRef.tenantId, 'tenantId');
    assertValidDomain(nodeRef.policyDomain);

    const nodeKey = `${nodeRef.tenantId}:${nodeRef.federationId}:${nodeRef.nodeId}`;
    const filePath = this.getQuarantineFilePath(nodeRef.tenantId, nodeRef.policyDomain);

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const records = JSON.parse(raw);
        if (records[nodeKey] && !records[nodeKey].releasedAt) {
          return records[nodeKey];
        }
      } catch {
        // Ignore read error
      }
    }
    return undefined;
  }
}
