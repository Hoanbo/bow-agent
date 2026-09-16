// src/core/governedPolicyDecisionIngestion/StrategicPolicyVersionStore.ts
// Component 1173: StrategicPolicyVersionStore (REAL)
//
// Multi-tenant crash-safe partitioned storage for canonical strategic policies.
// Implements 4-step atomic write protocol (.tmp -> checksum readback -> .bak -> atomic rename),
// Windows device name defenses, version lineage tracking, and startup crash recovery.
// Lưu trữ phân vùng an toàn chống sự cố cho các chính sách chiến lược chuẩn đa tenant.
// Thực thi giao thức ghi nguyên tử 4 bước, phòng vệ tên thiết bị Windows, theo dõi phả hệ phiên bản và tự phục hồi khi khởi động.

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import {
  PolicyTenantIsolationError,
  PolicyVersionOCCConflictError,
  computeCanonicalPolicyHash,
  type CanonicalStrategicPolicy,
  type AuthoritativeRatificationRecord,
  type PolicyDeploymentRecord,
} from './GovernedPolicyDecisionIngestionTypes.js';
import type { HumanDecisionRecord, HumanDecisionToken } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { HumanDecisionTokenVerificationEngine } from './HumanDecisionTokenVerificationEngine.js';

export class StrategicPolicyVersionStore {
  private readonly baseDir: string;
  private readonly inMemoryCache = new Map<string, CanonicalStrategicPolicy>(); // tenant:domain -> policy
  readonly #tokenVerifier?: HumanDecisionTokenVerificationEngine;
  readonly #isEmergencyStopActive?: (domain?: string) => boolean;
  readonly #isUserStopActive?: (tenantId?: string) => boolean;

  constructor(
    customBaseDir?: string,
    security?: {
      tokenVerifier?: HumanDecisionTokenVerificationEngine;
      isEmergencyStopActive?: (domain?: string) => boolean;
      isUserStopActive?: (tenantId?: string) => boolean;
    }
  ) {
    this.baseDir = customBaseDir || path.resolve(process.cwd(), 'data', 'partitions_strategic_policies');
    this.#tokenVerifier = security?.tokenVerifier;
    this.#isEmergencyStopActive = security?.isEmergencyStopActive;
    this.#isUserStopActive = security?.isUserStopActive;
    this.reconcileAllPartitions();
  }

  /**
   * Save a compiled canonical policy as an immutable historical version and active candidate.
   * Lưu chính sách đã biên dịch thành phiên bản lịch sử bất biến và dự phòng cho active.
   */
  public savePolicyVersion(policy: CanonicalStrategicPolicy): void {
    this.assertValidTenantAndDomain(policy.tenantId, policy.policyDomain);

    const domainDir = this.ensureDomainDirectory(policy.tenantId, policy.policyDomain);
    const versionsDir = path.join(domainDir, 'versions');
    if (!fs.existsSync(versionsDir)) {
      fs.mkdirSync(versionsDir, { recursive: true });
    }

    const versionPath = path.join(versionsDir, `version_${policy.policyVersion}.json`);
    if (fs.existsSync(versionPath)) {
      throw new PolicyVersionOCCConflictError(
        `DUPLICATE_VERSION_WRITE: Version ${policy.policyVersion} already exists in tenant '${policy.tenantId}' domain '${policy.policyDomain}'.`
      );
    }

    // Atomic write historical version
    this.atomicWriteJson(versionPath, policy);
  }

  /**
   * Authoritative deployment mutation gate.
   * Direct active-policy mutation without verified sole-human authority, valid
   * ratification certificate, and emergency-stop interlock validation is strictly
   * rejected fail-closed.
   * The underlying mutation primitive is runtime-private (#activateVerifiedPolicy).
   */
  public activatePolicy(
    policy: CanonicalStrategicPolicy,
    activationAuthorization?: {
      token: HumanDecisionToken;
      record: HumanDecisionRecord;
    }
  ): void {
    if (!activationAuthorization || !this.#tokenVerifier) {
      throw new Error('UNAUTHORIZED_POLICY_ACTIVATION: cryptographic Human Authority evidence is required.');
    }

    if (!this.#isEmergencyStopActive) {
      throw new Error('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: activation fails closed.');
    }
    let emergencyStopActive: boolean;
    try {
      emergencyStopActive = this.#isEmergencyStopActive(policy.policyDomain);
    } catch {
      throw new Error('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: activation fails closed.');
    }
    if (typeof emergencyStopActive !== 'boolean') {
      throw new Error('EMERGENCY_STOP_PROVIDER_INVALID: activation fails closed.');
    }
    if (emergencyStopActive) {
      throw new Error(`EMERGENCY_STOP_ACTIVE: policy activation blocked for domain '${policy.policyDomain}'.`);
    }

    if (this.#isUserStopActive) {
      let userStopActive: boolean;
      try {
        userStopActive = this.#isUserStopActive(policy.tenantId);
      } catch {
        throw new Error('USER_STOP_PROVIDER_UNAVAILABLE: activation fails closed.');
      }
      if (typeof userStopActive !== 'boolean') {
        throw new Error('USER_STOP_PROVIDER_INVALID: activation fails closed.');
      }
      if (userStopActive) {
        throw new Error(`USER_STOP_ACTIVE: policy activation halted for tenant '${policy.tenantId}'.`);
      }
    }

    this.assertValidTenantAndDomain(policy.tenantId, policy.policyDomain);

    const { token, record } = activationAuthorization;
    if (!token || !record) {
      throw new Error('UNAUTHORIZED_POLICY_ACTIVATION: both token and record are required.');
    }
    if (token.decision !== 'APPROVE' || record.decision !== 'APPROVE') {
      throw new Error('UNAUTHORIZED_POLICY_ACTIVATION: authorization decision must be APPROVE.');
    }
    if (
      token.policyDomain !== policy.policyDomain ||
      token.proposalId !== policy.metadata.proposalId ||
      record.tenantId !== policy.tenantId ||
      record.proposalId !== policy.metadata.proposalId
    ) {
      throw new Error('UNAUTHORIZED_POLICY_ACTIVATION: authorization bindings do not match candidate policy.');
    }

    if (policy.metadata.policyDeltaHash && token.policyDeltaHash !== policy.metadata.policyDeltaHash) {
      throw new Error('UNAUTHORIZED_POLICY_ACTIVATION: policyDeltaHash binding mismatch.');
    }

    // Cryptographic sole-human verification (HMAC, key, freshness, nonces, anti-agent, secondary-authority rejection)
    this.#tokenVerifier.verifyDecisionToken(token, record, policy.metadata.provenanceHash);

    // Canonical policy hash commitment check
    if (computeCanonicalPolicyHash(policy) !== policy.metadata.canonicalHash) {
      throw new Error('CANONICAL_POLICY_HASH_MISMATCH: computed policy hash does not match metadata.');
    }

    // Authoritative ratification record verification
    const domainDir = this.ensureDomainDirectory(policy.tenantId, policy.policyDomain);
    const ratificationsDir = path.join(domainDir, 'ratifications');
    const ratificationPath = path.join(ratificationsDir, `ratification_${policy.metadata.ratificationId}.json`);
    if (!fs.existsSync(ratificationPath)) {
      throw new Error(`UNAUTHORIZED_POLICY_ACTIVATION: missing ratification record '${policy.metadata.ratificationId}'.`);
    }
    try {
      const ratRecord: AuthoritativeRatificationRecord = JSON.parse(fs.readFileSync(ratificationPath, 'utf8'));
      if (
        ratRecord.ratificationId !== policy.metadata.ratificationId ||
        ratRecord.tenantId !== policy.tenantId ||
        ratRecord.policyDomain !== policy.policyDomain ||
        ratRecord.policyVersion !== policy.policyVersion ||
        ratRecord.proposalId !== policy.metadata.proposalId ||
        ratRecord.dossierProvenanceHash !== policy.metadata.provenanceHash ||
        ratRecord.status !== 'RATIFIED'
      ) {
        throw new Error('UNAUTHORIZED_POLICY_ACTIVATION: ratification record binding mismatch.');
      }
    } catch (e: any) {
      if (e.message && e.message.startsWith('UNAUTHORIZED_POLICY_ACTIVATION:')) throw e;
      throw new Error('UNAUTHORIZED_POLICY_ACTIVATION: malformed ratification record.');
    }

    // Version regression check
    const currentActive = this.getActivePolicy(policy.tenantId, policy.policyDomain);
    if (currentActive && policy.policyVersion <= currentActive.policyVersion) {
      throw new PolicyVersionOCCConflictError(
        `VERSION_REGRESSION_BLOCKED: Cannot activate version ${policy.policyVersion} when current active is ${currentActive.policyVersion}.`
      );
    }

    // Invoke runtime-private atomic activation
    this.#activateVerifiedPolicy(policy);
  }

  #activateVerifiedPolicy(policy: CanonicalStrategicPolicy): void {
    const domainDir = this.ensureDomainDirectory(policy.tenantId, policy.policyDomain);
    const activePath = path.join(domainDir, 'active_policy.json');
    const backupPath = path.join(domainDir, 'active_policy.json.bak');

    // Perform atomic 4-step write with backup creation
    this.atomicWriteJsonWithBackup(activePath, backupPath, policy);

    // Update in-memory cache
    const cacheKey = `${policy.tenantId}:${policy.policyDomain}`;
    this.inMemoryCache.set(cacheKey, policy);
  }

  /**
   * Get current active policy for a tenant and domain.
   */
  public getActivePolicy(tenantId: string, policyDomain: string): CanonicalStrategicPolicy | undefined {
    this.assertValidTenantAndDomain(tenantId, policyDomain);

    const cacheKey = `${tenantId}:${policyDomain}`;
    if (this.inMemoryCache.has(cacheKey)) {
      return this.inMemoryCache.get(cacheKey);
    }

    const domainDir = path.join(this.baseDir, tenantId, policyDomain);
    const activePath = path.join(domainDir, 'active_policy.json');

    if (fs.existsSync(activePath)) {
      try {
        const raw = fs.readFileSync(activePath, 'utf8');
        const policy: CanonicalStrategicPolicy = JSON.parse(raw);
        this.inMemoryCache.set(cacheKey, policy);
        return policy;
      } catch {
        // Attempt recovery from backup
        return this.recoverActiveFromBackup(tenantId, policyDomain);
      }
    }

    return undefined;
  }

  /**
   * Restore the immediate backup snapshot into active policy.
   * Khôi phục bản sao lưu tức thời thành active policy.
   */
  /**
   * The only restore-capable public API. It verifies sole-human rollback evidence
   * and emergency-stop state itself; the raw mutation primitive is runtime-private.
   */
  public restoreFromBackup(tenantId: string, policyDomain: string, rollbackAuthorization?: { token: HumanDecisionToken; record: HumanDecisionRecord }): CanonicalStrategicPolicy {
    this.assertValidTenantAndDomain(tenantId, policyDomain);
    if (!rollbackAuthorization || !this.#tokenVerifier) throw new Error('UNAUTHORIZED_ROLLBACK: cryptographic Human Authority evidence is required.');
    if (!this.#isEmergencyStopActive) throw new Error('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: rollback fails closed.');
    let emergencyStopActive: boolean;
    try { emergencyStopActive = this.#isEmergencyStopActive(policyDomain); }
    catch { throw new Error('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: rollback fails closed.'); }
    if (typeof emergencyStopActive !== 'boolean') throw new Error('EMERGENCY_STOP_PROVIDER_INVALID: rollback fails closed.');
    if (emergencyStopActive) throw new Error(`EMERGENCY_STOP_ACTIVE: rollback blocked for domain '${policyDomain}'.`);

    const currentActive = this.getActivePolicy(tenantId, policyDomain);
    if (!currentActive) throw new Error(`NO_ACTIVE_POLICY_TO_ROLLBACK: No active policy found for tenant '${tenantId}' domain '${policyDomain}'.`);
    const { token, record } = rollbackAuthorization;
    if (token.decision !== 'APPROVE' || token.proposalId !== currentActive.metadata.proposalId || token.policyDomain !== policyDomain || record.tenantId !== tenantId || record.proposalId !== currentActive.metadata.proposalId) {
      throw new Error('UNAUTHORIZED_ROLLBACK: authorization bindings do not match the active policy.');
    }
    this.#tokenVerifier.verifyDecisionToken(token, record, currentActive.metadata.provenanceHash);
    return this.#restoreVerifiedBackup(tenantId, policyDomain);
  }

  #restoreVerifiedBackup(tenantId: string, policyDomain: string): CanonicalStrategicPolicy {
    const domainDir = path.join(this.baseDir, tenantId, policyDomain);
    const activePath = path.join(domainDir, 'active_policy.json');
    const backupPath = path.join(domainDir, 'active_policy.json.bak');
    const backupIntegrityPath = `${backupPath}.sha256`;

    if (!fs.existsSync(backupPath)) {
      throw new Error(`NO_BACKUP_AVAILABLE: No backup snapshot found for tenant '${tenantId}' domain '${policyDomain}'.`);
    }

    if (!fs.existsSync(backupIntegrityPath)) throw new Error('BACKUP_INTEGRITY_EVIDENCE_MISSING');
    const backupRaw = fs.readFileSync(backupPath, 'utf8');
    const committedHash = fs.readFileSync(backupIntegrityPath, 'utf8').trim();
    const actualHash = createHash('sha256').update(backupRaw, 'utf8').digest('hex');
    if (!/^[a-f0-9]{64}$/i.test(committedHash) || committedHash !== actualHash) throw new Error('BACKUP_INTEGRITY_MISMATCH');
    let backupPolicy: CanonicalStrategicPolicy;
    try { backupPolicy = JSON.parse(backupRaw); } catch { throw new Error('BACKUP_MALFORMED'); }
    if (computeCanonicalPolicyHash(backupPolicy) !== backupPolicy.metadata.canonicalHash) throw new Error('BACKUP_POLICY_COMMITMENT_MISMATCH');

    // Atomically overwrite active with backup
    this.atomicWriteJson(activePath, backupPolicy);

    const cacheKey = `${tenantId}:${policyDomain}`;
    this.inMemoryCache.set(cacheKey, backupPolicy);

    return backupPolicy;
  }

  /**
   * Save a ratification record.
   */
  public saveRatificationRecord(record: AuthoritativeRatificationRecord): void {
    this.assertValidTenantAndDomain(record.tenantId, record.policyDomain);

    const domainDir = this.ensureDomainDirectory(record.tenantId, record.policyDomain);
    const ratDir = path.join(domainDir, 'ratifications');
    if (!fs.existsSync(ratDir)) {
      fs.mkdirSync(ratDir, { recursive: true });
    }

    const filePath = path.join(ratDir, `ratification_${record.ratificationId}.json`);
    this.atomicWriteJson(filePath, record);
  }

  /**
   * Save a deployment record.
   */
  public saveDeploymentRecord(record: PolicyDeploymentRecord): void {
    this.assertValidTenantAndDomain(record.tenantId, record.policyDomain);

    const domainDir = this.ensureDomainDirectory(record.tenantId, record.policyDomain);
    const depDir = path.join(domainDir, 'deployments');
    if (!fs.existsSync(depDir)) {
      fs.mkdirSync(depDir, { recursive: true });
    }

    const filePath = path.join(depDir, `deployment_${record.deploymentId}.json`);
    this.atomicWriteJson(filePath, record);
  }

  // --- Private Utilities ---

  private ensureDomainDirectory(tenantId: string, policyDomain: string): string {
    const dir = path.join(this.baseDir, tenantId, policyDomain);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private assertValidTenantAndDomain(tenantId: string, policyDomain: string): void {
    if (!tenantId || typeof tenantId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(tenantId)) {
      throw new PolicyTenantIsolationError(`INVALID_TENANT_ID: Invalid tenant '${tenantId}'.`);
    }

    if (!policyDomain || typeof policyDomain !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(policyDomain)) {
      throw new PolicyTenantIsolationError(`INVALID_POLICY_DOMAIN: Invalid domain '${policyDomain}'.`);
    }

    const upperTenant = tenantId.toUpperCase();
    const upperDomain = policyDomain.toUpperCase();
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3'];

    if (reserved.includes(upperTenant) || reserved.includes(upperDomain)) {
      throw new PolicyTenantIsolationError(`RESERVED_DEVICE_NAME_BLOCKED: Path contains reserved OS device name.`);
    }
  }

  private atomicWriteJson(targetPath: string, data: any): void {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const tmpPath = path.join(parentDir, `.tmp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.json`);
    const serialized = JSON.stringify(data, null, 2);

    // 1. Write tmp
    fs.writeFileSync(tmpPath, serialized, 'utf8');

    // 2. Readback checksum
    const readback = fs.readFileSync(tmpPath, 'utf8');
    const h1 = createHash('sha256').update(serialized).digest('hex');
    const h2 = createHash('sha256').update(readback).digest('hex');
    if (h1 !== h2) {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      throw new Error(`PERSISTENCE_CHECKSUM_MISMATCH: Readback check failed for '${targetPath}'.`);
    }

    // 3. Atomic rename
    fs.renameSync(tmpPath, targetPath);
  }

  private atomicWriteJsonWithBackup(targetPath: string, backupPath: string, data: any): void {
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Create backup if target exists
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, backupPath);
      const backupRaw = fs.readFileSync(backupPath, 'utf8');
      fs.writeFileSync(`${backupPath}.sha256`, createHash('sha256').update(backupRaw, 'utf8').digest('hex'), { encoding: 'utf8', mode: 0o600 });
    }

    // Write new target
    this.atomicWriteJson(targetPath, data);
  }

  private recoverActiveFromBackup(tenantId: string, policyDomain: string): CanonicalStrategicPolicy | undefined {
    const domainDir = path.join(this.baseDir, tenantId, policyDomain);
    const backupPath = path.join(domainDir, 'active_policy.json.bak');
    const backupIntegrityPath = `${backupPath}.sha256`;

    if (fs.existsSync(backupPath)) {
      try {
        if (!fs.existsSync(backupIntegrityPath)) return undefined;
        const raw = fs.readFileSync(backupPath, 'utf8');
        if (createHash('sha256').update(raw, 'utf8').digest('hex') !== fs.readFileSync(backupIntegrityPath, 'utf8').trim()) return undefined;
        const policy: CanonicalStrategicPolicy = JSON.parse(raw);
        if (computeCanonicalPolicyHash(policy) !== policy.metadata.canonicalHash) return undefined;
        // Recovery is deliberately read-only. Replacing active policy from a
        // backup is rollback mutation and must traverse restoreFromBackup().
        return policy;
      } catch {
        return undefined;
      }
    }
    return undefined;
  }

  private reconcileAllPartitions(): void {
    if (!fs.existsSync(this.baseDir)) return;

    try {
      const tenants = fs.readdirSync(this.baseDir);
      for (const tenant of tenants) {
        const tenantDir = path.join(this.baseDir, tenant);
        if (!fs.statSync(tenantDir).isDirectory()) continue;

        const domains = fs.readdirSync(tenantDir);
        for (const domain of domains) {
          const domainDir = path.join(tenantDir, domain);
          if (!fs.statSync(domainDir).isDirectory()) continue;

          // Remove orphan .tmp files
          const files = fs.readdirSync(domainDir);
          for (const f of files) {
            if (f.startsWith('.tmp_')) {
              try {
                fs.unlinkSync(path.join(domainDir, f));
              } catch {
                // Ignore unlink errors during cleanup
              }
            }
          }
        }
      }
    } catch {
      // Ignore during initial setup
    }
  }
}
