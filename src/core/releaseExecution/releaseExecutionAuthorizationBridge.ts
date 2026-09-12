// src/core/releaseExecution/releaseExecutionAuthorizationBridge.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Canonical WorldActionAuthorizationEngine integration bridge for release execution.
// Cầu nối tích hợp WorldActionAuthorizationEngine chuẩn tắc cho thực thi phát hành.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - SINGLE_USE_TOKEN == STRICT (Replay prohibited).
// - ZERO TOKEN PERSISTENCE TO DURABLE EVIDENCE (Only safe hash/reference stored).
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ReleaseExecutionRequest,
  type ReleaseExecutionApprovalBinding,
  type ReleaseExecutionAuthorizationBinding,
  ReleaseExecutionError,
} from './releaseExecutionTypes.js';
import type { ReleaseCandidate } from '../release/releaseTypes.js';
import {
  WorldActionAuthorizationEngine,
  globalWorldActionAuth,
} from '../world-action/worldActionAuthorization.js';
import type { AuthorizationToken, WorldAction } from '../world-action/worldActionTypes.js';
import { hashParameters } from '../world-action/worldActionTypes.js';
import { ReleaseExecutionPolicyEngine } from './releaseExecutionPolicyEngine.js';

export interface IssueReleaseTokenInput {
  readonly request: ReleaseExecutionRequest;
  readonly candidate: ReleaseCandidate;
  readonly approval: ReleaseExecutionApprovalBinding;
  readonly ttlMs?: number;
}

export class ReleaseExecutionAuthorizationBridge {
  private consumedTokens = new Set<string>();

  constructor(
    private readonly authEngine: WorldActionAuthorizationEngine = globalWorldActionAuth
  ) {}

  /**
   * Issues a cryptographically bound, single-use WorldActionAuthorization token.
   * Cấp mã WorldActionAuthorization sử dụng một lần được liên kết mã hóa.
   */
  public issueReleaseToken(input: IssueReleaseTokenInput): {
    readonly token: AuthorizationToken;
    readonly binding: ReleaseExecutionAuthorizationBinding;
  } {
    // 1. Guard target path against protected workspace and traversal.
    // 1. Bảo vệ đường dẫn mục tiêu chống lại không gian làm việc được bảo vệ và duyệt đường dẫn.
    ReleaseExecutionPolicyEngine.assertNotProtectedWorkspace(input.request.target.projectRoot);
    ReleaseExecutionPolicyEngine.assertSafePath(input.request.target.projectRoot);

    // 2. Enforce human approval invariant (OWNER_APPROVAL != EXECUTION_TOKEN).
    // 2. Thực thi bất biến phê duyệt của con người (OWNER_APPROVAL != EXECUTION_TOKEN).
    if (input.approval.decision !== 'APPROVED') {
      throw new ReleaseExecutionError(
        'UNAPPROVED_EXECUTION',
        `Cannot issue execution token for unapproved release "${input.request.executionId}".`
      );
    }

    if (input.approval.executionId !== input.request.executionId) {
      throw new ReleaseExecutionError(
        'UNAPPROVED_EXECUTION',
        `Approval executionId "${input.approval.executionId}" does not match request "${input.request.executionId}".`
      );
    }

    // 3. Issue single-use token from canonical engine.
    // 3. Cấp mã dùng một lần từ động cơ chuẩn tắc.
    const actionId = `release_execution_${input.request.executionId}`;
    const token = this.authEngine.issueToken({
      actionId,
      userId: input.request.operatorId,
      operatorId: input.request.operatorId,
      sessionId: input.request.sessionId,
      taskId: input.request.taskId,
      deviceId: 'dev_host_master',
      toolId: 'governed_release_execution_engine',
      capability: 'project_release_execution',
      target: input.request.target.projectRoot,
      parameters: {
        executionId: input.request.executionId,
        candidateId: input.request.candidateId,
        verificationId: input.request.verificationId,
        targetId: input.request.target.targetId,
        sourceManifestHash: input.candidate.sourceManifestHash,
      },
      riskLevel: 'CRITICAL',
      ttlMs: input.ttlMs ?? 300_000, // 5 minutes default
      singleUse: true,
    });

    // 4. Create safe binding reference without raw token secret.
    // 4. Tạo tham chiếu ràng buộc an toàn không chứa bí mật mã thô.
    const tokenHash = crypto.createHash('sha256').update(token.signature).digest('hex');

    const binding: ReleaseExecutionAuthorizationBinding = {
      executionId: input.request.executionId,
      tokenId: token.tokenId,
      tokenHash,
      actionId,
      operatorId: input.request.operatorId,
      authorizedTarget: input.request.target.projectRoot,
      issuedAt: token.issuedAt,
      expiresAt: token.expiresAt,
    };

    return { token, binding };
  }

  /**
   * Validates and consumes the execution token for the given request and candidate.
   * Anti-replay guarantee: token can only be validated and consumed once.
   *
   * Xác thực và tiêu thụ mã thực thi cho yêu cầu và ứng viên được cung cấp.
   * Đảm bảo chống phát lại: mã chỉ có thể được xác thực và tiêu thụ một lần.
   */
  public validateAndConsumeToken(
    token: AuthorizationToken,
    request: ReleaseExecutionRequest,
    candidate: ReleaseCandidate
  ): boolean {
    // 1. Anti-replay check.
    // 1. Kiểm tra chống phát lại.
    if (this.consumedTokens.has(token.tokenId)) {
      throw new ReleaseExecutionError(
        'TOKEN_REPLAY_REJECTED',
        `Execution token "${token.tokenId}" has already been consumed. Replay strictly forbidden.`
      );
    }

    const params = {
      executionId: request.executionId,
      candidateId: request.candidateId,
      verificationId: request.verificationId,
      targetId: request.target.targetId,
      sourceManifestHash: candidate.sourceManifestHash,
    };

    const action: WorldAction = {
      actionId: `release_execution_${request.executionId}`,
      requestId: `req_${request.executionId}`,
      traceId: `trace_${request.executionId}`,
      tenantId: 'bowcon_tenant',
      deviceId: 'dev_host_master',
      sessionId: request.sessionId,
      userId: token.operatorId || token.userId,
      actionType: 'project_release_execution',
      target: request.target.projectRoot,
      parameters: params,
      parametersHash: hashParameters(params),
      riskLevel: 'CRITICAL',
      authorizationState: 'AUTHORIZED',
      executionState: 'PREPARED',
      verificationState: 'UNVERIFIED',
      lifecycleState: 'AUTHORIZED',
      createdAt: Date.now(),
      expiresAt: Date.now() + 600_000,
      idempotencyKey: `idemp_${request.executionId}`,
      isDryRun: false,
      metadata: {},
    };

    // 2. Validate token against canonical WorldActionAuthorizationEngine.
    // 2. Xác thực mã so với WorldActionAuthorizationEngine chuẩn tắc.
    const validation = this.authEngine.validateToken(token, action, {
      operatorId: request.operatorId,
      sessionId: request.sessionId,
      taskId: request.taskId,
      deviceId: 'dev_host_master',
      target: request.target.projectRoot,
      capability: 'project_release_execution',
      parameters: params,
    });

    if (!validation.valid) {
      if (validation.reason?.includes('expired')) {
        throw new ReleaseExecutionError('AUTHORIZATION_EXPIRED', `Authorization token expired: ${validation.reason}`);
      }
      throw new ReleaseExecutionError(
        'INVALID_AUTHORIZATION_TOKEN',
        `Authorization token invalid for release execution: ${validation.reason}`
      );
    }

    // 3. Mark as consumed.
    // 3. Đánh dấu là đã tiêu thụ.
    this.consumedTokens.add(token.tokenId);
    return true;
  }
}
