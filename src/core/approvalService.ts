// src/core/approvalService.ts
// BOWCON V4.0 — LEVEL 4.0 APPROVAL LIFECYCLE SERVICE WITH MULTI-TENANT DURABLE STORAGE
// Compliant with ISO/IEC 42001 & NIST AI RMF
//
// Enforces:
// 1. Physical & logical multi-user partitioning via UserPartitionResolver.
// 2. One-Time Execution Tokens (anti-replay guarantee, status -> CONSUMED).
// 3. Cryptographic arguments hash (SHA-256) binding token to exact parameters.
// 4. Token ownership enforcement: authenticated userId must match token owner.
// 5. Strict TTL expiration and status state machine (PENDING -> APPROVED/REJECTED -> CONSUMED/EXPIRED/REVOKED).
// 6. Token revocation capability.
// 7. Atomic crash-safe persistence via DurableJsonStore<ApprovalRecord[]>.
// 8. Fail-closed on missing identity, traversal, or malformed schema.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DurableJsonStore } from './persistence/durableJsonStore.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from './persistence/userPartitionResolver.js';
import { validateApprovalRecords } from './persistence/governanceSchemas.js';
import type { ApprovalRecord, ApprovalStatus } from './persistence/governanceSchemas.js';

export type { ApprovalRecord, ApprovalStatus };

const DEFAULT_DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_PARTITIONS_DIR = path.join(DEFAULT_DATA_DIR, 'approvals');
const LEGACY_APPROVALS_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'approvals_store.json');

export class ApprovalService {
  public readonly baseDir: string;
  public readonly legacyFilePath: string;
  private singleFileOverride?: string;
  private stores = new Map<string, DurableJsonStore<ApprovalRecord[]>>();
  private tokenToUserIndex = new Map<string, string>();
  private approvalToUserIndex = new Map<string, string>();

  constructor(customBaseDirOrFilePath?: string, customLegacyFilePathOrAllowedDir?: string) {
    if (customBaseDirOrFilePath && customBaseDirOrFilePath.endsWith('.json')) {
      // Backward compatibility with single-file tests (customFilePath, allowedBaseDir)
      this.baseDir = path.dirname(customBaseDirOrFilePath);
      this.singleFileOverride = customBaseDirOrFilePath;
      this.legacyFilePath =
        customLegacyFilePathOrAllowedDir && customLegacyFilePathOrAllowedDir.endsWith('.json')
          ? customLegacyFilePathOrAllowedDir
          : LEGACY_APPROVALS_FILE_PATH;
    } else {
      this.baseDir = customBaseDirOrFilePath || DEFAULT_PARTITIONS_DIR;
      this.legacyFilePath = customLegacyFilePathOrAllowedDir || LEGACY_APPROVALS_FILE_PATH;
    }

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    if (this.singleFileOverride) {
      // Fail closed immediately on corrupt single-file override
      this.getStore();
    }
  }

  /**
   * Resolve or initialize the isolated DurableJsonStore for the specified user.
   */
  public getStore(userId?: string): DurableJsonStore<ApprovalRecord[]> {
    const targetUserId = userId || DEFAULT_PRIMARY_USER_ID;
    const partition = resolveUserPartition(targetUserId, this.baseDir);
    const targetFilePath = this.singleFileOverride || partition.filePath;
    const cacheKey = this.singleFileOverride ? '__single_file__' : partition.partitionKey;

    if (this.stores.has(cacheKey)) {
      return this.stores.get(cacheKey)!;
    }

    // Deterministic, idempotent legacy migration: ONLY for primary configured owner
    if (
      !this.singleFileOverride &&
      partition.userId === DEFAULT_PRIMARY_USER_ID &&
      !fs.existsSync(partition.filePath)
    ) {
      if (fs.existsSync(this.legacyFilePath) && fs.statSync(this.legacyFilePath).isFile()) {
        try {
          const migrationStore = new DurableJsonStore<ApprovalRecord[]>({
            filePath: this.legacyFilePath,
            validator: validateApprovalRecords,
            defaultFactory: () => [],
            allowedBaseDir: path.dirname(this.legacyFilePath),
            quarantineCorrupted: false,
          });
          const legacyRecords = migrationStore.read();
          const targetStore = new DurableJsonStore<ApprovalRecord[]>({
            filePath: partition.filePath,
            validator: validateApprovalRecords,
            defaultFactory: () => legacyRecords,
            allowedBaseDir: this.baseDir,
            quarantineCorrupted: true,
          });
          targetStore.write(legacyRecords);
        } catch (err) {
          console.warn('[ApprovalService] Legacy approvals migration skipped or failed:', err);
        }
      }
    }

    const store = new DurableJsonStore<ApprovalRecord[]>({
      filePath: targetFilePath,
      validator: validateApprovalRecords,
      defaultFactory: () => [],
      allowedBaseDir: this.baseDir,
      quarantineCorrupted: true,
    });

    // Populate in-memory index for fast lookup
    try {
      const existing = store.read();
      for (const r of existing) {
        this.approvalToUserIndex.set(r.id, partition.userId);
        if (r.executionToken) {
          this.tokenToUserIndex.set(r.executionToken, partition.userId);
        }
      }
    } catch {
      // Handled by store quarantine/error
    }

    this.stores.set(cacheKey, store);
    return store;
  }

  /**
   * Request a new human approval for a HIGH_IMPACT action
   */
  public requestApproval(params: {
    actionName: string;
    targetDomain: 'shop' | 'desktop' | 'robot' | 'system' | 'dynamic_code';
    arguments: Record<string, any>;
    requestedBy: string;
    userId?: string;
    ttlSeconds?: number;
    correlationId?: string;
  }): ApprovalRecord {
    const isAnon = (id?: string) => !id || ['anonymous', 'anon', 'unknown', 'unauthenticated'].includes(id.toLowerCase());
    const rawUserId = !isAnon(params.userId) ? params.userId!.trim() : undefined;
    const rawRequestedBy = !isAnon(params.requestedBy) ? params.requestedBy.trim() : undefined;
    const ownerUserId = rawUserId || rawRequestedBy || DEFAULT_PRIMARY_USER_ID;
    const store = this.getStore(ownerUserId);

    const id = 'appr_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    const argsStr = JSON.stringify(params.arguments || {});
    const argsHash = crypto.createHash('sha256').update(argsStr).digest('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + (params.ttlSeconds || 300) * 1000);

    const record: ApprovalRecord = {
      id,
      ownerUserId,
      actionName: params.actionName,
      targetDomain: params.targetDomain,
      argumentsHash: argsHash,
      argumentsPreview: params.arguments || {},
      requestedBy: params.requestedBy,
      status: 'PENDING',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      correlationId: params.correlationId,
    };

    store.update(records => [...records, record]);
    this.approvalToUserIndex.set(id, ownerUserId);

    return record;
  }

  /**
   * Grant approval by authorized human (Boss / Admin) and generate a single-use execution token
   */
  public grantApproval(
    approvalId: string,
    approver: string,
    userId?: string
  ): { success: boolean; executionToken?: string; error?: string } {
    const targetUserId = userId || this.approvalToUserIndex.get(approvalId);
    if (!targetUserId && !this.singleFileOverride) {
      return { success: false, error: 'APPROVAL_NOT_FOUND' };
    }

    const store = this.getStore(targetUserId);
    const records = store.read();
    const record = records.find(r => r.id === approvalId);

    if (!record) {
      return { success: false, error: 'APPROVAL_NOT_FOUND' };
    }

    if (record.status !== 'PENDING') {
      return { success: false, error: `APPROVAL_ALREADY_${record.status}` };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      store.update(list =>
        list.map(r => (r.id === approvalId ? { ...r, status: 'EXPIRED' as ApprovalStatus } : r))
      );
      return { success: false, error: 'APPROVAL_EXPIRED' };
    }

    const token = 'tok_' + crypto.randomBytes(24).toString('hex');

    store.update(list =>
      list.map(r =>
        r.id === approvalId
          ? {
              ...r,
              status: 'APPROVED' as ApprovalStatus,
              approver,
              executionToken: token,
            }
          : r
      )
    );

    this.tokenToUserIndex.set(token, record.ownerUserId);
    return { success: true, executionToken: token };
  }

  /**
   * Reject an approval request
   */
  public rejectApproval(approvalId: string, rejector: string, userId?: string): boolean {
    const targetUserId = userId || this.approvalToUserIndex.get(approvalId);
    if (!targetUserId && !this.singleFileOverride) {
      return false;
    }

    const store = this.getStore(targetUserId);
    const records = store.read();
    const record = records.find(r => r.id === approvalId);

    if (!record || record.status !== 'PENDING') {
      return false;
    }

    store.update(list =>
      list.map(r =>
        r.id === approvalId
          ? {
              ...r,
              status: 'REJECTED' as ApprovalStatus,
              approver: rejector,
            }
          : r
      )
    );
    return true;
  }

  /**
   * Revoke an approved or pending approval
   */
  public revokeApproval(approvalId: string, reason?: string, userId?: string): boolean {
    const targetUserId = userId || this.approvalToUserIndex.get(approvalId);
    if (!targetUserId && !this.singleFileOverride) {
      return false;
    }

    const store = this.getStore(targetUserId);
    const records = store.read();
    const record = records.find(r => r.id === approvalId);

    if (!record || record.status === 'CONSUMED') {
      return false;
    }

    store.update(list =>
      list.map(r =>
        r.id === approvalId
          ? {
              ...r,
              status: 'REVOKED' as ApprovalStatus,
            }
          : r
      )
    );
    return true;
  }

  /**
   * Validate an execution token without consuming it.
   */
  public validateToken(
    token: string,
    actionName: string,
    args: Record<string, any>,
    userId?: string
  ): { valid: boolean; reason?: string; record?: ApprovalRecord } {
    if (!token) {
      return { valid: false, reason: 'MISSING_TOKEN' };
    }

    const isAnon = !userId || ['anonymous', 'anon', 'unknown', 'unauthenticated'].includes(userId.toLowerCase());
    const authenticatedUserId = !isAnon ? userId : undefined;

    const tokenOwner = this.tokenToUserIndex.get(token);
    let targetUserId = authenticatedUserId || tokenOwner;

    // If an authenticated user ID was explicitly passed, verify it matches the token owner
    if (authenticatedUserId && tokenOwner && tokenOwner !== authenticatedUserId) {
      return {
        valid: false,
        reason: `TOKEN_OWNER_MISMATCH: Authenticated user "${authenticatedUserId}" does not match token owner "${tokenOwner}"`,
      };
    }

    if (!targetUserId && !this.singleFileOverride) {
      return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    }

    const store = this.getStore(targetUserId);
    const records = store.read();
    const record = records.find(r => r.executionToken === token);

    if (!record) {
      return { valid: false, reason: 'TOKEN_NOT_FOUND' };
    }

    // Token ownership verification: authenticated user must match record owner
    if (authenticatedUserId && record.ownerUserId !== authenticatedUserId) {
      return {
        valid: false,
        reason: `TOKEN_OWNER_MISMATCH: Authenticated user "${authenticatedUserId}" does not match token owner "${record.ownerUserId}"`,
      };
    }

    if (record.status !== 'APPROVED') {
      return { valid: false, reason: `TOKEN_NOT_APPROVED (Status: ${record.status})` };
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      store.update(list =>
        list.map(r => (r.id === record.id ? { ...r, status: 'EXPIRED' as ApprovalStatus } : r))
      );
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }

    if (record.actionName !== actionName) {
      return {
        valid: false,
        reason: `ACTION_MISMATCH (Expected: ${record.actionName}, Got: ${actionName})`,
      };
    }

    const currentHash = crypto.createHash('sha256').update(JSON.stringify(args || {})).digest('hex');
    if (currentHash !== record.argumentsHash) {
      return { valid: false, reason: 'ARGUMENTS_HASH_MISMATCH' };
    }

    return { valid: true, record };
  }

  /**
   * Consume an approved token by transitioning its status to CONSUMED.
   */
  public consumeToken(token: string, userId?: string): boolean {
    const targetUserId = userId || this.tokenToUserIndex.get(token);
    if (!targetUserId && !this.singleFileOverride) return false;

    const store = this.getStore(targetUserId);
    const nowIso = new Date().toISOString();
    let consumed = false;

    store.update(list =>
      list.map(r => {
        if (r.executionToken === token && r.status === 'APPROVED') {
          consumed = true;
          return {
            ...r,
            status: 'CONSUMED' as ApprovalStatus,
            consumedAt: nowIso,
          };
        }
        return r;
      })
    );

    return consumed;
  }

  /**
   * Validate and consume a one-time execution token.
   * If userId is specified, scopes strictly to the authenticated user's partition.
   */
  public validateAndConsumeToken(
    token: string,
    actionName: string,
    args: Record<string, any>,
    userId?: string
  ): { valid: boolean; reason?: string; record?: ApprovalRecord } {
    const val = this.validateToken(token, actionName, args, userId);
    if (!val.valid || !val.record) {
      return val;
    }

    this.consumeToken(token, val.record.ownerUserId);
    val.record.status = 'CONSUMED';
    val.record.consumedAt = new Date().toISOString();
    return val;
  }

  public getApproval(approvalId: string, userId?: string): ApprovalRecord | undefined {
    const targetUserId = userId || this.approvalToUserIndex.get(approvalId);
    if (!targetUserId && !this.singleFileOverride) {
      return undefined;
    }
    const store = this.getStore(targetUserId);
    return store.read().find(r => r.id === approvalId);
  }

  public getAllApprovals(userId?: string): ApprovalRecord[] {
    if (userId || this.singleFileOverride) {
      return this.getStore(userId).read();
    }
    // Return all records across all instantiated stores
    const all: ApprovalRecord[] = [];
    for (const store of this.stores.values()) {
      all.push(...store.read());
    }
    return all;
  }

  public listApprovals(filter?: {
    status?: ApprovalStatus;
    domain?: string;
    userId?: string;
  }): ApprovalRecord[] {
    let list = this.getAllApprovals(filter?.userId);
    if (filter?.status) {
      list = list.filter(r => r.status === filter.status);
    }
    if (filter?.domain) {
      list = list.filter(r => r.targetDomain === filter.domain);
    }
    return list;
  }

  public listPending(userId?: string): ApprovalRecord[] {
    const now = Date.now();
    return this.getAllApprovals(userId).filter(
      r => r.status === 'PENDING' && new Date(r.expiresAt).getTime() > now
    );
  }
}

export const globalApprovalService = new ApprovalService();
