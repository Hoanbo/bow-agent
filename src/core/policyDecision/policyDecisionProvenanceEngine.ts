// src/core/policyDecision/policyDecisionProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Governed Policy Decision Provenance Engine (Component 733).
// Provides an append-only, tamper-evident cryptographic SHA-256 hash chain
// tracking all transitions across the policy decision lifecycle:
// Proposal -> Recommendation -> Review -> Human Authorization -> Remediation -> Dispatch.
//
// Động cơ nguồn gốc quyết định chính sách có quản trị (Thành phần 733).
// Cung cấp chuỗi băm SHA-256 mật mã chỉ nối, chống giả mạo
// theo dõi mọi chuyển đổi qua vòng đời quyết định chính sách:
// Đề xuất -> Khuyến nghị -> Xem xét -> Ủy quyền của con người -> Khắc phục -> Điều phối.
//
// Authority Invariants:
// - Deterministic SHA-256 hash chaining (previousHash -> currentHash)
// - Cryptographic verification of unbroken provenance
// - Zero autonomous tampering

import crypto from 'node:crypto';
import {
  type DecisionId,
  type DecisionProposalId,
  type DecisionProvenanceId,
  type DecisionProvenanceRecord,
  createDecisionProvenanceId,
} from './policyDecisionTypes.js';

export const GENESIS_DECISION_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class PolicyDecisionProvenanceEngine {
  // Map<decisionId, DecisionProvenanceRecord[]>
  private readonly chains = new Map<string, DecisionProvenanceRecord[]>();

  /**
   * Appends an event to the cryptographic decision provenance chain.
   * Thêm một sự kiện vào chuỗi nguồn gốc quyết định mật mã.
   */
  public recordTransition(input: {
    readonly decisionId: DecisionId;
    readonly proposalId: DecisionProposalId;
    readonly tenantPartition: string;
    readonly eventType: string;
    readonly operatorUserId?: string;
    readonly metadata?: Record<string, any>;
  }): DecisionProvenanceRecord {
    const { decisionId, proposalId, tenantPartition, eventType, operatorUserId, metadata } = input;

    let chain = this.chains.get(decisionId);
    if (!chain) {
      chain = [];
      this.chains.set(decisionId, chain);
    }

    const previousHash = chain.length > 0 ? chain[chain.length - 1].currentHash : GENESIS_DECISION_HASH;
    const timestamp = new Date().toISOString();
    const provenanceId = createDecisionProvenanceId(
      `dprov_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
    );

    const payload = JSON.stringify({
      provenanceId,
      decisionId,
      proposalId,
      tenantPartition,
      eventType,
      operatorUserId: operatorUserId || '',
      previousHash,
      timestamp,
      metadata: metadata || {},
    });

    const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

    const record: DecisionProvenanceRecord = Object.freeze({
      provenanceId,
      decisionId,
      proposalId,
      tenantPartition,
      eventType,
      previousHash,
      currentHash,
      timestamp,
      operatorUserId,
      metadata: Object.freeze({ ...(metadata || {}) }),
    });

    chain.push(record);
    return record;
  }

  /**
   * Cryptographically verifies the unbroken SHA-256 chain for a decision.
   * Xác minh chuỗi SHA-256 không bị phá vỡ cho một quyết định.
   */
  public verifyChain(decisionId: DecisionId): {
    readonly valid: boolean;
    readonly recordCount: number;
    readonly headHash: string;
    readonly reason?: string;
  } {
    const chain = this.chains.get(decisionId);
    if (!chain || chain.length === 0) {
      return {
        valid: false,
        recordCount: 0,
        headHash: GENESIS_DECISION_HASH,
        reason: 'PROVENANCE_CHAIN_EMPTY: No provenance records found for decision',
      };
    }

    let expectedPrevHash = GENESIS_DECISION_HASH;

    for (let i = 0; i < chain.length; i++) {
      const record = chain[i];

      if (record.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          recordCount: chain.length,
          headHash: record.currentHash,
          reason: `PROVENANCE_HASH_BREAK: Record at index ${i} previousHash '${record.previousHash}' does not match expected '${expectedPrevHash}'`,
        };
      }

      const payload = JSON.stringify({
        provenanceId: record.provenanceId,
        decisionId: record.decisionId,
        proposalId: record.proposalId,
        tenantPartition: record.tenantPartition,
        eventType: record.eventType,
        operatorUserId: record.operatorUserId || '',
        previousHash: record.previousHash,
        timestamp: record.timestamp,
        metadata: record.metadata || {},
      });

      const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
      if (calculatedHash !== record.currentHash) {
        return {
          valid: false,
          recordCount: chain.length,
          headHash: record.currentHash,
          reason: `PROVENANCE_TAMPER_DETECTED: Record at index ${i} currentHash '${record.currentHash}' does not match recomputed '${calculatedHash}'`,
        };
      }

      expectedPrevHash = record.currentHash;
    }

    return {
      valid: true,
      recordCount: chain.length,
      headHash: expectedPrevHash,
    };
  }

  /**
   * Retrieves the full chain for a decision.
   * Lấy toàn bộ chuỗi cho một quyết định.
   */
  public getChain(decisionId: DecisionId): readonly DecisionProvenanceRecord[] {
    return Object.freeze([...(this.chains.get(decisionId) ?? [])]);
  }

  /**
   * Clears provenance chains for testing.
   * Xóa các chuỗi phục vụ kiểm thử.
   */
  public clear(): void {
    this.chains.clear();
  }
}

export const globalPolicyDecisionProvenanceEngine = new PolicyDecisionProvenanceEngine();
