// src/core/observability/invariantVerificationEngine.ts
// BOWCON V4.0 — MS-1.3.53: GOVERNED POST-DEPLOYMENT AUTONOMOUS VERIFICATION,
// DRIFT DETECTION & OBSERVABILITY TELEMETRY MESH
//
// Invariant verification engine continuously evaluating system invariants post-deployment.
// Động cơ xác minh bất biến liên tục đánh giá các bất biến hệ thống sau triển khai.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - INVARIANT_VERIFICATION != AUTHORITY (Produces evidence, not authorization).
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type ObservabilitySessionId,
  type InvariantCheckId,
  type InvariantCheck,
  type InvariantCategory,
  type InvariantStatus,
  createInvariantCheckId,
} from './observabilityTypes.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';

export interface InvariantEvaluationInput {
  readonly sessionId: ObservabilitySessionId;
  readonly targetId: string;
  readonly category: InvariantCategory;
  readonly name: string;
  readonly expectedValue: string;
  readonly observedValue: string;
  readonly targetPath?: string;
  readonly isUserStopActive?: boolean;
  readonly isRevoked?: boolean;
}

export class InvariantVerificationEngine {
  private checks = new Map<string, InvariantCheck[]>();

  /**
   * Asserts and verifies that a path does not breach protected workspace isolation boundaries.
   * Xác nhận và kiểm tra rằng một đường dẫn không vi phạm ranh giới cách ly không gian làm việc được bảo vệ.
   */
  public verifyWorkspaceIsolation(targetPath?: string): { readonly valid: boolean; readonly reason?: string } {
    if (!targetPath) {
      return { valid: true };
    }
    const normalized = targetPath.replace(/\\/g, '/').toLowerCase();
    if (normalized.includes('c:/bow/shopofbow') || normalized.startsWith('c:/bow/shopofbow')) {
      throw new Error('PROTECTED_WORKSPACE_VIOLATION: Target path references protected workspace C:\\BOW\\shopofbow');
    }
    try {
      SandboxPathGuard.assertNotProtectedWorkspace(targetPath);
      return { valid: true };
    } catch (err) {
      throw new Error(`PROTECTED_WORKSPACE_VIOLATION: ${(err as Error).message}`);
    }
  }

  /**
   * Evaluates a single system invariant against observed state.
   * Đánh giá một bất biến hệ thống duy nhất so với trạng thái quan sát được.
   */
  public evaluateInvariant(input: InvariantEvaluationInput): InvariantCheck {
    // 1. Guard protected workspace if path provided
    // 1. Bảo vệ không gian làm việc được bảo vệ nếu đường dẫn được cung cấp
    if (input.targetPath) {
      this.verifyWorkspaceIsolation(input.targetPath);
    }

    let status: InvariantStatus = 'SATISFIED';
    let reason: string | undefined;

    // 2. Category-specific verification logic
    // 2. Logic xác minh đặc thù theo danh mục
    switch (input.category) {
      case 'USER_STOP':
        if (input.isUserStopActive) {
          status = 'VIOLATED';
          reason = 'USER_STOP is currently active: All autonomous verification must fail closed';
        }
        break;

      case 'REVOCATION':
        if (input.isRevoked) {
          status = 'VIOLATED';
          reason = 'REVOCATION is currently active: Verification authority lease revoked';
        }
        break;

      case 'PROTECTED_WORKSPACE':
        if (input.targetPath) {
          try {
            this.verifyWorkspaceIsolation(input.targetPath);
          } catch (err) {
            status = 'VIOLATED';
            reason = (err as Error).message;
          }
        }
        break;

      case 'MANIFEST':
      case 'HASH':
      case 'CONFIGURATION':
      case 'BOUNDARY':
      case 'PROVENANCE':
      case 'AUTHORIZATION':
      case 'PROBE':
      default:
        if (input.expectedValue !== input.observedValue) {
          status = 'VIOLATED';
          reason = `Expected value '${input.expectedValue}' does not match observed '${input.observedValue}'`;
        }
        break;
    }

    const evaluatedAt = Date.now();
    const evidencePayload = {
      sessionId: input.sessionId,
      targetId: input.targetId,
      category: input.category,
      name: input.name,
      expectedValue: input.expectedValue,
      observedValue: input.observedValue,
      status,
      reason,
      evaluatedAt,
    };
    const evidenceHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(evidencePayload, Object.keys(evidencePayload).sort()))
      .digest('hex');

    const invariantId: InvariantCheckId = createInvariantCheckId(
      `inv_${input.category.toLowerCase()}_${evaluatedAt}_${crypto.randomBytes(4).toString('hex')}`
    );

    const check: InvariantCheck = {
      invariantId,
      sessionId: input.sessionId,
      targetId: input.targetId,
      name: input.name,
      category: input.category,
      expectedValue: input.expectedValue,
      observedValue: input.observedValue,
      status,
      reason,
      evaluatedAt,
      evidenceHash,
    };

    const sessionChecks = this.checks.get(input.sessionId) ?? [];
    sessionChecks.push(check);
    this.checks.set(input.sessionId, sessionChecks);

    return check;
  }

  /**
   * Retrieves all invariant checks performed in a given session.
   * Lấy tất cả các kiểm tra bất biến đã thực hiện trong một phiên đã cho.
   */
  public getChecks(sessionId: ObservabilitySessionId): readonly InvariantCheck[] {
    return this.checks.get(sessionId) ?? [];
  }

  /**
   * Clears in-memory invariant checks.
   * Xóa các kiểm tra bất biến trong bộ nhớ.
   */
  public clear(sessionId?: ObservabilitySessionId): void {
    if (sessionId) {
      this.checks.delete(sessionId);
    } else {
      this.checks.clear();
    }
  }
}
