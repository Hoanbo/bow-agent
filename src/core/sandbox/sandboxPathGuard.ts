// src/core/sandbox/sandboxPathGuard.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
// - NEVER trust raw agent-provided filesystem paths.
// - All containment checks fail closed.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import path from 'node:path';
import fs from 'node:fs';
import { SandboxError } from './sandboxTypes.js';

export class SandboxPathGuard {
  // Canonical normalized protected workspace substrings.
  // Các chuỗi con đại diện cho không gian làm việc được bảo vệ chuẩn hóa.
  private static readonly FORBIDDEN_WORKSPACE_PATTERNS = [
    'c:/bow/shopofbow',
    'c:\\bow\\shopofbow',
    '/bow/shopofbow',
    '\\bow\\shopofbow',
    'shopofbow',
  ];

  /**
   * Asserts that a path string does not reference or target the protected workspace C:\BOW\shopofbow.
   * Khẳng định rằng chuỗi đường dẫn không tham chiếu hoặc nhắm tới không gian làm việc được bảo vệ C:\BOW\shopofbow.
   */
  public static assertNotProtectedWorkspace(rawPath: string): void {
    if (!rawPath) return;

    const normalized = rawPath.toLowerCase().replace(/\\/g, '/');

    for (const pattern of this.FORBIDDEN_WORKSPACE_PATTERNS) {
      const normalizedPattern = pattern.toLowerCase().replace(/\\/g, '/');
      if (normalized.includes(normalizedPattern)) {
        // Strict invariant: immediate fail-closed SECURITY_VIOLATION without reading or touching the target.
        // Bất biến nghiêm ngặt: đóng thất bại ngay lập tức với SECURITY_VIOLATION mà không đọc hay chạm tới đích.
        throw new SandboxError(
          'SECURITY_VIOLATION',
          `Access to protected workspace C:\\BOW\\shopofbow is permanently forbidden: "${rawPath}"`
        );
      }
    }
  }

  /**
   * Validates and canonicalizes a relative or nested path within a designated sandbox root.
   * Returns the safe normalized relative path and the absolute contained path.
   *
   * Xác thực và chuẩn hóa đường dẫn tương đối hoặc lồng nhau bên trong thư mục gốc sandbox được chỉ định.
   * Trả về đường dẫn tương đối an toàn đã chuẩn hóa và đường dẫn tuyệt đối được chứa bên trong.
   */
  public static resolveAndAssertContainedPath(
    sandboxRoot: string,
    rawRelativePath: string
  ): { relativePath: string; absolutePath: string } {
    // 1. Guard against empty or whitespace input.
    // 1. Bảo vệ chống lại đầu vào trống hoặc chỉ chứa khoảng trắng.
    if (!rawRelativePath || typeof rawRelativePath !== 'string' || rawRelativePath.trim() === '') {
      throw new SandboxError('PATH_TRAVERSAL_REJECTED', 'Path cannot be empty or blank.');
    }

    // 2. Reject null byte injection immediately.
    // 2. Từ chối chèn byte rỗng (null byte) ngay lập tức.
    if (rawRelativePath.includes('\0')) {
      throw new SandboxError('SECURITY_VIOLATION', 'Null byte injection detected in path.');
    }

    // 3. Reject URL-encoded traversal patterns (%2e%2e, %2f, %5c).
    // 3. Từ chối các mẫu duyệt đường dẫn được mã hóa URL (%2e%2e, %2f, %5c).
    const lowerRaw = rawRelativePath.toLowerCase();
    if (
      lowerRaw.includes('%2e%2e') ||
      lowerRaw.includes('%2f') ||
      lowerRaw.includes('%5c') ||
      lowerRaw.includes('%25')
    ) {
      throw new SandboxError('PATH_TRAVERSAL_REJECTED', 'Encoded path traversal sequences are forbidden.');
    }

    // 4. Assert no target touches protected workspace C:\BOW\shopofbow.
    // 4. Khẳng định không có mục tiêu nào chạm tới không gian làm việc được bảo vệ C:\BOW\shopofbow.
    this.assertNotProtectedWorkspace(sandboxRoot);
    this.assertNotProtectedWorkspace(rawRelativePath);

    // 5. Reject UNC paths (\\server\share, //server/share) and device paths (\\.\, \\?\).
    // 5. Từ chối các đường dẫn UNC và đường dẫn thiết bị hệ thống.
    if (
      rawRelativePath.startsWith('\\\\') ||
      rawRelativePath.startsWith('//') ||
      rawRelativePath.startsWith('\\\\?\\') ||
      rawRelativePath.startsWith('\\\\.\\')
    ) {
      throw new SandboxError('ABSOLUTE_PATH_REJECTED', 'UNC and device paths are forbidden in sandbox.');
    }

    // 6. Reject absolute drive paths or root paths provided as relative paths (e.g. C:\foo, /etc/passwd).
    // 6. Từ chối các đường dẫn ổ đĩa tuyệt đối hoặc đường dẫn gốc hệ điều hành được truyền như đường dẫn tương đối.
    if (path.isAbsolute(rawRelativePath) || /^[a-zA-Z]:[\\/]/.test(rawRelativePath)) {
      throw new SandboxError(
        'ABSOLUTE_PATH_REJECTED',
        `Absolute paths outside sandbox root are forbidden: "${rawRelativePath}"`
      );
    }

    // 7. Check for raw traversal tokens before normalization.
    // 7. Kiểm tra các mã token duyệt ngược trước khi chuẩn hóa.
    const segments = rawRelativePath.replace(/\\/g, '/').split('/');
    for (const segment of segments) {
      if (segment === '..' || segment === '.') {
        if (segment === '..') {
          throw new SandboxError(
            'PATH_TRAVERSAL_REJECTED',
            `Path traversal segment ".." detected in "${rawRelativePath}"`
          );
        }
      }
    }

    // 8. Canonicalize paths and verify root containment.
    // 8. Chuẩn hóa đường dẫn và xác minh tính bao chứa bên trong thư mục gốc.
    const resolvedRoot = path.resolve(sandboxRoot);
    const resolvedAbsolute = path.resolve(resolvedRoot, rawRelativePath);

    // Re-verify that resolved absolute target does not target protected workspace.
    // Xác minh lại rằng mục tiêu tuyệt đối đã phân giải không nhắm vào không gian làm việc được bảo vệ.
    this.assertNotProtectedWorkspace(resolvedAbsolute);

    // Normalized root and target for boundary comparison.
    // Chuẩn hóa thư mục gốc và mục tiêu để so sánh ranh giới bao chứa.
    const normalizedRoot = path.normalize(resolvedRoot).toLowerCase();
    const normalizedAbsolute = path.normalize(resolvedAbsolute).toLowerCase();

    // Check if resolved path is contained within sandbox root.
    // Kiểm tra xem đường dẫn đã phân giải có nằm hoàn toàn bên trong thư mục gốc sandbox không.
    const isContained =
      normalizedAbsolute === normalizedRoot ||
      normalizedAbsolute.startsWith(normalizedRoot + path.sep.toLowerCase());

    if (!isContained) {
      throw new SandboxError(
        'PATH_TRAVERSAL_REJECTED',
        `Resolved path "${resolvedAbsolute}" escapes sandbox root "${resolvedRoot}".`
      );
    }

    // 9. Symlink and junction escape check (if file or directory already exists on disk).
    // 9. Kiểm tra thoát liên kết mềm (symlink) và junction (nếu tệp hoặc thư mục đã tồn tại trên đĩa).
    if (fs.existsSync(resolvedAbsolute)) {
      try {
        const realTargetPath = fs.realpathSync(resolvedAbsolute);
        this.assertNotProtectedWorkspace(realTargetPath);

        const normalizedRealTarget = path.normalize(realTargetPath).toLowerCase();
        const isRealContained =
          normalizedRealTarget === normalizedRoot ||
          normalizedRealTarget.startsWith(normalizedRoot + path.sep.toLowerCase());

        if (!isRealContained) {
          throw new SandboxError(
            'SECURITY_VIOLATION',
            `Symlink or junction target "${realTargetPath}" escapes sandbox root "${resolvedRoot}".`
          );
        }
      } catch (err: any) {
        if (err instanceof SandboxError) throw err;
        // If realpath fails due to permissions or broken link, fail closed.
        // Nếu realpath thất bại do phân quyền hoặc liên kết hỏng, đóng thất bại ngay.
        throw new SandboxError(
          'SECURITY_VIOLATION',
          `Cannot resolve realpath for "${resolvedAbsolute}": ${err.message}`
        );
      }
    }

    // Compute canonical relative path from root.
    // Tính toán đường dẫn tương đối chuẩn tắc từ thư mục gốc.
    const cleanRelative = path.relative(resolvedRoot, resolvedAbsolute).replace(/\\/g, '/');

    return {
      relativePath: cleanRelative,
      absolutePath: resolvedAbsolute,
    };
  }
}
