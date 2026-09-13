// src/core/policyActiveRollback/policyActiveRollbackStore.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Active Rollback Store (Component 814).
// Provides durable, tenant-isolated, crash-safe persistence for:
// 1. Historically verified policies (HistoricalPolicyVersion)
// 2. Governed Rollback Requests (RollbackRequest)
// 3. Governed Sunset Requests & Records (SunsetRequest)
// 4. Governed Recovery Requests & Records (RecoveryRequest)
//
// Guarantees:
// 1. Strict tenant partition isolation via resolveUserPartition
// 2. Anti-duplicate idempotency and conflicting overwrite protection
// 3. Atomic durable file replacement (temp file write + rename)
// 4. Secret sanitization via DiagnosisSanitizer
// 5. Fail-closed storage corruption handling (ROLLBACK_STORE_CORRUPTION)
// 6. USER_STOP supremacy over all persistence operations
//
// Authority Invariants:
// - STORE_GRANTS_ZERO_AUTHORITY: Storage holds audit/governance records only
// - HISTORICAL_RECORDS_ARE_IMMUTABLE: Historical versions cannot be deleted or rewritten
// - USER_STOP > ALL_PERSISTENCE_OPERATIONS

import fs from 'node:fs';
import path from 'node:path';
import type {
  HistoricalPolicyVersion,
  RollbackRequest,
  SunsetRequest,
  RecoveryRequest,
  PolicyActiveRollbackOptions,
} from './policyActiveRollbackTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export class PolicyActiveRollbackStore {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly sanitizer: DiagnosisSanitizer;

  // In-memory tenant caches:
  // tenantPartition -> targetId -> HistoricalPolicyVersion
  private readonly historicalPolicies: Map<string, Map<string, HistoricalPolicyVersion>> = new Map();
  // tenantPartition -> version -> targetId
  private readonly versionLookup: Map<string, Map<string, string>> = new Map();
  // tenantPartition -> rollbackRequestId -> RollbackRequest
  private readonly rollbackRequests: Map<string, Map<string, RollbackRequest>> = new Map();
  // tenantPartition -> sunsetRequestId -> SunsetRequest
  private readonly sunsetRequests: Map<string, Map<string, SunsetRequest>> = new Map();
  // tenantPartition -> recoveryRequestId -> RecoveryRequest
  private readonly recoveryRequests: Map<string, Map<string, RecoveryRequest>> = new Map();

  constructor(options?: PolicyActiveRollbackOptions, sanitizer?: DiagnosisSanitizer) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Rollback store suspended by USER_STOP supremacy');
    }
  }

  private getTenantStorageDir(tenantPartition: string, subDir: string): string {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('STORE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
    const targetDir = path.join(resolved.baseDir, resolved.partitionKey, subDir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  private loadTenantStateIfEmpty(tenantPartition: string): void {
    if (this.historicalPolicies.has(tenantPartition)) {
      return;
    }

    const histMap = new Map<string, HistoricalPolicyVersion>();
    const verLookup = new Map<string, string>();
    const rolMap = new Map<string, RollbackRequest>();
    const sunMap = new Map<string, SunsetRequest>();
    const recMap = new Map<string, RecoveryRequest>();

    this.historicalPolicies.set(tenantPartition, histMap);
    this.versionLookup.set(tenantPartition, verLookup);
    this.rollbackRequests.set(tenantPartition, rolMap);
    this.sunsetRequests.set(tenantPartition, sunMap);
    this.recoveryRequests.set(tenantPartition, recMap);

    // 1. Load historical policies
    const histDir = this.getTenantStorageDir(tenantPartition, 'historical_policies');
    const histFile = path.join(histDir, 'historical_policies.json');
    if (fs.existsSync(histFile)) {
      try {
        const raw = fs.readFileSync(histFile, 'utf8');
        const parsed: HistoricalPolicyVersion[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const hp of parsed) {
            if (hp && hp.targetId && hp.tenantPartition === tenantPartition) {
              histMap.set(hp.targetId, Object.freeze(hp));
              verLookup.set(hp.policyVersion, hp.targetId);
            }
          }
        }
      } catch (err: any) {
        throw new Error(`ROLLBACK_STORE_CORRUPTION: Failed to parse historical policies for tenant '${tenantPartition}': ${err.message}`);
      }
    }

    // 2. Load rollback requests
    const rolDir = this.getTenantStorageDir(tenantPartition, 'rollback_requests');
    const rolFile = path.join(rolDir, 'rollback_requests.json');
    if (fs.existsSync(rolFile)) {
      try {
        const raw = fs.readFileSync(rolFile, 'utf8');
        const parsed: RollbackRequest[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const req of parsed) {
            if (req && req.rollbackRequestId && req.tenantPartition === tenantPartition) {
              rolMap.set(req.rollbackRequestId, Object.freeze(req));
            }
          }
        }
      } catch (err: any) {
        throw new Error(`ROLLBACK_STORE_CORRUPTION: Failed to parse rollback requests for tenant '${tenantPartition}': ${err.message}`);
      }
    }

    // 3. Load sunset requests
    const sunDir = this.getTenantStorageDir(tenantPartition, 'sunset_records');
    const sunFile = path.join(sunDir, 'sunset_records.json');
    if (fs.existsSync(sunFile)) {
      try {
        const raw = fs.readFileSync(sunFile, 'utf8');
        const parsed: SunsetRequest[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const req of parsed) {
            if (req && req.sunsetRequestId && req.tenantPartition === tenantPartition) {
              sunMap.set(req.sunsetRequestId, Object.freeze(req));
            }
          }
        }
      } catch (err: any) {
        throw new Error(`ROLLBACK_STORE_CORRUPTION: Failed to parse sunset requests for tenant '${tenantPartition}': ${err.message}`);
      }
    }

    // 4. Load recovery requests
    const recDir = this.getTenantStorageDir(tenantPartition, 'recovery_records');
    const recFile = path.join(recDir, 'recovery_records.json');
    if (fs.existsSync(recFile)) {
      try {
        const raw = fs.readFileSync(recFile, 'utf8');
        const parsed: RecoveryRequest[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const req of parsed) {
            if (req && req.recoveryRequestId && req.tenantPartition === tenantPartition) {
              recMap.set(req.recoveryRequestId, Object.freeze(req));
            }
          }
        }
      } catch (err: any) {
        throw new Error(`ROLLBACK_STORE_CORRUPTION: Failed to parse recovery requests for tenant '${tenantPartition}': ${err.message}`);
      }
    }
  }

  private persistHistoricalPolicies(tenantPartition: string): void {
    const histDir = this.getTenantStorageDir(tenantPartition, 'historical_policies');
    const histFile = path.join(histDir, 'historical_policies.json');
    const tempFile = path.join(histDir, `hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);

    const list = Array.from(this.historicalPolicies.get(tenantPartition)?.values() ?? []);
    const sanitized = this.sanitizer.sanitize(list);

    fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
    fs.renameSync(tempFile, histFile);
  }

  private persistRollbackRequests(tenantPartition: string): void {
    const rolDir = this.getTenantStorageDir(tenantPartition, 'rollback_requests');
    const rolFile = path.join(rolDir, 'rollback_requests.json');
    const tempFile = path.join(rolDir, `rol_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);

    const list = Array.from(this.rollbackRequests.get(tenantPartition)?.values() ?? []);
    const sanitized = this.sanitizer.sanitize(list);

    fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
    fs.renameSync(tempFile, rolFile);
  }

  private persistSunsetRequests(tenantPartition: string): void {
    const sunDir = this.getTenantStorageDir(tenantPartition, 'sunset_records');
    const sunFile = path.join(sunDir, 'sunset_records.json');
    const tempFile = path.join(sunDir, `sun_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);

    const list = Array.from(this.sunsetRequests.get(tenantPartition)?.values() ?? []);
    const sanitized = this.sanitizer.sanitize(list);

    fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
    fs.renameSync(tempFile, sunFile);
  }

  private persistRecoveryRequests(tenantPartition: string): void {
    const recDir = this.getTenantStorageDir(tenantPartition, 'recovery_records');
    const recFile = path.join(recDir, 'recovery_records.json');
    const tempFile = path.join(recDir, `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);

    const list = Array.from(this.recoveryRequests.get(tenantPartition)?.values() ?? []);
    const sanitized = this.sanitizer.sanitize(list);

    fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
    fs.renameSync(tempFile, recFile);
  }

  // ============================================================================
  // PUBLIC MUTATION & RETRIEVAL METHODS
  // ============================================================================

  /**
   * Records a historical verified policy version. Immutable once written.
   */
  public saveHistoricalPolicy(policy: HistoricalPolicyVersion): HistoricalPolicyVersion {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(policy.tenantPartition);

    const histMap = this.historicalPolicies.get(policy.tenantPartition)!;
    const verLookup = this.versionLookup.get(policy.tenantPartition)!;

    const existing = histMap.get(policy.targetId);
    if (existing) {
      return existing; // Idempotent return of immutable historical record
    }

    const frozen = Object.freeze({ ...policy, isActivePolicy: false as const });
    histMap.set(frozen.targetId, frozen);
    verLookup.set(frozen.policyVersion, frozen.targetId);

    this.persistHistoricalPolicies(policy.tenantPartition);
    return frozen;
  }

  /**
   * Retrieves a historical policy by targetId.
   */
  public getHistoricalPolicyById(tenantPartition: string, targetId: string): HistoricalPolicyVersion | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    return this.historicalPolicies.get(tenantPartition)?.get(targetId) ?? null;
  }

  /**
   * Retrieves a historical policy by version.
   */
  public getHistoricalPolicyByVersion(tenantPartition: string, version: string): HistoricalPolicyVersion | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    const targetId = this.versionLookup.get(tenantPartition)?.get(version);
    if (!targetId) return null;

    return this.historicalPolicies.get(tenantPartition)?.get(targetId) ?? null;
  }

  /**
   * Lists all historical policies for a tenant.
   */
  public listHistoricalPolicies(tenantPartition: string): readonly HistoricalPolicyVersion[] {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    const list = Array.from(this.historicalPolicies.get(tenantPartition)?.values() ?? []);
    return Object.freeze(list);
  }

  /**
   * Saves or updates a rollback request.
   */
  public saveRollbackRequest(request: RollbackRequest): RollbackRequest {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(request.tenantPartition);

    const rolMap = this.rollbackRequests.get(request.tenantPartition)!;
    const frozen = Object.freeze({ ...request });
    rolMap.set(frozen.rollbackRequestId, frozen);

    this.persistRollbackRequests(request.tenantPartition);
    return frozen;
  }

  /**
   * Retrieves a rollback request by ID.
   */
  public getRollbackRequest(tenantPartition: string, rollbackRequestId: string): RollbackRequest | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    return this.rollbackRequests.get(tenantPartition)?.get(rollbackRequestId) ?? null;
  }

  /**
   * Saves or updates a sunset request.
   */
  public saveSunsetRequest(request: SunsetRequest): SunsetRequest {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(request.tenantPartition);

    const sunMap = this.sunsetRequests.get(request.tenantPartition)!;
    const frozen = Object.freeze({ ...request });
    sunMap.set(frozen.sunsetRequestId, frozen);

    this.persistSunsetRequests(request.tenantPartition);
    return frozen;
  }

  /**
   * Retrieves a sunset request by ID.
   */
  public getSunsetRequest(tenantPartition: string, sunsetRequestId: string): SunsetRequest | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    return this.sunsetRequests.get(tenantPartition)?.get(sunsetRequestId) ?? null;
  }

  /**
   * Saves or updates a recovery request.
   */
  public saveRecoveryRequest(request: RecoveryRequest): RecoveryRequest {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(request.tenantPartition);

    const recMap = this.recoveryRequests.get(request.tenantPartition)!;
    const frozen = Object.freeze({ ...request });
    recMap.set(frozen.recoveryRequestId, frozen);

    this.persistRecoveryRequests(request.tenantPartition);
    return frozen;
  }

  /**
   * Retrieves a recovery request by ID.
   */
  public getRecoveryRequest(tenantPartition: string, recoveryRequestId: string): RecoveryRequest | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    return this.recoveryRequests.get(tenantPartition)?.get(recoveryRequestId) ?? null;
  }

  /**
   * Lists all rollback requests for a tenant.
   */
  public listRollbackRequests(tenantPartition: string): readonly RollbackRequest[] {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    return Object.freeze(Array.from(this.rollbackRequests.get(tenantPartition)?.values() ?? []));
  }

  public getRollbackRequests(tenantPartition: string): readonly RollbackRequest[] {
    return this.listRollbackRequests(tenantPartition);
  }

  /**
   * Lists all sunset requests for a tenant.
   */
  public listSunsetRequests(tenantPartition: string): readonly SunsetRequest[] {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    return Object.freeze(Array.from(this.sunsetRequests.get(tenantPartition)?.values() ?? []));
  }

  public getSunsetRequests(tenantPartition: string): readonly SunsetRequest[] {
    return this.listSunsetRequests(tenantPartition);
  }

  /**
   * Lists all recovery requests for a tenant.
   */
  public listRecoveryRequests(tenantPartition: string): readonly RecoveryRequest[] {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);

    return Object.freeze(Array.from(this.recoveryRequests.get(tenantPartition)?.values() ?? []));
  }

  public getRecoveryRequests(tenantPartition: string): readonly RecoveryRequest[] {
    return this.listRecoveryRequests(tenantPartition);
  }
}
