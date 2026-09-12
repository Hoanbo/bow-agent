// src/core/sandbox/sandboxFilesystemEngine.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - All filesystem operations MUST pass SandboxPathGuard and SandboxPolicyEngine.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
// - NO eval, NO new Function, NO execSync, NO child_process, NO shell execution.
// - FORBIDDEN_CREDENTIAL_PERSISTENCE: Do NOT persist secrets, tokens, private keys, or passwords.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  type SandboxDescriptor,
  type SandboxEntry,
  type SandboxFileOperation,
  SandboxError,
} from './sandboxTypes.js';
import { SandboxPathGuard } from './sandboxPathGuard.js';
import { SandboxPolicyEngine } from './sandboxPolicyEngine.js';

export interface FileOperationContext {
  readonly sessionId: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly deviceId: string;
}

export class SandboxFilesystemEngine {
  // Staged modifications tracked per sandbox for diff and rollback engines.
  // Các sửa đổi được theo dõi theo từng sandbox phục vụ cho công cụ diff và rollback.
  private stagedChanges = new Map<string, Map<string, { originalContent?: string; currentContent?: string }>>();

  constructor(private readonly policyEngine: SandboxPolicyEngine) {}

  /**
   * Scans content to prevent accidental persistence of credentials, tokens, or private keys.
   * Quét nội dung để ngăn chặn việc vô tình lưu giữ thông tin xác thực, token hoặc khóa riêng tư.
   */
  private assertNoForbiddenCredentials(content: string, filePath: string): void {
    const lower = content.toLowerCase();
    const forbiddenPatterns = [
      'bearer ',
      'authorization: ',
      'private_key',
      'begin rsa private key',
      'begin openssh private key',
      'begin ec private key',
      'humangate_approval',
      'admin_secret',
      'client_secret',
    ];

    for (const pattern of forbiddenPatterns) {
      if (lower.includes(pattern)) {
        throw new SandboxError(
          'FORBIDDEN_CREDENTIAL_PERSISTENCE',
          `Forbidden credential or authorization token pattern detected in file "${filePath}": "${pattern}".`
        );
      }
    }
  }

  /**
   * Calculates SHA-256 hash of a file string content.
   * Tính toán mã băm SHA-256 cho nội dung chuỗi của tệp.
   */
  public static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Initializes staging tracking map for a given sandbox.
   * Khởi tạo bản đồ theo dõi tạm thời (staging) cho một sandbox nhất định.
   */
  private getStagingMap(sandboxId: string): Map<string, { originalContent?: string; currentContent?: string }> {
    let map = this.stagedChanges.get(sandboxId);
    if (!map) {
      map = new Map();
      this.stagedChanges.set(sandboxId, map);
    }
    return map;
  }

  /**
   * Computes file count and total size within the sandbox root without triggering LIST policy validation.
   * Tính toán số lượng tệp và tổng kích thước trong thư mục gốc sandbox mà không kích hoạt xác thực chính sách LIST.
   */
  private getSandboxMetrics(rootPath: string): { fileCount: number; totalBytes: number } {
    if (!fs.existsSync(rootPath)) {
      return { fileCount: 0, totalBytes: 0 };
    }
    let fileCount = 0;
    let totalBytes = 0;
    const walk = (dir: string): void => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const itemAbs = path.join(dir, item.name);
        if (item.isDirectory()) {
          walk(itemAbs);
        } else if (item.isFile()) {
          fileCount++;
          totalBytes += fs.statSync(itemAbs).size;
        }
      }
    };
    walk(rootPath);
    return { fileCount, totalBytes };
  }

  /**
   * Creates a new file inside the governed sandbox.
   * Tạo một tệp mới bên trong sandbox được quản trị.
   */
  public createFile(
    sandbox: SandboxDescriptor,
    relativePath: string,
    content: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    // 1. Path containment check.
    // 1. Kiểm tra bao chứa đường dẫn.
    const { relativePath: safeRel, absolutePath: safeAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, relativePath);

    // 2. Prevent credential persistence.
    // 2. Ngăn chặn lưu trữ thông tin xác thực nhạy cảm.
    this.assertNoForbiddenCredentials(content, safeRel);

    // 3. Current resource metrics for policy check.
    // 3. Số liệu tài nguyên hiện tại để kiểm tra chính sách.
    const metrics = this.getSandboxMetrics(sandbox.rootPath);

    // 4. Policy evaluation.
    // 4. Đánh giá chính sách.
    this.policyEngine.validateOperation({
      sandbox,
      operationType: 'CREATE',
      relativePath: safeRel,
      sessionId: context.sessionId,
      taskId: context.taskId,
      agentId: context.agentId,
      deviceId: context.deviceId,
      currentFileCount: metrics.fileCount,
      currentSizeBytes: metrics.totalBytes,
      incomingPayloadSizeBytes: Buffer.byteLength(content, 'utf8'),
    });

    // 5. Ensure target does not already exist.
    // 5. Đảm bảo mục tiêu chưa tồn tại trước đó.
    if (fs.existsSync(safeAbs)) {
      throw new SandboxError(
        'POLICY_VIOLATION',
        `Cannot create file: "${safeRel}" already exists in sandbox "${sandbox.id}".`
      );
    }

    // 6. Ensure parent directory exists.
    // 6. Đảm bảo thư mục cha tồn tại.
    const parentDir = path.dirname(safeAbs);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // 7. Write file to isolated disk location.
    // 7. Ghi tệp vào vị trí đĩa cô lập.
    fs.writeFileSync(safeAbs, content, 'utf8');

    // 8. Record in staging for diff and rollback.
    // 8. Ghi lại vào staging phục vụ diff và rollback.
    const staging = this.getStagingMap(sandbox.id);
    staging.set(safeRel, {
      originalContent: undefined,
      currentContent: content,
    });

    return {
      operationId: `op_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'CREATE',
      path: safeRel,
      content,
      timestamp: Date.now(),
      agentId: context.agentId,
      deviceId: context.deviceId,
      sessionId: context.sessionId,
      taskId: context.taskId,
    };
  }

  /**
   * Reads content of an existing file within the sandbox.
   * Đọc nội dung của một tệp hiện có bên trong sandbox.
   */
  public readFile(
    sandbox: SandboxDescriptor,
    relativePath: string,
    context: FileOperationContext
  ): string {
    const { relativePath: safeRel, absolutePath: safeAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, relativePath);

    this.policyEngine.validateOperation({
      sandbox,
      operationType: 'READ',
      relativePath: safeRel,
      sessionId: context.sessionId,
      taskId: context.taskId,
      agentId: context.agentId,
      deviceId: context.deviceId,
    });

    if (!fs.existsSync(safeAbs)) {
      throw new SandboxError('POLICY_VIOLATION', `File "${safeRel}" does not exist in sandbox.`);
    }

    const stat = fs.statSync(safeAbs);
    if (stat.isDirectory()) {
      throw new SandboxError('POLICY_VIOLATION', `Target "${safeRel}" is a directory, not a file.`);
    }

    return fs.readFileSync(safeAbs, 'utf8');
  }

  /**
   * Updates content of an existing file within the sandbox.
   * Cập nhật nội dung của một tệp hiện có bên trong sandbox.
   */
  public updateFile(
    sandbox: SandboxDescriptor,
    relativePath: string,
    content: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    const { relativePath: safeRel, absolutePath: safeAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, relativePath);

    this.assertNoForbiddenCredentials(content, safeRel);

    const metrics = this.getSandboxMetrics(sandbox.rootPath);
    const existingBytes = fs.existsSync(safeAbs) ? fs.statSync(safeAbs).size : 0;
    const totalBytes = metrics.totalBytes - existingBytes;

    this.policyEngine.validateOperation({
      sandbox,
      operationType: 'UPDATE',
      relativePath: safeRel,
      sessionId: context.sessionId,
      taskId: context.taskId,
      agentId: context.agentId,
      deviceId: context.deviceId,
      currentFileCount: metrics.fileCount,
      currentSizeBytes: totalBytes,
      incomingPayloadSizeBytes: Buffer.byteLength(content, 'utf8'),
    });

    if (!fs.existsSync(safeAbs)) {
      throw new SandboxError('POLICY_VIOLATION', `Cannot update non-existent file: "${safeRel}".`);
    }

    const original = fs.readFileSync(safeAbs, 'utf8');

    fs.writeFileSync(safeAbs, content, 'utf8');

    const staging = this.getStagingMap(sandbox.id);
    const existingRecord = staging.get(safeRel);
    staging.set(safeRel, {
      originalContent: existingRecord ? existingRecord.originalContent : original,
      currentContent: content,
    });

    return {
      operationId: `op_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'UPDATE',
      path: safeRel,
      content,
      timestamp: Date.now(),
      agentId: context.agentId,
      deviceId: context.deviceId,
      sessionId: context.sessionId,
      taskId: context.taskId,
    };
  }

  /**
   * Renames a file within the sandbox boundary.
   * Đổi tên một tệp bên trong ranh giới sandbox.
   */
  public renameFile(
    sandbox: SandboxDescriptor,
    oldRelativePath: string,
    newRelativePath: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    const { relativePath: safeOldRel, absolutePath: safeOldAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, oldRelativePath);
    const { relativePath: safeNewRel, absolutePath: safeNewAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, newRelativePath);

    this.policyEngine.validateOperation({
      sandbox,
      operationType: 'RENAME',
      relativePath: safeOldRel,
      targetPath: safeNewRel,
      sessionId: context.sessionId,
      taskId: context.taskId,
      agentId: context.agentId,
      deviceId: context.deviceId,
    });

    if (!fs.existsSync(safeOldAbs)) {
      throw new SandboxError('POLICY_VIOLATION', `Source file "${safeOldRel}" does not exist.`);
    }

    if (fs.existsSync(safeNewAbs)) {
      throw new SandboxError('POLICY_VIOLATION', `Target path "${safeNewRel}" already exists.`);
    }

    const parentDir = path.dirname(safeNewAbs);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const originalContent = fs.readFileSync(safeOldAbs, 'utf8');
    fs.renameSync(safeOldAbs, safeNewAbs);

    const staging = this.getStagingMap(sandbox.id);
    staging.set(safeOldRel, { originalContent, currentContent: undefined });
    staging.set(safeNewRel, { originalContent: undefined, currentContent: originalContent });

    return {
      operationId: `op_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'RENAME',
      path: safeOldRel,
      targetPath: safeNewRel,
      timestamp: Date.now(),
      agentId: context.agentId,
      deviceId: context.deviceId,
      sessionId: context.sessionId,
      taskId: context.taskId,
    };
  }

  /**
   * Deletes a file within the sandbox boundary.
   * Xóa một tệp bên trong ranh giới sandbox.
   */
  public deleteFile(
    sandbox: SandboxDescriptor,
    relativePath: string,
    context: FileOperationContext
  ): SandboxFileOperation {
    const { relativePath: safeRel, absolutePath: safeAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, relativePath);

    this.policyEngine.validateOperation({
      sandbox,
      operationType: 'DELETE',
      relativePath: safeRel,
      sessionId: context.sessionId,
      taskId: context.taskId,
      agentId: context.agentId,
      deviceId: context.deviceId,
    });

    if (!fs.existsSync(safeAbs)) {
      throw new SandboxError('POLICY_VIOLATION', `Cannot delete non-existent file: "${safeRel}".`);
    }

    const originalContent = fs.readFileSync(safeAbs, 'utf8');
    fs.unlinkSync(safeAbs);

    const staging = this.getStagingMap(sandbox.id);
    const existing = staging.get(safeRel);
    staging.set(safeRel, {
      originalContent: existing ? existing.originalContent : originalContent,
      currentContent: undefined,
    });

    return {
      operationId: `op_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'DELETE',
      path: safeRel,
      timestamp: Date.now(),
      agentId: context.agentId,
      deviceId: context.deviceId,
      sessionId: context.sessionId,
      taskId: context.taskId,
    };
  }

  /**
   * Lists all files recursively inside a relative directory within the sandbox.
   * Liệt kê đệ quy tất cả các tệp bên trong một thư mục tương đối thuộc sandbox.
   */
  public listFiles(
    sandbox: SandboxDescriptor,
    relativeDir: string = '',
    context: FileOperationContext
  ): SandboxEntry[] {
    const targetDir = relativeDir === '' ? '.' : relativeDir;
    const { relativePath: safeRel, absolutePath: safeAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, targetDir);

    this.policyEngine.validateOperation({
      sandbox,
      operationType: 'LIST',
      relativePath: safeRel,
      sessionId: context.sessionId,
      taskId: context.taskId,
      agentId: context.agentId,
      deviceId: context.deviceId,
    });

    if (!fs.existsSync(safeAbs)) {
      return [];
    }

    const results: SandboxEntry[] = [];

    const walk = (dir: string): void => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const itemAbs = path.join(dir, item.name);
        // Validate containment for each traversed item.
        // Xác minh tính bao chứa cho từng phần tử được duyệt.
        const { relativePath: itemRel } = SandboxPathGuard.resolveAndAssertContainedPath(
          sandbox.rootPath,
          path.relative(sandbox.rootPath, itemAbs)
        );

        if (item.isDirectory()) {
          results.push({
            relativePath: itemRel,
            entryType: 'DIRECTORY',
            sizeBytes: 0,
            mtimeMs: fs.statSync(itemAbs).mtimeMs,
          });
          walk(itemAbs);
        } else if (item.isFile()) {
          const stat = fs.statSync(itemAbs);
          const content = fs.readFileSync(itemAbs, 'utf8');
          results.push({
            relativePath: itemRel,
            entryType: 'FILE',
            sizeBytes: stat.size,
            contentHash: SandboxFilesystemEngine.hashContent(content),
            mtimeMs: stat.mtimeMs,
          });
        }
      }
    };

    walk(safeAbs);
    return results;
  }

  /**
   * Retrieves file stat information inside the sandbox.
   * Lấy thông tin thống kê stat của tệp bên trong sandbox.
   */
  public statFile(
    sandbox: SandboxDescriptor,
    relativePath: string,
    context: FileOperationContext
  ): SandboxEntry {
    const { relativePath: safeRel, absolutePath: safeAbs } =
      SandboxPathGuard.resolveAndAssertContainedPath(sandbox.rootPath, relativePath);

    this.policyEngine.validateOperation({
      sandbox,
      operationType: 'STAT',
      relativePath: safeRel,
      sessionId: context.sessionId,
      taskId: context.taskId,
      agentId: context.agentId,
      deviceId: context.deviceId,
    });

    if (!fs.existsSync(safeAbs)) {
      throw new SandboxError('POLICY_VIOLATION', `File "${safeRel}" does not exist.`);
    }

    const stat = fs.statSync(safeAbs);
    const isDir = stat.isDirectory();
    let contentHash: string | undefined;

    if (!isDir) {
      const content = fs.readFileSync(safeAbs, 'utf8');
      contentHash = SandboxFilesystemEngine.hashContent(content);
    }

    return {
      relativePath: safeRel,
      entryType: isDir ? 'DIRECTORY' : 'FILE',
      sizeBytes: stat.size,
      contentHash,
      mtimeMs: stat.mtimeMs,
    };
  }

  /**
   * Retrieves staged changes for a sandbox.
   * Lấy danh sách các thay đổi tạm thời của một sandbox.
   */
  public getStagedChanges(sandboxId: string): Map<string, { originalContent?: string; currentContent?: string }> {
    return new Map(this.getStagingMap(sandboxId));
  }

  /**
   * Clears staging tracking for a sandbox.
   * Xóa theo dõi staging cho một sandbox.
   */
  public clearStaging(sandboxId: string): void {
    this.stagedChanges.delete(sandboxId);
  }
}
