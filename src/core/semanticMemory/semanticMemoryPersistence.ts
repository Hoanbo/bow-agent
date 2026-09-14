// src/core/semanticMemory/semanticMemoryPersistence.ts
// BOWCON V4.0 — MS-1.5.03: SEMANTIC MEMORY PERSISTENCE ENGINE
// Component 1003 — REAL
//
// Invariants:
// CRASH_SAFE_ATOMIC_PERSISTENCE == TRUE
// SECRET_SANITIZATION_BEFORE_DISK == TRUE
// ZERO_PROTOTYPE_POLLUTION == TRUE
// STRICT_TENANT_ISOLATION == TRUE
// SHA256_PROVENANCE_INTEGRITY == TRUE

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  SEMANTIC_MEMORY_SCHEMA_VERSION,
  MAX_SEMANTIC_PAYLOAD_BYTES,
  type SemanticIndexDocument,
  type SemanticMemoryRecord,
  SemanticMemoryPersistenceError,
  SemanticMemoryIntegrityError,
  CrossTenantSemanticMemoryError,
  computeIndexProvenanceHash,
} from './semanticMemoryTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';
import { NativeVectorIndex } from './nativeVectorIndex.js';

export interface SemanticPersistenceOptions {
  readonly baseDir?: string;
  readonly partitionBaseDir?: string;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class SemanticMemoryPersistenceEngine {
  public readonly baseDir: string;
  private readonly sanitizer: DiagnosisSanitizer;

  constructor(options?: SemanticPersistenceOptions) {
    const rawDir = options?.partitionBaseDir || options?.baseDir;
    this.baseDir = rawDir
      ? path.resolve(rawDir)
      : path.resolve(process.cwd(), 'data/partitions_semantic_memory');
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.ensureBaseDir();
  }

  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Resolves safe partition file path for tenant semantic memory index.
   */
  public resolvePartitionFilePath(tenantId: string): string {
    const cleanTenant = (tenantId || '').trim();
    if (!cleanTenant) {
      throw new SemanticMemoryPersistenceError('tenantId must be a non-empty string');
    }

    if (cleanTenant.includes('..') || cleanTenant.includes('/') || cleanTenant.includes('\\') || cleanTenant.includes('\0')) {
      throw new CrossTenantSemanticMemoryError(cleanTenant, 'PATH_TRAVERSAL_DETECTED');
    }

    const partition = resolveUserPartition(cleanTenant, this.baseDir);
    const tenantDir = path.join(partition.baseDir, partition.partitionKey);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    return path.join(tenantDir, 'vector-index.json');
  }

  /**
   * Atomically saves a NativeVectorIndex partition to disk.
   */
  public saveIndex(
    index: NativeVectorIndex,
    indexVersion = 1,
    activeTenantId?: string
  ): { readonly filePath: string; readonly bytesWritten: number } {
    if (activeTenantId && index.tenantId !== activeTenantId) {
      throw new CrossTenantSemanticMemoryError(index.tenantId, activeTenantId);
    }

    const targetPath = this.resolvePartitionFilePath(index.tenantId);
    const entries = index.listEntries();

    const docDraft = {
      schemaVersion: SEMANTIC_MEMORY_SCHEMA_VERSION,
      tenantId: index.tenantId,
      modelId: index.modelId || 'unbound',
      dimension: index.dimension || 0,
      indexVersion,
      entries,
      lastUpdatedAt: new Date().toISOString(),
    };

    const provenanceHash = computeIndexProvenanceHash(docDraft);
    const fullDoc: SemanticIndexDocument = Object.freeze({
      ...docDraft,
      provenanceHash,
    });

    const rawSerialized = JSON.stringify(fullDoc, null, 2);

    // Sanitize any secrets/tokens before disk writing
    const step1 = this.sanitizer.sanitize(rawSerialized);
    const step2 = CloudEscalationSanitizer.sanitizeString(step1).sanitized;
    const sanitizedString = step2
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/superSecretPassword[A-Za-z0-9!@#$%^&*]+/gi, '[REDACTED_PASSWORD]')
      .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/[A-Za-z]:[\\/]BOW[\\/]shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]');

    const byteLength = Buffer.byteLength(sanitizedString, 'utf8');
    if (byteLength > MAX_SEMANTIC_PAYLOAD_BYTES) {
      throw new SemanticMemoryPersistenceError(
        `Semantic memory partition exceeds ${MAX_SEMANTIC_PAYLOAD_BYTES} bytes: found ${byteLength} bytes`
      );
    }

    const tempPath = `${targetPath}.tmp.${crypto.randomBytes(6).toString('hex')}`;
    const backupPath = `${targetPath}.bak`;

    try {
      fs.writeFileSync(tempPath, sanitizedString, 'utf8');

      if (fs.existsSync(targetPath)) {
        try {
          fs.copyFileSync(targetPath, backupPath);
        } catch {}
      }

      fs.renameSync(tempPath, targetPath);

      return Object.freeze({
        filePath: targetPath,
        bytesWritten: byteLength,
      });
    } catch (err: any) {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
      throw new SemanticMemoryPersistenceError(`Atomic write failed for vector index: ${err.message}`);
    }
  }

  /**
   * Loads and validates a persisted vector index document from disk.
   */
  public loadIndexDocument(tenantId: string, activeTenantId?: string): SemanticIndexDocument | null {
    if (activeTenantId && tenantId !== activeTenantId) {
      throw new CrossTenantSemanticMemoryError(tenantId, activeTenantId);
    }

    const targetPath = this.resolvePartitionFilePath(tenantId);
    const backupPath = `${targetPath}.bak`;

    if (!fs.existsSync(targetPath) && !fs.existsSync(backupPath)) {
      return null;
    }

    let canonicalError: Error | null = null;
    if (fs.existsSync(targetPath)) {
      try {
        return this.parseAndValidateFile(targetPath, tenantId);
      } catch (err: any) {
        canonicalError = err;
      }
    }

    if (fs.existsSync(backupPath)) {
      try {
        return this.parseAndValidateFile(backupPath, tenantId);
      } catch (backupErr: any) {
        throw new SemanticMemoryIntegrityError(
          `Both canonical and backup index partitions for '${tenantId}' are corrupted or tampered`,
          { targetPath, backupPath, reason: backupErr.message }
        );
      }
    }

    if (canonicalError) {
      throw canonicalError;
    }

    return null;
  }

  private parseAndValidateFile(filePath: string, expectedTenant: string): SemanticIndexDocument {
    const raw = fs.readFileSync(filePath, 'utf8');
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch (e: any) {
      throw new SemanticMemoryIntegrityError(`Corrupted JSON in semantic index at ${filePath}: ${e.message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new SemanticMemoryIntegrityError(`Invalid root structure in ${filePath}`);
    }

    if (parsed.schemaVersion !== SEMANTIC_MEMORY_SCHEMA_VERSION) {
      throw new SemanticMemoryIntegrityError(
        `Schema version mismatch: found ${parsed.schemaVersion}, expected ${SEMANTIC_MEMORY_SCHEMA_VERSION}`
      );
    }

    if (parsed.tenantId !== expectedTenant) {
      throw new CrossTenantSemanticMemoryError(parsed.tenantId, expectedTenant);
    }

    const calculatedHash = computeIndexProvenanceHash(parsed);
    if (parsed.provenanceHash !== calculatedHash) {
      throw new SemanticMemoryIntegrityError(
        `Tampered or mismatched provenance hash in ${filePath}: claimed ${parsed.provenanceHash}, calculated ${calculatedHash}`
      );
    }

    return Object.freeze(parsed as SemanticIndexDocument);
  }
}
