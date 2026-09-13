// src/core/policyExecution/policyExecutionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.65: GOVERNED REMEDIATION EXECUTION & OUTCOME VERIFICATION LAYER
//
// Governed Policy Execution Provenance Engine.
// Maintains append-only, tamper-evident SHA-256 cryptographic hash chains
// tracking every execution phase from dispatch to outcome verification.
//
// Động cơ nguồn gốc thực thi chính sách có quản trị.
// Duy trì các chuỗi băm mật mã SHA-256 chỉ thêm, chống giả mạo
// theo dõi mọi giai đoạn thực thi từ điều phối đến xác minh kết quả.
//
// Authority Invariants:
// - IMMUTABLE_HASH_CHAIN: Transitions strictly appended with parent link
// - TAMPER_EVIDENT: Any retrospective modification breaks hash chain verification
// - STRICT_TENANT_ISOLATION: Chains are partitioned per executionId & tenant

import crypto from 'node:crypto';
import path from 'node:path';
import {
  type ExecutionId,
  type ExecutionProvenanceId,
  type ExecutionProvenanceRecord,
  createExecutionProvenanceId,
} from './policyExecutionTypes.js';
import type { DecisionProposalId } from '../policyDecision/policyDecisionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export const GENESIS_EXECUTION_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export interface PolicyExecutionProvenanceEngineOptions {
  readonly baseDir?: string;
}

export class PolicyExecutionProvenanceEngine {
  // Map<executionId, ExecutionProvenanceRecord[]>
  private readonly chains: Map<string, ExecutionProvenanceRecord[]> = new Map();
  private readonly baseDir: string;

  constructor(options?: PolicyExecutionProvenanceEngineOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('PROVENANCE_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Appends an execution transition record to the cryptographic hash chain.
   * Thêm một bản ghi chuyển đổi thực thi vào chuỗi băm mật mã.
   */
  public recordTransition(input: {
    readonly executionId: ExecutionId;
    readonly proposalId: DecisionProposalId;
    readonly tenantPartition: string;
    readonly eventType: string;
    readonly operatorUserId?: string;
  }): ExecutionProvenanceRecord {
    this.validateTenant(input.tenantPartition);

    let chain = this.chains.get(input.executionId);
    if (!chain) {
      chain = [];
      this.chains.set(input.executionId, chain);
    }

    const previousHash = chain.length === 0 ? GENESIS_EXECUTION_HASH : chain[chain.length - 1].currentHash;
    const provenanceId = createExecutionProvenanceId(
      `ex_prv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );
    const timestamp = new Date().toISOString();

    const currentHash = crypto
      .createHash('sha256')
      .update(
        JSON.stringify({
          provenanceId,
          executionId: input.executionId,
          proposalId: input.proposalId,
          tenantPartition: input.tenantPartition,
          eventType: input.eventType,
          operatorUserId: input.operatorUserId,
          previousHash,
          timestamp,
        })
      )
      .digest('hex');

    const record: ExecutionProvenanceRecord = Object.freeze({
      provenanceId,
      executionId: input.executionId,
      proposalId: input.proposalId,
      tenantPartition: input.tenantPartition,
      eventType: input.eventType,
      previousHash,
      currentHash,
      timestamp,
      operatorUserId: input.operatorUserId,
    });

    chain.push(record);
    return record;
  }

  /**
   * Verifies the cryptographic integrity of an execution hash chain.
   * Xác minh tính toàn vẹn mật mã của chuỗi băm thực thi.
   */
  public verifyChain(executionId: ExecutionId): {
    readonly valid: boolean;
    readonly recordCount: number;
    readonly headHash?: string;
    readonly reason?: string;
  } {
    const chain = this.chains.get(executionId);
    if (!chain || chain.length === 0) {
      return { valid: true, recordCount: 0 };
    }

    let expectedPrevHash = GENESIS_EXECUTION_HASH;
    let lastTime = 0;

    for (let i = 0; i < chain.length; i++) {
      const rec = chain[i];

      if (rec.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          recordCount: chain.length,
          reason: `PROVENANCE_TAMPER_DETECTED: Broken previousHash link at index ${i}`,
        };
      }

      const recTime = new Date(rec.timestamp).getTime();
      if (recTime < lastTime) {
        return {
          valid: false,
          recordCount: chain.length,
          reason: `PROVENANCE_CHRONOLOGY_VIOLATION: Non-monotonic timestamp at index ${i}`,
        };
      }
      lastTime = recTime;

      const recomputedHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            provenanceId: rec.provenanceId,
            executionId: rec.executionId,
            proposalId: rec.proposalId,
            tenantPartition: rec.tenantPartition,
            eventType: rec.eventType,
            operatorUserId: rec.operatorUserId,
            previousHash: rec.previousHash,
            timestamp: rec.timestamp,
          })
        )
        .digest('hex');

      if (recomputedHash !== rec.currentHash) {
        return {
          valid: false,
          recordCount: chain.length,
          reason: `PROVENANCE_TAMPER_DETECTED: Hash mismatch at index ${i}`,
        };
      }

      expectedPrevHash = rec.currentHash;
    }

    return {
      valid: true,
      recordCount: chain.length,
      headHash: chain[chain.length - 1].currentHash,
    };
  }

  /**
   * Gets the complete immutable chain for an execution.
   */
  public getChain(executionId: ExecutionId): readonly ExecutionProvenanceRecord[] {
    return this.chains.get(executionId) ?? [];
  }
}

export const globalPolicyExecutionProvenanceEngine = new PolicyExecutionProvenanceEngine();
