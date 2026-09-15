// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1166: StrategicPolicyDeliberationContinuityPersistenceBridge
// Crash-Safe Partitioned Storage, Multi-Tenant Isolation, OCC/CAS & Audit Chaining
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  PolicyEvolutionProposal,
  StrategicPolicyDeliberationDossier,
  StrategicPolicyAuditEvent,
  StrategicPolicyAuditEventType,
  MAX_AUDIT_LOG_RECORDS_PER_SESSION,
  StrategicPolicyPersistenceError,
  StrategicPolicyEvolutionOCCConflictError,
  TenantIsolationViolationError,
  computeStrategicPolicyAuditHash,
} from './GovernedStrategicPolicyEvolutionTypes';

// Windows reserved filenames that must be rejected to prevent OS-level injection or file corruption
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
]);

export interface PersistenceResult {
  targetPath: string;
  checksum: string;
  version: number;
}

export class StrategicPolicyDeliberationContinuityPersistenceBridge {
  private readonly baseDirectory: string;
  private readonly auditChains = new Map<string, StrategicPolicyAuditEvent[]>(); // sessionId -> events

  constructor(customBaseDir?: string) {
    this.baseDirectory = customBaseDir || path.join(process.cwd(), 'data', 'partitions_governed_policy_deliberation');
  }

  // EN: Validate identifier for safe path usage, preventing directory traversal and Windows reserved names.
  // VI: Xác thực mã định danh để dùng đường dẫn an toàn, ngăn chặn tấn công duyệt thư mục và tên cấm của Windows.
  public validateIdentifier(id: string, label = 'Identifier'): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new TenantIsolationViolationError(`${label} cannot be empty.`);
    }

    // Reject directory traversal, slashes, or null bytes
    if (id.includes('..') || id.includes('/') || id.includes('\\') || id.includes('\0')) {
      throw new TenantIsolationViolationError(
        `Path traversal or illegal character detected in ${label}: '${id}'`
      );
    }

    // Reject colons in TenantId (directory paths on Windows cannot have colons)
    if (label === 'TenantId' && id.includes(':')) {
      throw new TenantIsolationViolationError(
        `Path traversal or illegal character detected in ${label}: '${id}'`
      );
    }

    // Reject Windows reserved filenames
    const upper = id.toUpperCase().split('.')[0];
    if (WINDOWS_RESERVED_NAMES.has(upper)) {
      throw new TenantIsolationViolationError(
        `Windows reserved name detected in ${label}: '${id}'`
      );
    }

    // Only allow alphanumeric, hyphens, underscores, and colons
    if (!/^[a-zA-Z0-9_\-:]+$/.test(id)) {
      throw new TenantIsolationViolationError(
        `Invalid character set in ${label}: '${id}'. Allowed: alphanumeric, underscore, hyphen, colon.`
      );
    }
  }

  private toSafeFilename(id: string): string {
    return `${id.replace(/:/g, '_')}.json`;
  }

  // EN: Computes deterministic SHA-256 checksum for UTF-8 string content.
  // VI: Tính toán giá trị băm SHA-256 xác định cho chuỗi UTF-8.
  private computeChecksum(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  // EN: Persists a PolicyEvolutionProposal atomically with strict OCC/CAS version checking.
  // VI: Lưu bền vững PolicyEvolutionProposal một cách nguyên tử với kiểm tra phiên bản OCC/CAS nghiêm ngặt.
  public persistProposalAtomically(
    tenantId: string,
    proposal: PolicyEvolutionProposal,
    expectedVersion: number
  ): PersistenceResult {
    this.validateIdentifier(tenantId, 'TenantId');
    this.validateIdentifier(proposal.proposalId, 'ProposalId');

    // Tenant boundary check
    if (proposal.tenantId !== tenantId) {
      throw new TenantIsolationViolationError(
        `Tenant mismatch: proposal belongs to tenant '${proposal.tenantId}', attempted persistence under '${tenantId}'`
      );
    }

    const tenantDir = path.join(this.baseDirectory, tenantId, 'proposals');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const targetPath = path.join(tenantDir, this.toSafeFilename(proposal.proposalId));

    // OCC / CAS verification against existing file on disk
    if (fs.existsSync(targetPath)) {
      try {
        const rawExisting = fs.readFileSync(targetPath, 'utf8');
        const existingData = JSON.parse(rawExisting);
        if (existingData.version !== undefined && existingData.version !== expectedVersion) {
          throw new StrategicPolicyEvolutionOCCConflictError(
            `OCC version conflict for proposal '${proposal.proposalId}': expected version ${expectedVersion}, found ${existingData.version}`
          );
        }
      } catch (err: unknown) {
        if (err instanceof StrategicPolicyEvolutionOCCConflictError) {
          throw err;
        }
        // If file was unreadable, allow crash-safe overwrite
      }
    }

    const nextVersion = expectedVersion + 1;
    const toPersist: PolicyEvolutionProposal = {
      ...proposal,
      version: nextVersion,
      updatedAt: Date.now(),
    };

    const serialized = JSON.stringify(toPersist, null, 2);
    const checksum = this.computeChecksum(serialized);

    // Step 1: Write to temporary file in same partition directory
    const tempPath = path.join(tenantDir, `.tmp.${crypto.randomUUID()}`);
    fs.writeFileSync(tempPath, serialized, 'utf8');

    // Step 2: Readback and verify checksum
    const readback = fs.readFileSync(tempPath, 'utf8');
    const readbackChecksum = this.computeChecksum(readback);
    if (readbackChecksum !== checksum) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw new StrategicPolicyPersistenceError(
        `Readback checksum mismatch for proposal '${proposal.proposalId}': expected ${checksum}, got ${readbackChecksum}`
      );
    }

    // Step 3: Create backup of previous file if present
    const bakPath = `${targetPath}.bak`;
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, bakPath);
    }

    // Step 4: Atomic rename to final canonical location
    fs.renameSync(tempPath, targetPath);

    return {
      targetPath,
      checksum,
      version: nextVersion,
    };
  }

  // EN: Loads a PolicyEvolutionProposal from the tenant's partition.
  // VI: Tải PolicyEvolutionProposal từ phân vùng của tenant.
  public loadProposal(tenantId: string, proposalId: string): PolicyEvolutionProposal | null {
    this.validateIdentifier(tenantId, 'TenantId');
    this.validateIdentifier(proposalId, 'ProposalId');

    const filePath = path.join(this.baseDirectory, tenantId, 'proposals', this.toSafeFilename(proposalId));
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content) as PolicyEvolutionProposal;
      if (parsed.tenantId !== tenantId) {
        throw new TenantIsolationViolationError(
          `Tenant boundary violation: loaded proposal tenant '${parsed.tenantId}' does not match requested tenant '${tenantId}'`
        );
      }
      return parsed;
    } catch (err: unknown) {
      if (err instanceof TenantIsolationViolationError) throw err;
      throw new StrategicPolicyPersistenceError(
        `Failed to parse proposal file '${filePath}': ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // EN: Persists a StrategicPolicyDeliberationDossier atomically with strict OCC/CAS version checking.
  // VI: Lưu bền vững StrategicPolicyDeliberationDossier một cách nguyên tử với kiểm tra phiên bản OCC/CAS nghiêm ngặt.
  public persistDossierAtomically(
    tenantId: string,
    dossier: StrategicPolicyDeliberationDossier,
    expectedVersion: number
  ): PersistenceResult {
    this.validateIdentifier(tenantId, 'TenantId');
    this.validateIdentifier(dossier.dossierId, 'DossierId');

    if (dossier.tenantId !== tenantId) {
      throw new TenantIsolationViolationError(
        `Tenant mismatch: dossier belongs to tenant '${dossier.tenantId}', attempted persistence under '${tenantId}'`
      );
    }

    const tenantDir = path.join(this.baseDirectory, tenantId, 'dossiers');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    const targetPath = path.join(tenantDir, this.toSafeFilename(dossier.dossierId));

    if (fs.existsSync(targetPath)) {
      try {
        const rawExisting = fs.readFileSync(targetPath, 'utf8');
        const existingData = JSON.parse(rawExisting);
        if (existingData.version !== undefined && existingData.version !== expectedVersion) {
          throw new StrategicPolicyEvolutionOCCConflictError(
            `OCC version conflict for dossier '${dossier.dossierId}': expected version ${expectedVersion}, found ${existingData.version}`
          );
        }
      } catch (err: unknown) {
        if (err instanceof StrategicPolicyEvolutionOCCConflictError) {
          throw err;
        }
      }
    }

    const nextVersion = expectedVersion + 1;
    const toPersist: StrategicPolicyDeliberationDossier = {
      ...dossier,
      version: nextVersion,
    };

    const serialized = JSON.stringify(toPersist, null, 2);
    const checksum = this.computeChecksum(serialized);

    const tempPath = path.join(tenantDir, `.tmp.${crypto.randomUUID()}`);
    fs.writeFileSync(tempPath, serialized, 'utf8');

    const readback = fs.readFileSync(tempPath, 'utf8');
    const readbackChecksum = this.computeChecksum(readback);
    if (readbackChecksum !== checksum) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw new StrategicPolicyPersistenceError(
        `Readback checksum mismatch for dossier '${dossier.dossierId}': expected ${checksum}, got ${readbackChecksum}`
      );
    }

    const bakPath = `${targetPath}.bak`;
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, bakPath);
    }

    fs.renameSync(tempPath, targetPath);

    return {
      targetPath,
      checksum,
      version: nextVersion,
    };
  }

  // EN: Loads a StrategicPolicyDeliberationDossier from tenant partition.
  // VI: Tải StrategicPolicyDeliberationDossier từ phân vùng của tenant.
  public loadDossier(tenantId: string, dossierId: string): StrategicPolicyDeliberationDossier | null {
    this.validateIdentifier(tenantId, 'TenantId');
    this.validateIdentifier(dossierId, 'DossierId');

    const filePath = path.join(this.baseDirectory, tenantId, 'dossiers', this.toSafeFilename(dossierId));
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content) as StrategicPolicyDeliberationDossier;
      if (parsed.tenantId !== tenantId) {
        throw new TenantIsolationViolationError(
          `Tenant boundary violation: loaded dossier tenant '${parsed.tenantId}' does not match requested tenant '${tenantId}'`
        );
      }
      return parsed;
    } catch (err: unknown) {
      if (err instanceof TenantIsolationViolationError) throw err;
      throw new StrategicPolicyPersistenceError(
        `Failed to parse dossier file '${filePath}': ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // EN: Emits an immutable, SHA-256 hash-chained audit event.
  // VI: Phát sự kiện kiểm toán bất biến, được liên kết chuỗi băm mật mã SHA-256.
  public emitAuditEvent(
    eventType: StrategicPolicyAuditEventType,
    tenantId: string,
    sessionId: string,
    details: Record<string, unknown> = {},
    proposalId?: string,
    dossierId?: string
  ): StrategicPolicyAuditEvent {
    this.validateIdentifier(tenantId, 'TenantId');
    this.validateIdentifier(sessionId, 'SessionId');

    let chain = this.auditChains.get(sessionId);
    if (!chain) {
      chain = [];
      this.auditChains.set(sessionId, chain);
    }

    if (chain.length >= MAX_AUDIT_LOG_RECORDS_PER_SESSION) {
      throw new StrategicPolicyPersistenceError(
        `Audit log record ceiling reached: max ${MAX_AUDIT_LOG_RECORDS_PER_SESSION} records per session.`
      );
    }

    const prevHash =
      chain.length === 0
        ? '0000000000000000000000000000000000000000000000000000000000000000'
        : chain[chain.length - 1].eventHash;

    const eventId = `audit_${sessionId}_${Date.now()}_${chain.length + 1}`;

    const rawEvent: StrategicPolicyAuditEvent = {
      eventId,
      eventType,
      tenantId,
      sessionId,
      proposalId,
      dossierId,
      details,
      prevHash,
      eventHash: '',
      timestamp: Date.now(),
    };

    const eventHash = computeStrategicPolicyAuditHash(rawEvent);
    const event: StrategicPolicyAuditEvent = {
      ...rawEvent,
      eventHash,
    };

    chain.push(event);
    return event;
  }

  // EN: Returns the complete chained audit trail for a session.
  // VI: Trả về toàn bộ chuỗi vết kiểm toán liên kết cho một phiên.
  public getAuditChain(sessionId: string): StrategicPolicyAuditEvent[] {
    this.validateIdentifier(sessionId, 'SessionId');
    return [...(this.auditChains.get(sessionId) || [])];
  }

  // EN: Verifies that an audit chain is cryptographically intact and unbroken.
  // VI: Xác minh chuỗi kiểm toán toàn vẹn về mặt mật mã và không bị gián đoạn.
  public verifyAuditChainIntegrity(sessionId: string): boolean {
    this.validateIdentifier(sessionId, 'SessionId');
    const chain = this.auditChains.get(sessionId);
    if (!chain || chain.length === 0) {
      return true;
    }

    let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
    for (const event of chain) {
      if (event.prevHash !== expectedPrev) {
        return false;
      }
      const calculated = computeStrategicPolicyAuditHash(event);
      if (event.eventHash !== calculated) {
        return false;
      }
      expectedPrev = event.eventHash;
    }
    return true;
  }

  // EN: Persists the audit ledger for a tenant to disk atomically.
  // VI: Lưu sổ cái kiểm toán của tenant vào đĩa một cách nguyên tử.
  public persistAuditLedger(tenantId: string, sessionId?: string): string {
    this.validateIdentifier(tenantId, 'TenantId');
    const auditDir = path.join(this.baseDirectory, tenantId, 'audit');
    if (!fs.existsSync(auditDir)) {
      fs.mkdirSync(auditDir, { recursive: true });
    }

    const eventsToPersist: StrategicPolicyAuditEvent[] = [];
    if (sessionId) {
      eventsToPersist.push(...(this.auditChains.get(sessionId) || []));
    } else {
      for (const chain of this.auditChains.values()) {
        for (const ev of chain) {
          if (ev.tenantId === tenantId) {
            eventsToPersist.push(ev);
          }
        }
      }
    }

    const targetPath = path.join(auditDir, sessionId ? `ledger_${sessionId}.json` : 'ledger.json');
    const serialized = JSON.stringify(eventsToPersist, null, 2);
    const checksum = this.computeChecksum(serialized);

    const tempPath = path.join(auditDir, `.tmp.${crypto.randomUUID()}`);
    fs.writeFileSync(tempPath, serialized, 'utf8');

    const readback = fs.readFileSync(tempPath, 'utf8');
    if (this.computeChecksum(readback) !== checksum) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      throw new StrategicPolicyPersistenceError(`Audit ledger checksum verification failed.`);
    }

    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, `${targetPath}.bak`);
    }

    fs.renameSync(tempPath, targetPath);
    return targetPath;
  }

  // EN: Reset in-memory audit chains (for test isolation).
  // VI: Đặt lại các chuỗi kiểm toán trong bộ nhớ (dùng để cách ly kiểm thử).
  public clear(): void {
    this.auditChains.clear();
  }
}
