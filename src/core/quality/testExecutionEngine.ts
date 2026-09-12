// src/core/quality/testExecutionEngine.ts
// BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
//
// Governed engine executing in-sandbox test suites and generating deterministic test evidence.
// Động cơ có quản trị thực thi các bộ kiểm thử trong sandbox và tạo bằng chứng kiểm thử tất định.
//
// STRICT INVARIANTS:
// - TEST_SUCCESS != OWNER_APPROVAL
// - TEST_SUCCESS != PROMOTION_AUTHORIZATION
// - TEST != AUTHORITY
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import {
  type TestExecutionId,
  type TestExecutionResult,
  type TestExecutionState,
  type TestResultSummary,
  type CommandExecutionContext,
  createTestExecutionId,
} from './qualityTypes.js';
import { GovernedExecutionEngine, type ExecuteCommandOptions } from './governedExecutionEngine.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';

export class TestExecutionEngine {
  constructor(private readonly executionEngine: GovernedExecutionEngine = new GovernedExecutionEngine()) {}

  /**
   * Computes deterministic SHA-256 hash representing a test execution result.
   * Tính toán mã băm SHA-256 tất định đại diện cho kết quả thực thi kiểm thử.
   */
  public static hashTestResult(
    executionId: string,
    commandId: string,
    exitCode: number,
    stdoutHash: string,
    stderrHash: string,
    summary: TestResultSummary
  ): string {
    const payload = `${executionId}:${commandId}:${exitCode}:${stdoutHash}:${stderrHash}:${summary.suiteCount}:${summary.passedSuites}:${summary.failedSuites}:${summary.assertionCount ?? 0}`;
    return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  }

  /**
   * Extracts test metrics deterministically from stdout without fabrication.
   * Trích xuất các chỉ số kiểm thử tất định từ stdout mà không bịa đặt.
   */
  public static parseTestSummary(stdout: string, exitCode: number): TestResultSummary {
    let suiteCount = 1;
    let passedSuites = exitCode === 0 ? 1 : 0;
    let failedSuites = exitCode !== 0 ? 1 : 0;
    let skippedSuites = 0;
    let assertionCount: number | undefined = undefined;

    // Pattern for regression runner: REGRESSION SUMMARY: (\d+) suites executed
    // Mẫu cho bộ chạy hồi quy: REGRESSION SUMMARY: (\d+) suites executed
    const suitesMatch = stdout.match(/REGRESSION SUMMARY:\s+(\d+)\s+suites executed/i);
    if (suitesMatch) {
      suiteCount = parseInt(suitesMatch[1], 10);
      const failedMatch = stdout.match(/Total Failed Suites:\s+(\d+)/i);
      failedSuites = failedMatch ? parseInt(failedMatch[1], 10) : 0;
      passedSuites = suiteCount - failedSuites;
    }

    // Pattern for assertion counts: (\d+) assertions verified / (\d+) reported assertions
    // Mẫu cho số lượng khẳng định: (\d+) assertions verified / (\d+) reported assertions
    const assertionsMatch = stdout.match(/(\d+)\s+(?:assertions verified|reported assertions)/i);
    if (assertionsMatch) {
      assertionCount = parseInt(assertionsMatch[1], 10);
    }

    return {
      suiteCount,
      passedSuites,
      failedSuites,
      skippedSuites,
      assertionCount,
    };
  }

  /**
   * Executes a governed test suite within an isolated sandbox and returns normalized evidence.
   * Thực thi bộ kiểm thử có quản trị bên trong sandbox cô lập và trả về bằng chứng chuẩn hóa.
   */
  public async executeTest(
    commandId: string,
    context: CommandExecutionContext,
    sandbox: SandboxDescriptor,
    options?: ExecuteCommandOptions
  ): Promise<TestExecutionResult> {
    const executionId = createTestExecutionId(`test_${crypto.randomUUID()}`);
    const executedAt = Date.now();

    const executed = await this.executionEngine.executeCommand(commandId, context, sandbox, options);

    let state: TestExecutionState;
    const summary = TestExecutionEngine.parseTestSummary(executed.stdout, executed.exitCode);

    if (executed.timedOut) {
      state = 'TIMEOUT';
    } else if (executed.interrupted) {
      state = 'INTERRUPTED';
    } else if (executed.exitCode === 0 && summary.failedSuites === 0) {
      state = 'PASSED';
    } else if (summary.passedSuites > 0 && summary.failedSuites > 0) {
      state = 'PARTIAL';
    } else {
      state = 'FAILED';
    }

    const testEvidenceHash = TestExecutionEngine.hashTestResult(
      executionId,
      commandId,
      executed.exitCode,
      executed.stdoutHash,
      executed.stderrHash,
      summary
    );

    return Object.freeze({
      executionId,
      commandId,
      context,
      state,
      exitCode: executed.exitCode,
      summary: Object.freeze(summary),
      stdoutHash: executed.stdoutHash,
      stderrHash: executed.stderrHash,
      durationMs: executed.durationMs,
      testEvidenceHash,
      artifactHashes: Object.freeze({}),
      executedAt,
      reason: state === 'PASSED' ? 'All test suites passed.' : `Tests exited with state ${state} (code ${executed.exitCode}).`,
    });
  }
}
