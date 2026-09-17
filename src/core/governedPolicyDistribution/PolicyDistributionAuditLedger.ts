// src/core/governedPolicyDistribution/PolicyDistributionAuditLedger.ts
// Component 1226: PolicyDistributionAuditLedger
//
// Append-only cryptographic distribution audit chain with deterministic secret scrubbing and integrity verification.

import * as fs from 'fs';
import * as path from 'path';
import {
  type DistributionAuditEventInput,
  type DistributionAuditRecord,
  type LedgerVerificationResult,
  type EmergencyStopProvider,
  type PolicyDomain,
  type UuidV4Generator,
  GENESIS_DISTRIBUTION_HASH,
  assertValidIdentifier,
  assertValidDomain,
  assertEmergencyStopInactive,
  scrubAuditData,
  canonicalJson,
  computeEventHash,
  asDistributionAuditRecordId,
  DistributionValidationError,
  DistributionTenantIsolationError,
  DistributionLockTimeoutError,
  DistributionPersistenceCorruptionError,
  DistributionLedgerIntegrityError,
  ALL_DISTRIBUTION_AUDIT_EVENT_TYPES,
} from './GovernedPolicyDistributionTypes.js';

export interface PolicyDistributionAuditLedgerOptions {
  baseStorageDir?: string;
  emergencyStopProvider?: EmergencyStopProvider;
  uuidGenerator?: UuidV4Generator;
}

export class PolicyDistributionAuditLedger {
  private readonly baseStorageDir: string;
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly uuidGenerator?: UuidV4Generator;

  constructor(
    baseStorageDirOrOptions?: string | PolicyDistributionAuditLedgerOptions,
    emergencyStopProvider?: EmergencyStopProvider,
    uuidGenerator?: UuidV4Generator
  ) {
    if (typeof baseStorageDirOrOptions === 'object' && baseStorageDirOrOptions !== null) {
      this.baseStorageDir = baseStorageDirOrOptions.baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
      this.emergencyStopProvider = baseStorageDirOrOptions.emergencyStopProvider;
      this.uuidGenerator = baseStorageDirOrOptions.uuidGenerator;
    } else {
      this.baseStorageDir = baseStorageDirOrOptions || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
      this.emergencyStopProvider = emergencyStopProvider;
      this.uuidGenerator = uuidGenerator;
    }
  }

  private getPartitionDir(tenantId: string, domain: PolicyDomain): string {
    assertValidIdentifier(tenantId, 'tenantId');
    assertValidDomain(domain);
    return path.join(this.baseStorageDir, tenantId, domain);
  }

  private getLedgerFilePath(tenantId: string, domain: PolicyDomain): string {
    return path.join(this.getPartitionDir(tenantId, domain), 'audit.jsonl');
  }

  private generateEventId(): string {
    if (this.uuidGenerator) {
      return this.uuidGenerator.next();
    }
    // Fallback standard crypto UUIDv4
    const { randomUUID } = require('crypto');
    return randomUUID();
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

  private readLastEventHashUnderLock(filePath: string): string {
    if (!fs.existsSync(filePath)) {
      return GENESIS_DISTRIBUTION_HASH;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return GENESIS_DISTRIBUTION_HASH;
    }
    try {
      const last = JSON.parse(lines[lines.length - 1]);
      return last.eventHash;
    } catch (err: any) {
      throw new DistributionPersistenceCorruptionError(`Corrupted ledger line: ${err.message}`);
    }
  }

  /**
   * Appends an audit event to the append-only SHA-256 chain.
   * Performs recursive secret scrubbing before canonicalization and hashing.
   */
  public async append(
    input: DistributionAuditEventInput,
    nowMs: number
  ): Promise<DistributionAuditRecord> {
    assertEmergencyStopInactive(this.emergencyStopProvider);
    assertValidIdentifier(input.tenantId, 'tenantId');
    assertValidDomain(input.policyDomain);

    if (!ALL_DISTRIBUTION_AUDIT_EVENT_TYPES.includes(input.eventType)) {
      throw new DistributionValidationError(`Invalid eventType: ${input.eventType}`);
    }

    if (!input.actorSource || typeof input.actorSource !== 'string') {
      throw new DistributionValidationError('Invalid actorSource');
    }
    if (input.actorSource.startsWith('NODE:')) {
      const nodeId = input.actorSource.substring(5);
      assertValidIdentifier(nodeId, 'actorSource nodeId');
    } else if (input.actorSource !== 'SYSTEM' && input.actorSource !== 'TRANSPORT_ADAPTER') {
      throw new DistributionValidationError(`Invalid actorSource: ${input.actorSource}`);
    }

    // 1. Recursive secret scrubbing
    const scrubbedData = scrubAuditData(input.data);
    const scrubbedDataJson = canonicalJson(scrubbedData);
    if (Buffer.byteLength(scrubbedDataJson, 'utf-8') > 65536) {
      throw new DistributionValidationError('Scrubbed audit data exceeds 65536 bytes');
    }

    const filePath = this.getLedgerFilePath(input.tenantId, input.policyDomain);
    const unlock = await this.acquireLock(filePath);

    try {
      const previousHash = this.readLastEventHashUnderLock(filePath);
      const eventId = asDistributionAuditRecordId(this.generateEventId());

      const payload = {
        eventId,
        eventType: input.eventType,
        timestamp: nowMs,
        tenantId: input.tenantId,
        policyDomain: input.policyDomain,
        actorSource: input.actorSource,
        data: scrubbedData,
      };

      const eventHash = computeEventHash(previousHash, payload);

      const record: DistributionAuditRecord = {
        ...payload,
        previousHash,
        eventHash,
      };

      // Append record as JSON line
      const line = canonicalJson(record) + '\n';
      fs.appendFileSync(filePath, line, 'utf-8');

      return record;
    } finally {
      unlock();
    }
  }

  /**
   * Verifies the cryptographic integrity of the audit chain from genesis to head.
   */
  public async verify(tenantId: string, domain: PolicyDomain): Promise<LedgerVerificationResult> {
    assertValidIdentifier(tenantId, 'tenantId');
    assertValidDomain(domain);

    const filePath = this.getLedgerFilePath(tenantId, domain);
    if (!fs.existsSync(filePath)) {
      return {
        valid: true,
        verifiedEventCount: 0,
        headHash: GENESIS_DISTRIBUTION_HASH,
      };
    }

    const unlock = await this.acquireLock(filePath);
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const lines = raw.trim().split(/\r?\n/).filter(line => line.trim().length > 0);

      let expectedPreviousHash = GENESIS_DISTRIBUTION_HASH;
      let count = 0;

      for (let i = 0; i < lines.length; i++) {
        let parsed: any;
        try {
          parsed = JSON.parse(lines[i]);
        } catch (err: any) {
          throw new DistributionLedgerIntegrityError(`Corrupted JSON on line ${i + 1}: ${err.message}`);
        }

        if (parsed.previousHash !== expectedPreviousHash) {
          throw new DistributionLedgerIntegrityError(
            `Previous hash mismatch on line ${i + 1}: expected ${expectedPreviousHash}, got ${parsed.previousHash}`
          );
        }

        const payload = {
          eventId: parsed.eventId,
          eventType: parsed.eventType,
          timestamp: parsed.timestamp,
          tenantId: parsed.tenantId,
          policyDomain: parsed.policyDomain,
          actorSource: parsed.actorSource,
          data: parsed.data,
        };

        const recomputedHash = computeEventHash(parsed.previousHash, payload);
        if (recomputedHash !== parsed.eventHash) {
          throw new DistributionLedgerIntegrityError(
            `Event hash mismatch on line ${i + 1}: expected ${recomputedHash}, got ${parsed.eventHash}`
          );
        }

        expectedPreviousHash = parsed.eventHash;
        count++;
      }

      return {
        valid: true,
        verifiedEventCount: count,
        headHash: expectedPreviousHash,
      };
    } finally {
      unlock();
    }
  }
}
