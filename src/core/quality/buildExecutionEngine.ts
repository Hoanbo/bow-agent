// src/core/quality/buildExecutionEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Governed engine executing in-sandbox project builds and producing deterministic build evidence.
// Động cơ có quản trị thực thi dựng dự án trong sandbox và tạo bằng chứng bản dựng tất định.
//
// STRICT INVARIANTS:
// - BUILD_SUCCESS != OWNER_APPROVAL
// - BUILD_SUCCESS != PROMOTION_AUTHORIZATION
// - BUILD != AUTHORITY
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type BuildExecutionId,
  type BuildExecutionResult,
  type BuildExecutionState,
  type BuildMilestone,
  type CommandExecutionContext,
  createBuildExecutionId,
} from './qualityTypes.js';
import { GovernedExecutionEngine, type ExecuteCommandOptions } from './governedExecutionEngine.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';

export class BuildExecutionEngine {
  constructor(private readonly executionEngine: GovernedExecutionEngine = new GovernedExecutionEngine()) {}

  /**
   * Computes deterministic SHA-256 hash representing a build execution result.
   * Tính toán mã băm SHA-256 tất định đại diện cho kết quả thực thi bản dựng.
   */
  public static hashBuildResult(
    executionId: string,
    commandId: string,
    exitCode: number,
    stdoutHash: string,
    stderrHash: string,
    artifactCount: number
  ): string {
    const payload = `${executionId}:${commandId}:${exitCode}:${stdoutHash}:${stderrHash}:${artifactCount}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Executes a governed build command within an isolated sandbox and returns normalized evidence.
   * Thực thi lệnh dựng có quản trị bên trong sandbox cô lập và trả về bằng chứng chuẩn hóa.
   */
  public async executeBuild(
    commandId: string,
    context: CommandExecutionContext,
    sandbox: SandboxDescriptor,
    options?: ExecuteCommandOptions
  ): Promise<BuildExecutionResult> {
    const executionId = createBuildExecutionId(`build_${crypto.randomUUID()}`);
    const executedAt = Date.now();

    const executed = await this.executionEngine.executeCommand(commandId, context, sandbox, options);

    let state: BuildExecutionState;
    let milestone: BuildMilestone;

    if (executed.timedOut) {
      state = 'TIMEOUT';
      milestone = 'BUILD_FAILED';
    } else if (executed.interrupted) {
      state = 'INTERRUPTED';
      milestone = 'BUILD_FAILED';
    } else if (executed.exitCode === 0) {
      state = 'PASSED';
      milestone = 'BUILD_VERIFIED';
    } else {
      state = 'FAILED';
      milestone = 'BUILD_FAILED';
    }

    // Build artifact hashes
    // Mã băm các tạo phẩm bản dựng
    const artifactHashes: Record<string, string> = {};
    for (const artifact of executed.artifactsProduced) {
      artifactHashes[artifact] = crypto.createHash('sha256').update(artifact, 'utf8').digest('hex');
    }

    const buildEvidenceHash = BuildExecutionEngine.hashBuildResult(
      executionId,
      commandId,
      executed.exitCode,
      executed.stdoutHash,
      executed.stderrHash,
      executed.artifactsProduced.length
    );

    return Object.freeze({
      executionId,
      commandId,
      context,
      state,
      milestone,
      exitCode: executed.exitCode,
      stdoutHash: executed.stdoutHash,
      stderrHash: executed.stderrHash,
      durationMs: executed.durationMs,
      buildEvidenceHash,
      artifactHashes: Object.freeze(artifactHashes),
      executedAt,
      reason: state === 'PASSED' ? 'Build completed successfully.' : `Build exited with code ${executed.exitCode}.`,
    });
  }
}
