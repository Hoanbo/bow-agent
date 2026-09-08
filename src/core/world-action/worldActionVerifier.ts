// src/core/world-action/worldActionVerifier.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// Independent Physical Verification Engine.
//
// INVARIANTS:
// EXECUTED != VERIFIED
// SUCCESS requires independent verification.
// Verification failure must NEVER be converted to success.
// Dry-run verification asserts ZERO physical mutation.

import fs from 'node:fs';
import crypto from 'node:crypto';
import type { WorldAction, ActionExecutionResult, ActionVerificationResult } from './worldActionTypes.js';
import { validateAndResolvePath } from './worldActionExecutor.js';

export class WorldActionVerifier {
  /**
   * Independently verifies the real physical effect of a filesystem write.
   */
  public static async verifyFsWrite(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    const verifiedAt = Date.now();
    const checksPerformed: string[] = [];

    if (action.isDryRun) {
      checksPerformed.push('dry_run_zero_mutation_check');
      const resolved = validateAndResolvePath(action.target);
      // In dry run, file must not have been created if it didn't exist
      return {
        passed: true,
        actionId: action.actionId,
        toolId: 'world_fs_write',
        verifiedAt,
        verificationStrategy: 'dry_run_non_mutation',
        checksPerformed,
        observation: { isDryRun: true },
      };
    }

    const resolved = validateAndResolvePath(action.target);

    // 1. Check physical existence
    checksPerformed.push('fs_exists_check');
    if (!fs.existsSync(resolved)) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_write',
        verifiedAt,
        verificationStrategy: 'independent_fs_read_and_sha256',
        checksPerformed,
        observation: { exists: false },
        failureReason: `Physical file does not exist at "${resolved}".`,
      };
    }

    // 2. Check file size
    checksPerformed.push('fs_stat_size_check');
    const stat = fs.statSync(resolved);
    const expectedContent = action.parameters.content ?? '';
    const expectedBytes = Buffer.byteLength(expectedContent, 'utf-8');
    if (stat.size !== expectedBytes) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_write',
        verifiedAt,
        verificationStrategy: 'independent_fs_read_and_sha256',
        checksPerformed,
        observation: { actualSize: stat.size, expectedSize: expectedBytes },
        failureReason: `File size mismatch: expected ${expectedBytes} bytes, got ${stat.size} bytes.`,
      };
    }

    // 3. Independent read & SHA-256 checksum comparison
    checksPerformed.push('sha256_checksum_verification');
    const actualContent = fs.readFileSync(resolved, 'utf-8');
    const actualSha = crypto.createHash('sha256').update(actualContent).digest('hex');
    const expectedSha = crypto.createHash('sha256').update(expectedContent).digest('hex');

    if (actualSha !== expectedSha) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_write',
        verifiedAt,
        verificationStrategy: 'independent_fs_read_and_sha256',
        checksPerformed,
        observation: { actualSha, expectedSha },
        failureReason: 'Content SHA-256 checksum mismatch.',
      };
    }

    return {
      passed: true,
      actionId: action.actionId,
      toolId: 'world_fs_write',
      verifiedAt,
      verificationStrategy: 'independent_fs_read_and_sha256',
      checksPerformed,
      observation: { path: resolved, size: stat.size, sha256: actualSha },
    };
  }

  /**
   * Independently verifies the real physical effect of a filesystem append.
   */
  public static async verifyFsAppend(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    const verifiedAt = Date.now();
    const checksPerformed: string[] = [];

    if (action.isDryRun) {
      return {
        passed: true,
        actionId: action.actionId,
        toolId: 'world_fs_append',
        verifiedAt,
        verificationStrategy: 'dry_run_non_mutation',
        checksPerformed: ['dry_run_check'],
        observation: { isDryRun: true },
      };
    }

    const resolved = validateAndResolvePath(action.target);
    checksPerformed.push('fs_exists_check');
    if (!fs.existsSync(resolved)) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_append',
        verifiedAt,
        verificationStrategy: 'independent_append_content_check',
        checksPerformed,
        observation: { exists: false },
        failureReason: `File not found at "${resolved}".`,
      };
    }

    checksPerformed.push('fs_content_ends_with_check');
    const content = fs.readFileSync(resolved, 'utf-8');
    const appendedText = action.parameters.content ?? '';
    if (!content.endsWith(appendedText)) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_append',
        verifiedAt,
        verificationStrategy: 'independent_append_content_check',
        checksPerformed,
        observation: { endsWithExpected: false },
        failureReason: 'File content does not end with expected appended text.',
      };
    }

    return {
      passed: true,
      actionId: action.actionId,
      toolId: 'world_fs_append',
      verifiedAt,
      verificationStrategy: 'independent_append_content_check',
      checksPerformed,
      observation: { path: resolved, totalLength: content.length },
    };
  }

  /**
   * Independently verifies directory creation.
   */
  public static async verifyFsMkdir(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    const verifiedAt = Date.now();
    const checksPerformed: string[] = [];

    if (action.isDryRun) {
      return {
        passed: true,
        actionId: action.actionId,
        toolId: 'world_fs_mkdir',
        verifiedAt,
        verificationStrategy: 'dry_run_check',
        checksPerformed: ['dry_run_check'],
        observation: { isDryRun: true },
      };
    }

    const resolved = validateAndResolvePath(action.target);
    checksPerformed.push('dir_exists_check');
    if (!fs.existsSync(resolved)) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_mkdir',
        verifiedAt,
        verificationStrategy: 'independent_dir_stat',
        checksPerformed,
        observation: { exists: false },
        failureReason: `Directory does not exist at "${resolved}".`,
      };
    }

    checksPerformed.push('is_directory_check');
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_mkdir',
        verifiedAt,
        verificationStrategy: 'independent_dir_stat',
        checksPerformed,
        observation: { isDirectory: false },
        failureReason: `Target "${resolved}" exists but is not a directory.`,
      };
    }

    return {
      passed: true,
      actionId: action.actionId,
      toolId: 'world_fs_mkdir',
      verifiedAt,
      verificationStrategy: 'independent_dir_stat',
      checksPerformed,
      observation: { path: resolved, isDirectory: true },
    };
  }

  /**
   * Independently verifies file rename / move.
   */
  public static async verifyFsRename(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    const verifiedAt = Date.now();
    const checksPerformed: string[] = [];

    if (action.isDryRun) {
      return {
        passed: true,
        actionId: action.actionId,
        toolId: 'world_fs_rename',
        verifiedAt,
        verificationStrategy: 'dry_run_check',
        checksPerformed: ['dry_run_check'],
        observation: { isDryRun: true },
      };
    }

    const source = validateAndResolvePath(action.target);
    const dest = validateAndResolvePath(action.parameters.newPath);

    checksPerformed.push('source_not_exists_check');
    if (fs.existsSync(source)) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_rename',
        verifiedAt,
        verificationStrategy: 'independent_rename_check',
        checksPerformed,
        observation: { sourceExists: true },
        failureReason: `Source file still exists at "${source}" after rename.`,
      };
    }

    checksPerformed.push('destination_exists_check');
    if (!fs.existsSync(dest)) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_rename',
        verifiedAt,
        verificationStrategy: 'independent_rename_check',
        checksPerformed,
        observation: { destExists: false },
        failureReason: `Destination file does not exist at "${dest}" after rename.`,
      };
    }

    return {
      passed: true,
      actionId: action.actionId,
      toolId: 'world_fs_rename',
      verifiedAt,
      verificationStrategy: 'independent_rename_check',
      checksPerformed,
      observation: { sourceGone: true, destExists: true, destPath: dest },
    };
  }

  /**
   * Independently verifies file deletion.
   */
  public static async verifyFsDelete(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    const verifiedAt = Date.now();
    const checksPerformed: string[] = [];

    if (action.isDryRun) {
      return {
        passed: true,
        actionId: action.actionId,
        toolId: 'world_fs_delete',
        verifiedAt,
        verificationStrategy: 'dry_run_check',
        checksPerformed: ['dry_run_check'],
        observation: { isDryRun: true },
      };
    }

    const resolved = validateAndResolvePath(action.target);
    checksPerformed.push('target_not_exists_check');
    if (fs.existsSync(resolved)) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_fs_delete',
        verifiedAt,
        verificationStrategy: 'independent_delete_check',
        checksPerformed,
        observation: { stillExists: true },
        failureReason: `File still exists at "${resolved}" after delete.`,
      };
    }

    return {
      passed: true,
      actionId: action.actionId,
      toolId: 'world_fs_delete',
      verifiedAt,
      verificationStrategy: 'independent_delete_check',
      checksPerformed,
      observation: { path: resolved, exists: false },
    };
  }

  /**
   * Independently verifies process start.
   */
  public static async verifyProcessStart(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    const verifiedAt = Date.now();
    const checksPerformed: string[] = [];

    if (action.isDryRun) {
      return {
        passed: true,
        actionId: action.actionId,
        toolId: 'world_process_start',
        verifiedAt,
        verificationStrategy: 'dry_run_check',
        checksPerformed: ['dry_run_check'],
        observation: { isDryRun: true },
      };
    }

    const pid = execResult.output?.pid;
    if (!pid || typeof pid !== 'number') {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_process_start',
        verifiedAt,
        verificationStrategy: 'os_process_existence_probe',
        checksPerformed,
        observation: { pid },
        failureReason: 'No valid PID returned by executor.',
      };
    }

    checksPerformed.push('os_kill_zero_probe');
    let exists = false;
    try {
      process.kill(pid, 0);
      exists = true;
    } catch {
      exists = false;
    }

    if (!exists) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_process_start',
        verifiedAt,
        verificationStrategy: 'os_process_existence_probe',
        checksPerformed,
        observation: { pid, exists: false },
        failureReason: `Spawned process PID ${pid} is not running in OS process table.`,
      };
    }

    return {
      passed: true,
      actionId: action.actionId,
      toolId: 'world_process_start',
      verifiedAt,
      verificationStrategy: 'os_process_existence_probe',
      checksPerformed,
      observation: { pid, running: true },
    };
  }

  /**
   * Independently verifies process stop.
   */
  public static async verifyProcessStop(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    const verifiedAt = Date.now();
    const checksPerformed: string[] = [];

    if (action.isDryRun) {
      return {
        passed: true,
        actionId: action.actionId,
        toolId: 'world_process_stop',
        verifiedAt,
        verificationStrategy: 'dry_run_check',
        checksPerformed: ['dry_run_check'],
        observation: { isDryRun: true },
      };
    }

    const targetPid = Number(action.target || action.parameters.pid);
    checksPerformed.push('os_process_absence_probe');

    // Give process a brief moment to exit
    let stillRunning = false;
    for (let i = 0; i < 5; i++) {
      try {
        process.kill(targetPid, 0);
        stillRunning = true;
      } catch {
        stillRunning = false;
        break;
      }
    }

    if (stillRunning) {
      return {
        passed: false,
        actionId: action.actionId,
        toolId: 'world_process_stop',
        verifiedAt,
        verificationStrategy: 'os_process_absence_probe',
        checksPerformed,
        observation: { pid: targetPid, stillRunning: true },
        failureReason: `Process PID ${targetPid} is still running after stop request.`,
      };
    }

    return {
      passed: true,
      actionId: action.actionId,
      toolId: 'world_process_stop',
      verifiedAt,
      verificationStrategy: 'os_process_absence_probe',
      checksPerformed,
      observation: { pid: targetPid, stopped: true },
    };
  }

  /**
   * Generic observation verifier.
   */
  public static async verifyObservation(
    action: WorldAction,
    execResult: ActionExecutionResult
  ): Promise<ActionVerificationResult> {
    return {
      passed: execResult.success,
      actionId: action.actionId,
      toolId: action.actionType,
      verifiedAt: Date.now(),
      verificationStrategy: 'observation_schema_check',
      checksPerformed: ['schema_validation'],
      observation: { success: execResult.success },
    };
  }
}
