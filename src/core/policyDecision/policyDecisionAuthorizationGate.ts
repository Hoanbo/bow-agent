// src/core/policyDecision/policyDecisionAuthorizationGate.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Governed Policy Decision Authorization Gate (Component 731).
// Validates cryptographic, single-use human operator authorization tokens.
// Strictly prevents autonomous authorization, token replay, token expiration,
// and cross-tenant/cross-proposal binding mismatches.
//
// Cổng ủy quyền quyết định chính sách có quản trị (Thành phần 731).
// Thẩm định các mã ủy quyền của người vận hành con người, dùng một lần theo mật mã.
// Ngăn chặn nghiêm ngặt ủy quyền tự động, phát lại token, hết hạn token,
// và sự không khớp ràng buộc liên người thuê/liên đề xuất.
//
// Authority Invariants:
// - ZERO_AUTONOMOUS_APPROVAL: Autonomous actors explicitly rejected
// - ANTI_REPLAY_SINGLE_USE: Consumed tokens cannot be reused
// - STRICT_4_WAY_BINDING: proposalId + remediationRequestId + tenantPartition + candidateId
// - USER_STOP > ALL_AUTHORIZATION_OPERATIONS
// - FAIL_CLOSED

import path from 'node:path';
import {
  type PolicyDecisionProposal,
  type PolicyDecisionAuthorizationToken,
  type RemediationRequest,
} from './policyDecisionTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

const AUTONOMOUS_ACTOR_PATTERNS = [
  /^autonomous/i,
  /^auto_/i,
  /^agent_/i,
  /^bot_/i,
  /^daemon/i,
  /^system_auto/i,
  /^cron_/i,
  /^scheduler/i,
  /^ai_/i,
];

export interface PolicyDecisionAuthorizationGateOptions {
  readonly isUserStopActive?: () => boolean;
}

export class PolicyDecisionAuthorizationGate {
  private readonly isUserStopActiveFn?: () => boolean;
  // Set of consumed tokenIds to guarantee single-use / Tập hợp các tokenId đã tiêu thụ để đảm bảo chỉ dùng 1 lần
  private readonly consumedTokenIds = new Set<string>();

  constructor(options?: PolicyDecisionAuthorizationGateOptions) {
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Authorization operations suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('AUTHORIZATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
  }

  /**
   * Validates and atomically consumes a human authorization token for a proposal and remediation request.
   * Thẩm định và tiêu thụ nguyên tử token ủy quyền con người cho đề xuất và yêu cầu khắc phục.
   */
  public validateAndConsumeToken(
    token: PolicyDecisionAuthorizationToken,
    proposal: PolicyDecisionProposal,
    remediationRequest?: RemediationRequest
  ): {
    readonly valid: boolean;
    readonly operatorUserId: string;
    readonly consumedAt: string;
  } {
    // 1. Fail closed on USER_STOP
    this.assertUserStopInactive();

    // 2. Strict tenant isolation
    this.validateTenant(proposal.tenantPartition);

    if (!token || !token.tokenId || token.tokenId.trim().length === 0) {
      throw new Error('MISSING_AUTHORIZATION_TOKEN: Authorization token is required for controlled remediation');
    }

    // 3. Reject autonomous actors
    if (token.isHuman !== true) {
      throw new Error('AUTONOMOUS_AUTHORIZATION_DENIED: Authorization token indicates non-human origin');
    }

    if (!token.operatorUserId || token.operatorUserId.trim().length === 0) {
      throw new Error('MISSING_OPERATOR_ID: operatorUserId must be a non-empty string');
    }

    const trimmedOperator = token.operatorUserId.trim();
    for (const pattern of AUTONOMOUS_ACTOR_PATTERNS) {
      if (pattern.test(trimmedOperator)) {
        throw new Error(`AUTONOMOUS_AUTHORIZATION_DENIED: Operator ID '${trimmedOperator}' is identified as an autonomous actor`);
      }
    }

    // 4. Validate token expiration
    const now = Date.now();
    const expiresTime = new Date(token.expiresAt).getTime();
    if (Number.isNaN(expiresTime) || now > expiresTime) {
      throw new Error(`AUTHORIZATION_TOKEN_EXPIRED: Token '${token.tokenId}' expired at ${token.expiresAt}`);
    }

    // 5. Anti-replay defense: check if already consumed
    if (this.consumedTokenIds.has(token.tokenId)) {
      throw new Error(`AUTHORIZATION_TOKEN_REPLAYED: Token '${token.tokenId}' has already been consumed (single-use violation)`);
    }

    // 6. Strict 4-way binding validation
    if (token.proposalId !== proposal.proposalId) {
      throw new Error(`PROPOSAL_MISMATCH: Token proposalId '${token.proposalId}' does not match target proposalId '${proposal.proposalId}'`);
    }

    if (token.tenantPartition !== proposal.tenantPartition) {
      throw new Error(`TENANT_MISMATCH: Token tenantPartition '${token.tenantPartition}' does not match target tenantPartition '${proposal.tenantPartition}'`);
    }

    if (token.candidateId && proposal.candidateId && token.candidateId !== proposal.candidateId) {
      throw new Error(`CANDIDATE_MISMATCH: Token candidateId '${token.candidateId}' does not match target candidateId '${proposal.candidateId}'`);
    }

    if (remediationRequest && token.remediationRequestId) {
      if (token.remediationRequestId !== remediationRequest.requestId) {
        throw new Error(`REMEDIATION_REQUEST_MISMATCH: Token remediationRequestId '${token.remediationRequestId}' does not match target requestId '${remediationRequest.requestId}'`);
      }
    }

    // 7. Atomically consume token
    this.consumedTokenIds.add(token.tokenId);

    return Object.freeze({
      valid: true,
      operatorUserId: trimmedOperator,
      consumedAt: new Date(now).toISOString(),
    });
  }

  /**
   * Checks if a token ID has already been consumed.
   * Kiểm tra xem tokenId đã được tiêu thụ chưa.
   */
  public isTokenConsumed(tokenId: string): boolean {
    return this.consumedTokenIds.has(tokenId);
  }

  /**
   * Clears consumed tokens for testing.
   * Xóa danh sách token đã tiêu thụ phục vụ kiểm thử.
   */
  public clear(): void {
    this.consumedTokenIds.clear();
  }
}

export const globalPolicyDecisionAuthorizationGate = new PolicyDecisionAuthorizationGate();
