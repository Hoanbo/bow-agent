// src/core/releaseExecution/releaseExecutionRollbackEngine.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Governed rollback engine for restoring release targets from atomic backups.
// Động cơ hoàn tác có quản trị để khôi phục các mục tiêu phát hành từ bản sao lưu nguyên tử.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - Restores ONLY authorized files captured in pre-execution backups.
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import fs from 'node:fs';
import path from 'node:path';
import {
  type ReleaseExecutionTarget,
  type ReleaseExecutionRollbackBackup,
  type ReleaseExecutionManifest,
  ReleaseExecutionError,
} from './releaseExecutionTypes.js';
import { ReleaseExecutionPolicyEngine } from './releaseExecutionPolicyEngine.js';
import { ReleaseExecutionManifestEngine } from './releaseExecutionManifestEngine.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';

export interface ExecuteReleaseRollbackInput {
  readonly target: ReleaseExecutionTarget;
  readonly backups: readonly ReleaseExecutionRollbackBackup[];
  readonly reason: string;
  readonly isUserStopActive?: boolean;
  readonly isRevoked?: boolean;
}

export interface ReleaseRollbackOutput {
  readonly restoredCount: number;
  readonly postRollbackManifest: ReleaseExecutionManifest;
}

export class ReleaseExecutionRollbackEngine {
  /**
   * Executes atomic restore from backups.
   * Thực thi khôi phục nguyên tử từ các bản sao lưu.
   */
  public static rollback(input: ExecuteReleaseRollbackInput): ReleaseRollbackOutput {
    // 1. Enforce USER_STOP and REVOCATION supremacy.
    // 1. Thực thi tính tối thượng của USER_STOP và REVOCATION.
    ReleaseExecutionPolicyEngine.assertNotUserStopped(input.isUserStopActive);
    ReleaseExecutionPolicyEngine.assertNotRevoked(input.isRevoked);

    // 2. Guard against protected workspace.
    // 2. Bảo vệ chống lại không gian làm việc được bảo vệ.
    ReleaseExecutionPolicyEngine.assertNotProtectedWorkspace(input.target.projectRoot);
    ReleaseExecutionPolicyEngine.assertSafePath(input.target.projectRoot);

    const targetRootAbs = path.resolve(input.target.projectRoot);
    let restoredCount = 0;

    try {
      for (const backup of input.backups) {
        const { absolutePath: fileAbs } = SandboxPathGuard.resolveAndAssertContainedPath(
          targetRootAbs,
          backup.relativePath
        );

        if (backup.previousExists && backup.previousContent !== undefined) {
          // Restore prior content.
          // Khôi phục nội dung trước đó.
          const dir = path.dirname(fileAbs);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fileAbs, backup.previousContent, 'utf8');
          restoredCount++;
        } else if (!backup.previousExists && fs.existsSync(fileAbs)) {
          // File did not exist prior to release; remove it.
          // Tệp không tồn tại trước khi phát hành; xóa nó.
          fs.unlinkSync(fileAbs);
          restoredCount++;
        }
      }
    } catch (err: any) {
      throw new ReleaseExecutionError(
        'ROLLBACK_FAILED',
        `Rollback failed to complete cleanly: ${err?.message ?? String(err)}`
      );
    }

    const postRollbackManifest = ReleaseExecutionManifestEngine.scanDirectory(targetRootAbs);

    return {
      restoredCount,
      postRollbackManifest,
    };
  }
}
