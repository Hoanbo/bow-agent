// src/core/multiAgentFederation/federationContinuityPersistenceBridge.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1116 — REAL
//
// EN: Multi-tenant crash-safe partitioned persistence, OCC CAS, continuity snapshots,
//     and cryptographic hash-chained audit bridge for multi-agent federation.
// VI: Lưu trữ phân vùng an toàn khi sự cố đa bên thuê, OCC CAS, ảnh chụp liên tục,
//     và cầu nối kiểm toán chuỗi băm mật mã cho liên đoàn đa tác tử.

import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  GovernedFederationGroup,
  FederationContinuitySnapshot,
  MultiAgentFederationPersistenceError,
  MultiAgentFederationConcurrencyError,
  MultiAgentFederationContinuityError,
  computeSha256,
  computeFederationSnapshotHash,
  computeFederationAuditHash,
  deterministicJsonStringify,
} from './multiAgentFederationTypes.js';
import { FederationSecurityBoundary } from './federationSecurityBoundary.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';

export type FederationAuditEventType =
  | 'AGENT_REGISTERED'
  | 'AGENT_AUTHORIZATION_VERIFIED'
  | 'AGENT_CAPABILITY_BOUND'
  | 'AGENT_SUSPENDED'
  | 'AGENT_REVOKED'
  | 'FEDERATION_CREATED'
  | 'FEDERATION_AUTHORIZED'
  | 'FEDERATION_READY'
  | 'AGENT_JOINED_FEDERATION'
  | 'AGENT_LEFT_FEDERATION'
  | 'LEADER_ASSIGNED'
  | 'DELEGATION_CREATED'
  | 'DELEGATION_AUTHORIZED'
  | 'DELEGATION_REJECTED'
  | 'DELEGATION_COMPLETED'
  | 'DELEGATION_FAILED'
  | 'DELEGATION_BLOCKED'
  | 'DELEGATION_CONFLICT_DETECTED'
  | 'DELEGATION_CONFLICT_RESOLVED'
  | 'TRUST_RECALCULATED'
  | 'FEDERATION_REASSESSED'
  | 'FEDERATION_SUSPENDED'
  | 'FEDERATION_REVIEW_REQUIRED'
  | 'FEDERATION_RESUMED'
  | 'FEDERATION_USER_STOP'
  | 'FEDERATION_EMERGENCY_STOP'
  | 'FEDERATION_INVALIDATED'
  | 'FEDERATION_PERSISTED'
  | 'FEDERATION_RECOVERED';

export interface FederationAuditRecord {
  readonly recordId: string;
  readonly eventType: FederationAuditEventType;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly federationId?: string;
  readonly agentId?: string;
  readonly delegationId?: string;
  readonly generation: number;
  readonly timestamp: number;
  readonly payload: Record<string, unknown>;
  readonly previousHash: string;
  readonly currentHash: string;
}

const DEFAULT_BASE_DIR = 'data/partitions_multi_agent_federation';

export class FederationContinuityPersistenceBridge {
  private readonly baseDirectory: string;
  private readonly securityBoundary: FederationSecurityBoundary;
  private readonly auditLog: FederationAuditRecord[] = [];
  private readonly snapshots: FederationContinuitySnapshot[] = [];
  private lastAuditHash = 'GENESIS_FEDERATION_AUDIT_HASH';
  private lastSnapshotHash = 'GENESIS_FEDERATION_SNAPSHOT_HASH';

  constructor(options?: {
    readonly baseDirectory?: string;
    readonly securityBoundary?: FederationSecurityBoundary;
  }) {
    this.baseDirectory = options?.baseDirectory ?? DEFAULT_BASE_DIR;
    this.securityBoundary = options?.securityBoundary ?? new FederationSecurityBoundary();
  }

  public getAuditLog(): readonly FederationAuditRecord[] {
    return [...this.auditLog];
  }

  public getLastAuditHash(): string {
    return this.lastAuditHash;
  }

  public getSnapshots(): readonly FederationContinuitySnapshot[] {
    return [...this.snapshots];
  }

  public getLastSnapshotHash(): string {
    return this.lastSnapshotHash;
  }

  /**
   * EN: Emits and cryptographically chains a sanitized federation audit record.
   * VI: Phát ra và liên kết chuỗi mật mã một bản ghi kiểm toán liên đoàn đã khử độc.
   */
  public emitAudit(
    eventType: FederationAuditEventType,
    tenantId: string,
    sessionId: string,
    generation: number,
    payload: Record<string, unknown>,
    ids?: { federationId?: string; agentId?: string; delegationId?: string }
  ): FederationAuditRecord {
    this.securityBoundary.assertStopInactive('POST_PERSISTENCE', tenantId, ids?.federationId);

    let sanitizedPayload: Record<string, unknown> = {};
    try {
      if (globalDiagnosisSanitizer && typeof globalDiagnosisSanitizer.sanitize === 'function') {
        sanitizedPayload = globalDiagnosisSanitizer.sanitize(payload) as Record<string, unknown>;
      } else {
        sanitizedPayload = JSON.parse(JSON.stringify(payload));
      }
    } catch {
      sanitizedPayload = { note: 'Sanitization fallback triggered' };
    }

    const timestamp = Date.now();
    const currentHash = computeFederationAuditHash(
      this.lastAuditHash,
      eventType,
      tenantId,
      timestamp,
      sanitizedPayload
    );

    const record: FederationAuditRecord = {
      recordId: `aud_${randomUUID()}`,
      eventType,
      tenantId,
      sessionId,
      federationId: ids?.federationId,
      agentId: ids?.agentId,
      delegationId: ids?.delegationId,
      generation,
      timestamp,
      payload: sanitizedPayload,
      previousHash: this.lastAuditHash,
      currentHash,
    };

    this.auditLog.push(record);
    this.lastAuditHash = currentHash;
    return record;
  }

  /**
   * EN: Seals and records a federation continuity snapshot with drift detection.
   * VI: Niêm phong và ghi lại ảnh chụp liên tục của liên đoàn với tính năng phát hiện trôi dạt.
   */
  public recordSnapshot(
    params: Omit<FederationContinuitySnapshot, 'currentSnapshotHash' | 'previousSnapshotHash' | 'snapshotId' | 'timestamp'>
  ): FederationContinuitySnapshot {
    this.securityBoundary.assertStopInactive('PRE_CONTINUITY_COMMIT', params.tenantId, params.federationId);

    const snapBase = {
      snapshotId: `snap_${randomUUID()}`,
      federationId: params.federationId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      coordinationCycle: params.coordinationCycle,
      federationStatus: params.federationStatus,
      participatingAgentIds: params.participatingAgentIds,
      leaderAgentId: params.leaderAgentId,
      delegationIds: params.delegationIds,
      activeConflicts: params.activeConflicts,
      generation: params.generation,
      environmentalFingerprint: params.environmentalFingerprint,
      previousSnapshotHash: this.lastSnapshotHash,
      timestamp: Date.now(),
    };

    const currentSnapshotHash = computeFederationSnapshotHash(snapBase);
    const snapshot: FederationContinuitySnapshot = {
      ...snapBase,
      currentSnapshotHash,
    };

    this.snapshots.push(snapshot);
    this.lastSnapshotHash = currentSnapshotHash;
    return snapshot;
  }

  /**
   * EN: Persists a federation group crash-safely using atomic write (.tmp -> checksum -> .bak -> rename).
   * VI: Lưu trữ một nhóm liên đoàn an toàn khi sự cố bằng cách ghi nguyên tử (.tmp -> checksum -> .bak -> rename).
   */
  public saveFederation(federation: GovernedFederationGroup, expectedVersion?: number): void {
    this.securityBoundary.assertStopInactive('PRE_PERSISTENCE', federation.tenantId, federation.federationId);

    const dirPath = path.join(this.baseDirectory, federation.tenantId, 'federations', federation.federationId);
    fs.mkdirSync(dirPath, { recursive: true });

    const canonicalPath = path.join(dirPath, 'federation.json');
    const backupPath = path.join(dirPath, 'federation.json.bak');
    const tmpPath = path.join(dirPath, `federation.json.tmp.${randomUUID()}`);

    // OCC CAS check if expectedVersion specified
    if (expectedVersion !== undefined && fs.existsSync(canonicalPath)) {
      try {
        const currentData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
        if (currentData.generation !== expectedVersion) {
          throw new MultiAgentFederationConcurrencyError(
            `OCC version mismatch: expected ${expectedVersion}, got ${currentData.generation}`,
            federation.tenantId,
            federation.federationId
          );
        }
      } catch (err: unknown) {
        if (err instanceof MultiAgentFederationConcurrencyError) {
          throw err;
        }
      }
    }

    const jsonContent = deterministicJsonStringify(federation);
    const checksum = computeSha256(jsonContent);

    // 1. Write tmp
    fs.writeFileSync(tmpPath, jsonContent, 'utf8');

    // 2. Validate checksum
    const readTmp = fs.readFileSync(tmpPath, 'utf8');
    if (computeSha256(readTmp) !== checksum) {
      fs.unlinkSync(tmpPath);
      throw new MultiAgentFederationPersistenceError('Tmp file checksum verification failed');
    }

    // 3. Backup existing canonical
    if (fs.existsSync(canonicalPath)) {
      try {
        fs.copyFileSync(canonicalPath, backupPath);
      } catch {
        // Continue if backup copy fails
      }
    }

    // 4. Atomic rename
    fs.renameSync(tmpPath, canonicalPath);

    this.emitAudit('FEDERATION_PERSISTED', federation.tenantId, federation.sessionId, federation.generation, {
      federationId: federation.federationId,
      status: federation.status,
    }, { federationId: federation.federationId });
  }

  /**
   * EN: Loads a federation group with automatic corruption detection and backup recovery.
   * VI: Tải một nhóm liên đoàn với tính năng tự động phát hiện hư hỏng và phục hồi sao lưu.
   */
  public loadFederation(tenantId: string, federationId: string): GovernedFederationGroup | null {
    const dirPath = path.join(this.baseDirectory, tenantId, 'federations', federationId);
    const canonicalPath = path.join(dirPath, 'federation.json');
    const backupPath = path.join(dirPath, 'federation.json.bak');

    if (!fs.existsSync(canonicalPath)) {
      if (fs.existsSync(backupPath)) {
        return this.recoverFromBackup(tenantId, federationId, backupPath, canonicalPath);
      }
      return null;
    }

    try {
      const content = fs.readFileSync(canonicalPath, 'utf8');
      const parsed = JSON.parse(content) as GovernedFederationGroup;
      return parsed;
    } catch {
      // Canonical is corrupted, attempt backup recovery
      return this.recoverFromBackup(tenantId, federationId, backupPath, canonicalPath);
    }
  }

  private recoverFromBackup(
    tenantId: string,
    federationId: string,
    backupPath: string,
    canonicalPath: string
  ): GovernedFederationGroup {
    if (!fs.existsSync(backupPath)) {
      throw new MultiAgentFederationPersistenceError(
        'Both canonical and backup state are corrupted or missing — fail closed',
        tenantId,
        federationId
      );
    }

    try {
      const backupContent = fs.readFileSync(backupPath, 'utf8');
      const recovered = JSON.parse(backupContent) as GovernedFederationGroup;
      fs.copyFileSync(backupPath, canonicalPath);

      this.emitAudit('FEDERATION_RECOVERED', tenantId, recovered.sessionId, recovered.generation, {
        federationId,
        reason: 'Canonical state restored from backup',
      }, { federationId });

      return recovered;
    } catch {
      throw new MultiAgentFederationPersistenceError(
        'Both canonical and backup state are corrupted — double corruption fail-closed',
        tenantId,
        federationId
      );
    }
  }
}
