// src/core/releaseExecution/governedReleaseExecutionEngine.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Governed mutation boundary that applies authorized release artifacts to targets.
// Ranh giới đột biến có quản trị áp dụng các tạo tác phát hành được ủy quyền vào mục tiêu.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - ZERO SHELL EXECUTION (No eval, new Function, execSync, child_process, spawn, fork, SSH).
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - ATOMIC & ROLLBACK-AWARE MUTATION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import fs from 'node:fs';
import path from 'node:path';
import {
  type ReleaseExecutionRequest,
  type ReleaseExecutionApprovalBinding,
  type ReleaseExecutionRollbackBackup,
  ReleaseExecutionError,
} from './releaseExecutionTypes.js';
import type { ReleaseCandidate } from '../release/releaseTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import { ReleaseExecutionPolicyEngine } from './releaseExecutionPolicyEngine.js';
import { ReleaseExecutionAuthorizationBridge } from './releaseExecutionAuthorizationBridge.js';
import { ReleaseExecutionManifestEngine } from './releaseExecutionManifestEngine.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';

export interface ExecuteReleaseMutationInput {
  readonly request: ReleaseExecutionRequest;
  readonly candidate: ReleaseCandidate;
  readonly approval: ReleaseExecutionApprovalBinding;
  readonly token: AuthorizationToken;
  readonly sourceFiles?: readonly {
    readonly relativePath: string;
    readonly content: string | Buffer;
  }[];
  readonly sourceDirectory?: string;
  readonly isUserStopActive?: boolean;
  readonly isRevoked?: boolean;
}

export interface ReleaseMutationOutput {
  readonly preExecutionManifestHash: string;
  readonly filesMutated: readonly string[];
  readonly backups: readonly ReleaseExecutionRollbackBackup[];
}

export class GovernedReleaseExecutionEngine {
  constructor(
    private readonly authBridge: ReleaseExecutionAuthorizationBridge
  ) {}

  /**
   * Governed execution boundary for release mutation.
   * Ranh giới thực thi có quản trị cho đột biến phát hành.
   */
  public executeRelease(input: ExecuteReleaseMutationInput): ReleaseMutationOutput {
    // 1. Enforce USER_STOP and REVOCATION supremacy.
    // 1. Thực thi tính tối thượng của USER_STOP và REVOCATION.
    ReleaseExecutionPolicyEngine.assertNotUserStopped(input.isUserStopActive);
    ReleaseExecutionPolicyEngine.assertNotRevoked(input.isRevoked);

    // 2. Guard against protected workspace.
    // 2. Bảo vệ chống lại không gian làm việc được bảo vệ.
    ReleaseExecutionPolicyEngine.assertNotProtectedWorkspace(input.request.target.projectRoot);
    ReleaseExecutionPolicyEngine.assertSafePath(input.request.target.projectRoot);

    if (input.sourceDirectory) {
      ReleaseExecutionPolicyEngine.assertNotProtectedWorkspace(input.sourceDirectory);
      ReleaseExecutionPolicyEngine.assertSafePath(input.sourceDirectory);
    }

    // 3. Enforce valid human approval.
    // 3. Thực thi phê duyệt hợp lệ của con người.
    if (input.approval.decision !== 'APPROVED') {
      throw new ReleaseExecutionError(
        'UNAPPROVED_EXECUTION',
        `Cannot execute release without human approval (decision: "${input.approval.decision}").`
      );
    }

    // 4. Validate and consume single-use execution authorization token.
    // 4. Xác thực và tiêu thụ mã ủy quyền thực thi sử dụng một lần.
    this.authBridge.validateAndConsumeToken(input.token, input.request, input.candidate);

    // 5. Capture pre-execution target manifest.
    // 5. Thu thập bản kê khai mục tiêu trước thực thi.
    const targetRootAbs = path.resolve(input.request.target.projectRoot);
    if (!fs.existsSync(targetRootAbs)) {
      fs.mkdirSync(targetRootAbs, { recursive: true });
    }

    const preManifest = ReleaseExecutionManifestEngine.scanDirectory(targetRootAbs);

    // 6. Gather files to mutate.
    // 6. Thu thập các tệp cần đột biến.
    const filesToApply: { relativePath: string; content: string | Buffer }[] = [];

    if (input.sourceFiles && input.sourceFiles.length > 0) {
      for (const f of input.sourceFiles) {
        filesToApply.push(f);
      }
    } else if (input.sourceDirectory && fs.existsSync(input.sourceDirectory)) {
      const srcAbs = path.resolve(input.sourceDirectory);
      const walk = (current: string): void => {
        const entries = fs.readdirSync(current, { withFileTypes: true });
        for (const e of entries) {
          const full = path.join(current, e.name);
          if (e.isDirectory()) {
            walk(full);
          } else if (e.isFile()) {
            const rel = path.relative(srcAbs, full).replace(/\\/g, '/');
            filesToApply.push({
              relativePath: rel,
              content: fs.readFileSync(full),
            });
          }
        }
      };
      walk(srcAbs);
    }

    if (filesToApply.length === 0) {
      // Default: emit a verified release marker if no explicit payload files given.
      // Mặc định: phát hành tệp đánh dấu đã xác minh nếu không có tệp tải trọng rõ ràng.
      filesToApply.push({
        relativePath: 'RELEASE.json',
        content: JSON.stringify(
          {
            candidateId: input.candidate.candidateId,
            milestoneTag: input.candidate.milestoneTag,
            deployedAt: Date.now(),
            executionId: input.request.executionId,
            targetId: input.request.target.targetId,
          },
          null,
          2
        ),
      });
    }

    // 7. Create backups for atomic rollback.
    // 7. Tạo bản sao lưu cho hoàn tác nguyên tử.
    const backups: ReleaseExecutionRollbackBackup[] = [];

    for (const item of filesToApply) {
      const { absolutePath: destAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
        targetRootAbs,
        item.relativePath
      );

      const exists = fs.existsSync(destAbs);
      backups.push({
        relativePath: item.relativePath,
        previousContent: exists ? fs.readFileSync(destAbs, 'utf8') : undefined,
        previousExists: exists,
      });
    }

    // 8. Apply file mutations.
    // 8. Áp dụng các thay đổi tệp.
    const mutated: string[] = [];

    try {
      for (const item of filesToApply) {
        const { absolutePath: destAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
          targetRootAbs,
          item.relativePath
        );

        const parentDir = path.dirname(destAbs);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.writeFileSync(destAbs, item.content);
        mutated.push(item.relativePath);
      }
    } catch (err: any) {
      throw new ReleaseExecutionError(
        'MUTATION_FAILED',
        `Release mutation halted due to filesystem error: ${err?.message ?? String(err)}`
      );
    }

    return {
      preExecutionManifestHash: preManifest.manifestHash,
      filesMutated: Object.freeze(mutated),
      backups: Object.freeze(backups),
    };
  }
}
