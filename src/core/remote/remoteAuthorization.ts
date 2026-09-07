// src/core/remote/remoteAuthorization.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE AUTHORIZATION BOUNDARY
//
// EN:
// Authoritative remote authorization evaluation.
// Enforces:
//   AUTHENTICATED ≠ AUTHORIZED
//   AUTHORIZED ≠ EXECUTED
//   DELIVERED ≠ SUCCEEDED
// Remote authorization never grants ToolExecutor, ExecutionService, PDP, or LLM authority.
//
// VI:
// Đánh giá phân quyền từ xa có thẩm quyền.
// Thực thi các nguyên tắc cốt lõi:
//   XÁC THỰC ≠ PHÂN QUYỀN
//   PHÂN QUYỀN ≠ THỰC THI
//   GIAO NHẬN ≠ THÀNH CÔNG
// Phân quyền từ xa không bao giờ trao quyền cho ToolExecutor, ExecutionService, PDP hoặc LLM.

import type {
  AllowedRemoteCapability,
  RemoteAuthorizationContext,
  PlanRiskLevel,
} from './remoteTypes.js';
import { computeRemoteAuthFingerprint } from './remoteFingerprint.js';
import { deepFreeze } from './remoteValidator.js';

export interface CreateAuthContextParams {
  readonly peerId: string;
  readonly remoteSessionId: string;
  readonly scopeKey: string;
  readonly isAuthenticated: boolean;
  readonly authorizedCapabilities: readonly AllowedRemoteCapability[];
  readonly riskLevel: PlanRiskLevel;
  readonly timestamp?: number;
}

/**
 * EN: Creates an immutable RemoteAuthorizationContext.
 * VI: Khởi tạo một RemoteAuthorizationContext bất biến.
 */
export function createRemoteAuthorizationContext(
  params: CreateAuthContextParams,
): Readonly<RemoteAuthorizationContext> {
  // CRITICAL RULE: An unauthenticated peer CANNOT be authorized!
  const isAuthorized = params.isAuthenticated && params.authorizedCapabilities.length > 0;
  const ts = params.timestamp ?? 0;

  const fp = computeRemoteAuthFingerprint({
    peerId: params.peerId,
    remoteSessionId: params.remoteSessionId,
    scopeKey: params.scopeKey,
    isAuthorized,
    capabilities: params.authorizedCapabilities,
    riskLevel: params.riskLevel,
  });

  const context: RemoteAuthorizationContext = {
    authContextId: `authctx_${fp}`,
    peerId: params.peerId,
    remoteSessionId: params.remoteSessionId,
    scopeKey: params.scopeKey,
    isAuthorized,
    authorizedCapabilities: Object.freeze([...params.authorizedCapabilities]),
    riskLevel: params.riskLevel,
    timestamp: ts,
    fingerprint: fp,
  };

  return deepFreeze(context);
}

/**
 * EN: Asserts whether a remote peer is authorized for a specific non-cognitive capability.
 * VI: Khẳng định máy khách từ xa có được phân quyền cho một quyền năng phi nhận thức cụ thể hay không.
 */
export function isPeerAuthorizedForCapability(
  context: Readonly<RemoteAuthorizationContext>,
  capability: AllowedRemoteCapability,
): boolean {
  if (!context.isAuthorized) {
    return false;
  }
  return context.authorizedCapabilities.includes(capability);
}

/**
 * EN: Validates authorization for a requested capability or throws descriptive error.
 * VI: Xác thực phân quyền cho một quyền năng được yêu cầu hoặc ném lỗi mô tả.
 */
export function assertPeerAuthorized(
  context: Readonly<RemoteAuthorizationContext>,
  capability: AllowedRemoteCapability,
): void {
  if (!isPeerAuthorizedForCapability(context, capability)) {
    throw new Error(
      `[REMOTE_AUTHORIZATION_DENIED] Peer "${context.peerId}" is not authorized for capability "${capability}".`,
    );
  }
}
