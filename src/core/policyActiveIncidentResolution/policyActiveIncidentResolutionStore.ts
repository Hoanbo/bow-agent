// src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionStore.ts
// BOWCON V4.0 — MS-1.3.75: GOVERNED ACTIVE POLICY INCIDENT RESOLUTION, CONTAINMENT CLEARANCE & RECOVERY AUTHORIZATION BOUNDARY
//
// Governed Active Incident Resolution Store (Component 850).
// Provides durable, crash-safe, tenant-partitioned persistence for incident resolution records.
// Enforces atomic file replacement, secret sanitization, terminal state immutability,
// and path traversal rejection via resolveUserPartition.
//
// Core Authority Invariants:
// - STORE_GRANTS_ZERO_AUTHORITY
// - USER_STOP > ALL_PERSISTENCE_OPERATIONS
// - INCIDENT_CLOSURE != INCIDENT_DELETION
// - ZERO DESTRUCTIVE DELETION
// - FAIL_CLOSED

import fs from 'node:fs';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type {
  ContainmentAssessmentRecord,
  ContainmentClearanceRecord,
  RecoveryAuthorizationRecord,
  IncidentRecoveryHandoffRecord,
  IncidentRecoveryVerificationRecord,
  IncidentResolutionRecord,
  IncidentClosureRecord,
  PolicyActiveIncidentResolutionOptions,
} from './policyActiveIncidentResolutionTypes.js';

export class PolicyActiveIncidentResolutionStore {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly sanitizer: DiagnosisSanitizer;

  // In-memory tenant caches:
  private readonly assessments: Map<string, Map<string, ContainmentAssessmentRecord>> = new Map();
  private readonly clearances: Map<string, Map<string, ContainmentClearanceRecord>> = new Map();
  private readonly authorizations: Map<string, Map<string, RecoveryAuthorizationRecord>> = new Map();
  private readonly handoffs: Map<string, Map<string, IncidentRecoveryHandoffRecord>> = new Map();
  private readonly verifications: Map<string, Map<string, IncidentRecoveryVerificationRecord>> = new Map();
  private readonly resolutions: Map<string, Map<string, IncidentResolutionRecord>> = new Map();
  private readonly closures: Map<string, Map<string, IncidentClosureRecord>> = new Map();

  constructor(options?: PolicyActiveIncidentResolutionOptions, sanitizer?: DiagnosisSanitizer) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.sanitizer = sanitizer ?? globalDiagnosisSanitizer;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Resolution store suspended by USER_STOP supremacy');
    }
  }

  private getTenantStorageDir(tenantPartition: string): string {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('STORE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    const resolved = resolveUserPartition(tenantPartition.trim(), this.baseDir);
    const targetDir = path.join(resolved.baseDir, resolved.partitionKey, 'policy_incident_resolution');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    return targetDir;
  }

  private loadTenantStateIfEmpty(tenantPartition: string): void {
    if (this.assessments.has(tenantPartition)) {
      return;
    }

    const assMap = new Map<string, ContainmentAssessmentRecord>();
    const clrMap = new Map<string, ContainmentClearanceRecord>();
    const authMap = new Map<string, RecoveryAuthorizationRecord>();
    const hndMap = new Map<string, IncidentRecoveryHandoffRecord>();
    const verMap = new Map<string, IncidentRecoveryVerificationRecord>();
    const resMap = new Map<string, IncidentResolutionRecord>();
    const clsMap = new Map<string, IncidentClosureRecord>();

    this.assessments.set(tenantPartition, assMap);
    this.clearances.set(tenantPartition, clrMap);
    this.authorizations.set(tenantPartition, authMap);
    this.handoffs.set(tenantPartition, hndMap);
    this.verifications.set(tenantPartition, verMap);
    this.resolutions.set(tenantPartition, resMap);
    this.closures.set(tenantPartition, clsMap);

    const dir = this.getTenantStorageDir(tenantPartition);

    this.loadFile(path.join(dir, 'containment_assessments.json'), assMap, 'assessmentId', tenantPartition);
    this.loadFile(path.join(dir, 'containment_clearances.json'), clrMap, 'clearanceId', tenantPartition);
    this.loadFile(path.join(dir, 'recovery_authorizations.json'), authMap, 'authorizationId', tenantPartition);
    this.loadFile(path.join(dir, 'recovery_handoffs.json'), hndMap, 'handoffId', tenantPartition);
    this.loadFile(path.join(dir, 'recovery_verifications.json'), verMap, 'verificationId', tenantPartition);
    this.loadFile(path.join(dir, 'incident_resolutions.json'), resMap, 'resolutionId', tenantPartition);
    this.loadFile(path.join(dir, 'incident_closures.json'), clsMap, 'closureId', tenantPartition);
  }

  private loadFile<T extends { tenantPartition: string }>(
    filePath: string,
    targetMap: Map<string, T>,
    idKey: keyof T,
    tenantPartition: string
  ): void {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed: T[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item && item[idKey] && item.tenantPartition === tenantPartition) {
              targetMap.set(item[idKey] as string, Object.freeze(item));
            }
          }
        }
      } catch (err: any) {
        throw new Error(`RESOLUTION_STORE_CORRUPTION: Failed to parse '${path.basename(filePath)}' for tenant '${tenantPartition}': ${err.message}`);
      }
    }
  }

  private persistList<T>(fileName: string, tenantPartition: string, items: readonly T[]): void {
    const dir = this.getTenantStorageDir(tenantPartition);
    const finalFile = path.join(dir, fileName);
    const tempFile = path.join(dir, `${fileName.replace('.json', '')}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.tmp`);

    const sanitized = this.sanitizer.sanitize(items);
    fs.writeFileSync(tempFile, JSON.stringify(sanitized, null, 2), 'utf8');
    fs.renameSync(tempFile, finalFile);
  }

  // --- Containment Assessments ---
  public saveAssessment(record: ContainmentAssessmentRecord): ContainmentAssessmentRecord {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(record.tenantPartition);
    const map = this.assessments.get(record.tenantPartition)!;
    const frozen = Object.freeze({ ...record });
    map.set(frozen.assessmentId, frozen);
    this.persistList('containment_assessments.json', record.tenantPartition, Array.from(map.values()));
    return frozen;
  }

  public getAssessment(tenantPartition: string, assessmentId: string): ContainmentAssessmentRecord | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);
    return this.assessments.get(tenantPartition)?.get(assessmentId) ?? null;
  }

  // --- Containment Clearances ---
  public saveClearance(record: ContainmentClearanceRecord): ContainmentClearanceRecord {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(record.tenantPartition);
    const map = this.clearances.get(record.tenantPartition)!;
    const frozen = Object.freeze({ ...record });
    map.set(frozen.clearanceId, frozen);
    this.persistList('containment_clearances.json', record.tenantPartition, Array.from(map.values()));
    return frozen;
  }

  public getClearance(tenantPartition: string, clearanceId: string): ContainmentClearanceRecord | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);
    return this.clearances.get(tenantPartition)?.get(clearanceId) ?? null;
  }

  // --- Recovery Authorizations ---
  public saveRecoveryAuthorization(record: RecoveryAuthorizationRecord): RecoveryAuthorizationRecord {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(record.tenantPartition);
    const map = this.authorizations.get(record.tenantPartition)!;
    const frozen = Object.freeze({ ...record });
    map.set(frozen.authorizationId, frozen);
    this.persistList('recovery_authorizations.json', record.tenantPartition, Array.from(map.values()));
    return frozen;
  }

  public getRecoveryAuthorization(tenantPartition: string, authorizationId: string): RecoveryAuthorizationRecord | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);
    return this.authorizations.get(tenantPartition)?.get(authorizationId) ?? null;
  }

  // --- Recovery Handoffs ---
  public saveRecoveryHandoff(record: IncidentRecoveryHandoffRecord): IncidentRecoveryHandoffRecord {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(record.tenantPartition);
    const map = this.handoffs.get(record.tenantPartition)!;
    const frozen = Object.freeze({ ...record });
    map.set(frozen.handoffId, frozen);
    this.persistList('recovery_handoffs.json', record.tenantPartition, Array.from(map.values()));
    return frozen;
  }

  public getRecoveryHandoff(tenantPartition: string, handoffId: string): IncidentRecoveryHandoffRecord | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);
    return this.handoffs.get(tenantPartition)?.get(handoffId) ?? null;
  }

  // --- Recovery Verifications ---
  public saveRecoveryVerification(record: IncidentRecoveryVerificationRecord): IncidentRecoveryVerificationRecord {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(record.tenantPartition);
    const map = this.verifications.get(record.tenantPartition)!;
    const frozen = Object.freeze({ ...record });
    map.set(frozen.verificationId, frozen);
    this.persistList('recovery_verifications.json', record.tenantPartition, Array.from(map.values()));
    return frozen;
  }

  public getRecoveryVerification(tenantPartition: string, verificationId: string): IncidentRecoveryVerificationRecord | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);
    return this.verifications.get(tenantPartition)?.get(verificationId) ?? null;
  }

  // --- Incident Resolutions ---
  public saveResolution(record: IncidentResolutionRecord): IncidentResolutionRecord {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(record.tenantPartition);
    const map = this.resolutions.get(record.tenantPartition)!;

    const existing = map.get(record.resolutionId);
    if (existing && existing.status === 'CONFIRMED' && record.status !== 'CONFIRMED') {
      throw new Error(`CONFLICTING_TERMINAL_REWRITE: Confirmed resolution '${record.resolutionId}' cannot be modified or downgraded.`);
    }

    const frozen = Object.freeze({ ...record });
    map.set(frozen.resolutionId, frozen);
    this.persistList('incident_resolutions.json', record.tenantPartition, Array.from(map.values()));
    return frozen;
  }

  public getResolution(tenantPartition: string, resolutionId: string): IncidentResolutionRecord | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);
    return this.resolutions.get(tenantPartition)?.get(resolutionId) ?? null;
  }

  // --- Incident Closures ---
  public saveClosure(record: IncidentClosureRecord): IncidentClosureRecord {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(record.tenantPartition);
    const map = this.closures.get(record.tenantPartition)!;

    const existing = map.get(record.closureId);
    if (existing) {
      throw new Error(`CONFLICTING_TERMINAL_REWRITE: Terminal incident closure '${record.closureId}' cannot be overwritten.`);
    }

    const frozen = Object.freeze({ ...record });
    map.set(frozen.closureId, frozen);
    this.persistList('incident_closures.json', record.tenantPartition, Array.from(map.values()));
    return frozen;
  }

  public getClosure(tenantPartition: string, closureId: string): IncidentClosureRecord | null {
    this.assertUserStopInactive();
    this.loadTenantStateIfEmpty(tenantPartition);
    return this.closures.get(tenantPartition)?.get(closureId) ?? null;
  }
}
