// src/core/governedPolicyDistribution/PolicyDistributionManifestPackager.ts
// Component 1220: PolicyDistributionManifestPackager
//
// Immutable manifest construction from verified upstream MS-1.5.20 and MS-1.5.21 records.

import * as fs from 'fs';
import * as path from 'path';
import type {
  CanonicalStrategicPolicy,
  AuthoritativeRatificationRecord,
} from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';
import type {
  PolicyLifecycleRecord,
} from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
import {
  type PolicyDistributionManifest,
  type CanaryRing,
  type EmergencyStopProvider,
  type UuidV4Generator,
  type PolicyDomain,
  assertValidIdentifier,
  assertValidDomain,
  assertEmergencyStopInactive,
  ms120CanonicalPolicyHash,
  computeManifestFingerprint,
  asDistributionManifestId,
  canonicalJson,
  DistributionValidationError,
  DistributionTenantIsolationError,
  DistributionManifestValidationError,
  DistributionLockTimeoutError,
  DistributionPersistenceCorruptionError,
} from './GovernedPolicyDistributionTypes.js';
import { PolicyDistributionAuditLedger } from './PolicyDistributionAuditLedger.js';

export interface PolicyDistributionManifestPackagerOptions {
  baseStorageDir?: string;
  emergencyStopProvider?: EmergencyStopProvider;
  uuidGenerator?: UuidV4Generator;
  auditLedger?: PolicyDistributionAuditLedger;
}

export class PolicyDistributionManifestPackager {
  private readonly baseStorageDir: string;
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly uuidGenerator?: UuidV4Generator;
  private readonly auditLedger?: PolicyDistributionAuditLedger;

  constructor(
    baseStorageDirOrOptions?: string | PolicyDistributionManifestPackagerOptions,
    emergencyStopProvider?: EmergencyStopProvider,
    uuidGenerator?: UuidV4Generator,
    auditLedger?: PolicyDistributionAuditLedger
  ) {
    if (typeof baseStorageDirOrOptions === 'object' && baseStorageDirOrOptions !== null) {
      this.baseStorageDir = baseStorageDirOrOptions.baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
      this.emergencyStopProvider = baseStorageDirOrOptions.emergencyStopProvider;
      this.uuidGenerator = baseStorageDirOrOptions.uuidGenerator;
      this.auditLedger = baseStorageDirOrOptions.auditLedger;
    } else {
      this.baseStorageDir = baseStorageDirOrOptions || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
      this.emergencyStopProvider = emergencyStopProvider;
      this.uuidGenerator = uuidGenerator;
      this.auditLedger = auditLedger;
    }
  }

  private getPartitionDir(tenantId: string, domain: PolicyDomain): string {
    assertValidIdentifier(tenantId, 'tenantId');
    assertValidDomain(domain);
    return path.join(this.baseStorageDir, tenantId, domain);
  }

  private getManifestFilePath(tenantId: string, domain: PolicyDomain, manifestId: string): string {
    return path.join(this.getPartitionDir(tenantId, domain), 'manifests', `${manifestId}.json`);
  }

  private generateUuid(): string {
    if (this.uuidGenerator) {
      return this.uuidGenerator.next();
    }
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

  /**
   * Packages an immutable PolicyDistributionManifest from verified upstream records.
   * Reconstructs exact MS-1.5.20 envelope and verifies canonical policy hash.
   */
  public async packageManifest(
    policy: CanonicalStrategicPolicy,
    ratification: AuthoritativeRatificationRecord,
    lifecycle: PolicyLifecycleRecord,
    targetFederation: string,
    ring: CanaryRing,
    targetEpoch: number,
    nowMs: number,
    ttlMs: number = 60000
  ): Promise<PolicyDistributionManifest> {
    assertEmergencyStopInactive(this.emergencyStopProvider);

    const meta = (policy as any).metadata || policy;
    const policyTenantId = meta.tenantId;
    const policyDomain = meta.policyDomain;
    const policyId = meta.policyId;
    const policyVersion = meta.policyVersion;
    const parentPolicyVersion = meta.parentVersion || 0;
    const policyCanonicalHash = meta.canonicalHash;

    const lfcState = (lifecycle as any).lifecycleState || (lifecycle as any).state;
    const lfcRecordId = (lifecycle as any).recordId || (lifecycle as any).lifecycleRecordId || '';
    const lfcVersion = (lifecycle as any).lifecycleVersion || (lifecycle as any).version || 1;

    // 1. Validate identifiers
    assertValidIdentifier(policyTenantId, 'tenantId');
    assertValidIdentifier(targetFederation, 'targetFederation');
    assertValidDomain(policyDomain);

    if (ring < 0 || ring > 4) {
      throw new DistributionValidationError(`Invalid canary ring: ${ring}`);
    }
    if (!Number.isSafeInteger(targetEpoch) || targetEpoch <= 0) {
      throw new DistributionValidationError(`Invalid targetEpoch: must be positive safe integer (${targetEpoch})`);
    }

    // 2. Cross-record binding validation
    if (
      policyTenantId !== ratification.tenantId ||
      policyTenantId !== lifecycle.tenantId
    ) {
      throw new DistributionTenantIsolationError('Cross-tenant binding mismatch between policy, ratification, and lifecycle records');
    }

    if (
      policyDomain !== ratification.policyDomain ||
      policyDomain !== lifecycle.policyDomain
    ) {
      throw new DistributionManifestValidationError('Policy domain mismatch between policy, ratification, and lifecycle records');
    }

    if (
      policyId !== lifecycle.policyId
    ) {
      throw new DistributionManifestValidationError('Policy ID mismatch between policy and lifecycle record');
    }

    if (
      policyVersion !== ratification.policyVersion ||
      policyVersion !== lifecycle.policyVersion
    ) {
      throw new DistributionManifestValidationError('Policy version mismatch between policy, ratification, and lifecycle records');
    }

    // 3. Upstream lifecycle state verification
    if (
      lfcState !== 'STAGED' &&
      lfcState !== 'ACTIVE' &&
      lfcState !== 'DEGRADED'
    ) {
      throw new DistributionManifestValidationError(
        `Lifecycle state not eligible for distribution: ${lfcState} (must be STAGED, ACTIVE, or DEGRADED)`
      );
    }

    // 4. Exact MS-1.5.20 canonical policy hash verification
    const computedHash = ms120CanonicalPolicyHash(policy);
    if (
      policyCanonicalHash !== computedHash ||
      ratification.canonicalPolicyHash !== computedHash ||
      lifecycle.canonicalPolicyHash !== computedHash
    ) {
      throw new DistributionManifestValidationError(
        `Canonical policy hash mismatch: computed=${computedHash}, metadata=${policyCanonicalHash}, ratification=${ratification.canonicalPolicyHash}, lifecycle=${lifecycle.canonicalPolicyHash}`
      );
    }

    if (ratification.ratificationId !== (lifecycle as any).ratificationId) {
      throw new DistributionManifestValidationError(
        `Ratification ID mismatch: ratification=${ratification.ratificationId}, lifecycle=${(lifecycle as any).ratificationId}`
      );
    }

    // 5. TTL bounded to [1, 60000]
    const clampedTtl = Math.max(1, Math.min(60000, ttlMs));
    const issuedAt = nowMs;
    const expiresAt = issuedAt + clampedTtl;

    // 6. Deep freeze compiledRules
    const deepFrozenRules: Record<string, any> = JSON.parse(JSON.stringify(policy.rules));
    Object.freeze(deepFrozenRules);
    for (const key of Object.keys(deepFrozenRules)) {
      Object.freeze(deepFrozenRules[key]);
    }

    const manifestId = asDistributionManifestId(this.generateUuid());
    const distributionNonce = this.generateUuid();

    const manifestPayload = {
      manifestId,
      tenantId: policyTenantId,
      federationId: targetFederation,
      policyDomain,
      policyId,
      policyVersion,
      parentPolicyVersion,
      canonicalPolicyHash: computedHash,
      ratificationId: ratification.ratificationId,
      lifecycleRecordId: lfcRecordId,
      lifecycleState: lfcState as 'STAGED' | 'ACTIVE' | 'DEGRADED',
      lifecycleVersion: lfcVersion,
      targetEpoch,
      targetCanaryRing: ring,
      compiledRules: deepFrozenRules,
      distributionNonce,
      issuedAt,
      expiresAt,
    };

    const manifestFingerprint = computeManifestFingerprint(manifestPayload);

    const manifest: PolicyDistributionManifest = {
      ...manifestPayload,
      manifestFingerprint,
    };

    // 7. Atomic persistence under lock
    const manifestFile = this.getManifestFilePath(manifest.tenantId, manifest.policyDomain, manifest.manifestId);
    const manifestsDir = path.dirname(manifestFile);
    if (!fs.existsSync(manifestsDir)) {
      fs.mkdirSync(manifestsDir, { recursive: true });
    }

    const unlock = await this.acquireLock(manifestFile);
    try {
      const tmpPath = `${manifestFile}.tmp`;
      const serialized = canonicalJson(manifest);
      const fd = fs.openSync(tmpPath, 'w');
      fs.writeFileSync(fd, serialized, 'utf-8');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fs.renameSync(tmpPath, manifestFile);
    } finally {
      unlock();
    }

    // 8. Audit ledger logging
    if (this.auditLedger) {
      await this.auditLedger.append(
        {
          eventType: 'MANIFEST_PACKAGED',
          tenantId: manifest.tenantId,
          policyDomain: manifest.policyDomain,
          actorSource: 'SYSTEM',
          data: {
            manifestId: manifest.manifestId,
            federationId: manifest.federationId,
            policyId: manifest.policyId,
            policyVersion: manifest.policyVersion,
            canonicalPolicyHash: manifest.canonicalPolicyHash,
            lifecycleVersion: manifest.lifecycleVersion,
            targetEpoch: manifest.targetEpoch,
            targetCanaryRing: manifest.targetCanaryRing,
            manifestFingerprint: manifest.manifestFingerprint,
            issuedAt: manifest.issuedAt,
            expiresAt: manifest.expiresAt,
          },
        },
        nowMs
      );
    }

    return Object.freeze(manifest);
  }
}
