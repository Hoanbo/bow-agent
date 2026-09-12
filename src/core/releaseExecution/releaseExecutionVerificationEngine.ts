// src/core/releaseExecution/releaseExecutionVerificationEngine.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Post-execution verification engine validating release target state after mutation.
// Động cơ xác minh sau thực thi kiểm tra trạng thái mục tiêu phát hành sau đột biến.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - EXECUTION_SUCCESS != RELEASE_VERIFICATION_SUCCESS
// - Fail-closed: missing files or unexpected modifications invalidate the release.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import path from 'node:path';
import fs from 'node:fs';
import {
  type ReleaseExecutionTarget,
  type ReleaseExecutionManifest,
  ReleaseExecutionError,
} from './releaseExecutionTypes.js';
import { ReleaseExecutionManifestEngine } from './releaseExecutionManifestEngine.js';
import { ReleaseExecutionPolicyEngine } from './releaseExecutionPolicyEngine.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';

export interface VerifyReleaseTargetInput {
  readonly target: ReleaseExecutionTarget;
  readonly expectedFiles: readonly string[];
  readonly preManifestHash: string;
}

export interface PostReleaseVerificationOutput {
  readonly passed: boolean;
  readonly postManifest: ReleaseExecutionManifest;
  readonly verifiedFiles: readonly string[];
  readonly failureReasons: readonly string[];
}

export class ReleaseExecutionVerificationEngine {
  /**
   * Verifies the target project post-mutation state.
   * Xác minh trạng thái sau đột biến của dự án mục tiêu.
   */
  public static verifyPostExecution(input: VerifyReleaseTargetInput): PostReleaseVerificationOutput {
    ReleaseExecutionPolicyEngine.assertNotProtectedWorkspace(input.target.projectRoot);
    ReleaseExecutionPolicyEngine.assertSafePath(input.target.projectRoot);

    const targetRootAbs = path.resolve(input.target.projectRoot);
    const postManifest = ReleaseExecutionManifestEngine.scanDirectory(targetRootAbs);

    const failureReasons: string[] = [];
    const verifiedFiles: string[] = [];

    // 1. Verify that all expected mutated files exist and are contained.
    // 1. Xác minh rằng tất cả các tệp đột biến dự kiến đều tồn tại và được bao chứa.
    for (const rel of input.expectedFiles) {
      const { absolutePath: fileAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
        targetRootAbs,
        rel
      );

      if (!fs.existsSync(fileAbs)) {
        failureReasons.push(`Expected release file "${rel}" is missing post-execution.`);
      } else {
        verifiedFiles.push(rel);
      }
    }

    // 2. If files were mutated, postManifestHash should differ from preManifestHash.
    // 2. Nếu các tệp bị đột biến, postManifestHash phải khác với preManifestHash.
    if (input.expectedFiles.length > 0 && postManifest.manifestHash === input.preManifestHash) {
      failureReasons.push('Post-execution target manifest hash is identical to pre-execution state.');
    }

    const passed = failureReasons.length === 0;

    return {
      passed,
      postManifest,
      verifiedFiles: Object.freeze(verifiedFiles),
      failureReasons: Object.freeze(failureReasons),
    };
  }
}
