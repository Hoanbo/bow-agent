// src/core/deployment/deploymentExecutionEngine.ts
// BOWCON V4.0 — MS-1.3.52: GOVERNED PRODUCTION DEPLOYMENT & CANARY VERIFICATION PIPELINE
//
// Governed mutation boundary for controlled deployment targets.
// Ranh giới thay đổi có quản trị cho các mục tiêu triển khai có kiểm soát.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - CANARY_PASS != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - ZERO SHELL EXECUTION (eval, execSync, spawn, child_process, SSH strictly forbidden).
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with PROTECTED_WORKSPACE_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  type DeploymentRequest,
  type DeploymentCandidate,
  type DeploymentBackupEntry,
  type RolloutRingLevel,
  DeploymentError,
} from './deploymentTypes.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import {
  WorldActionAuthorizationEngine,
  globalWorldActionAuth,
} from '../world-action/worldActionAuthorization.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export interface ExecuteDeploymentMutationInput {
  readonly request: DeploymentRequest;
  readonly candidate: DeploymentCandidate;
  readonly token: AuthorizationToken;
  readonly targetRing: RolloutRingLevel;
  readonly isUserStopActive: boolean;
  readonly isRevoked: boolean;
  readonly backupDir: string;
}

export interface DeploymentMutationResult {
  readonly deployedFiles: readonly string[];
  readonly backups: readonly DeploymentBackupEntry[];
  readonly preDeploymentManifestHash: string;
  readonly postDeploymentManifestHash: string;
  readonly executedAt: number;
}

export class DeploymentExecutionEngine {
  private consumedTokenIds = new Set<string>();

  constructor(
    private readonly authEngine: WorldActionAuthorizationEngine = globalWorldActionAuth
  ) {}

  /**
   * Asserts that a target path does not touch the protected workspace C:\BOW\shopofbow.
   * Khẳng định rằng đường dẫn mục tiêu không chạm vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
   */
  public assertProtectedWorkspaceIsolation(targetPath: string): void {
    SandboxPathGuard.assertNotProtectedWorkspace(targetPath);

    const normalized = path.normalize(targetPath).toLowerCase();
    if (
      normalized.includes('shopofbow') ||
      normalized.includes('c:\\bow\\shopofbow') ||
      normalized.includes('c:/bow/shopofbow')
    ) {
      throw new DeploymentError(
        'PROTECTED_WORKSPACE_VIOLATION',
        `Target path "${targetPath}" references permanently protected workspace C:\\BOW\\shopofbow.`
      );
    }
  }

  /**
   * Computes a deterministic SHA-256 tree manifest for files in a directory.
   * Tính toán mã băm cây biểu kê SHA-256 xác định cho các tệp trong một thư mục.
   */
  public computeDirectoryManifest(dirPath: string): {
    readonly files: readonly { readonly relativePath: string; readonly sha256: string }[];
    readonly manifestHash: string;
  } {
    if (!fs.existsSync(dirPath)) {
      return { files: [], manifestHash: crypto.createHash('sha256').update('EMPTY').digest('hex') };
    }

    const results: { relativePath: string; sha256: string }[] = [];

    const scan = (currentDir: string, root: string): void => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(currentDir, entry.name);
        const rel = path.relative(root, full).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          scan(full, root);
        } else if (entry.isFile()) {
          const content = fs.readFileSync(full);
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          results.push({ relativePath: rel, sha256: hash });
        }
      }
    };

    scan(dirPath, dirPath);
    results.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

    const manifestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(results))
      .digest('hex');

    return { files: results, manifestHash };
  }

  /**
   * Validates and consumes a single-use authorization token.
   * Xác thực và tiêu thụ một mã ủy quyền sử dụng một lần.
   */
  public consumeToken(token: AuthorizationToken, request: DeploymentRequest): void {
    // 1. Anti-replay check.
    // 1. Kiểm tra chống phát lại.
    if (this.consumedTokenIds.has(token.tokenId)) {
      throw new DeploymentError(
        'TOKEN_REPLAY_REJECTED',
        `Single-use execution token "${token.tokenId}" has already been consumed.`
      );
    }

    // 2. Token expiration check.
    // 2. Kiểm tra thời hạn mã token.
    if (Date.now() > token.expiresAt) {
      throw new DeploymentError(
        'EXPIRED_AUTHORIZATION',
        `Authorization token "${token.tokenId}" expired at ${token.expiresAt}.`
      );
    }

    // 3. Action and target binding check.
    // 3. Kiểm tra ràng buộc hành động và mục tiêu.
    if (token.target && token.target !== request.targetId) {
      throw new DeploymentError(
        'INVALID_AUTHORIZATION',
        `Token target "${token.target}" does not match request targetId "${request.targetId}".`
      );
    }

    // 4. Session and task binding check.
    // 4. Kiểm tra ràng buộc phiên và nhiệm vụ.
    if (token.sessionId && token.sessionId !== request.sessionId) {
      throw new DeploymentError(
        'INVALID_AUTHORIZATION',
        `Token sessionId "${token.sessionId}" does not match request sessionId "${request.sessionId}".`
      );
    }

    if (token.taskId && token.taskId !== request.taskId) {
      throw new DeploymentError(
        'INVALID_AUTHORIZATION',
        `Token taskId "${token.taskId}" does not match request taskId "${request.taskId}".`
      );
    }

    // 5. Mark token as consumed immediately.
    // 5. Đánh dấu token đã được tiêu thụ ngay lập tức.
    this.consumedTokenIds.add(token.tokenId);
  }

  /**
   * Executes governed deployment mutation to the authorized target directory.
   * Thực thi thay đổi triển khai có quản trị vào thư mục mục tiêu được ủy quyền.
   */
  public executeMutation(input: ExecuteDeploymentMutationInput): DeploymentMutationResult {
    // 1. Enforce emergency USER_STOP supremacy.
    // 1. Thực thi tính tối thượng của USER_STOP khẩn cấp.
    if (input.isUserStopActive) {
      throw new DeploymentError('USER_STOP_ACTIVE', 'Mutation halted: USER_STOP is active.');
    }

    // 2. Enforce REVOCATION supremacy.
    // 2. Thực thi tính tối thượng của THU HỒI QUYỀN.
    if (input.isRevoked) {
      throw new DeploymentError('REVOCATION_ACTIVE', 'Mutation halted: REVOCATION is active.');
    }

    // 3. Validate and consume single-use authorization token.
    // 3. Xác thực và tiêu thụ mã ủy quyền sử dụng một lần.
    this.consumeToken(input.token, input.request);

    const targetRoot = input.candidate.target.rootDirectory;
    this.assertProtectedWorkspaceIsolation(targetRoot);

    if (!fs.existsSync(targetRoot)) {
      fs.mkdirSync(targetRoot, { recursive: true });
    }

    // 4. Capture pre-deployment manifest and atomic backups.
    // 4. Ghi nhận biểu kê trước triển khai và sao lưu nguyên tử.
    const preManifest = this.computeDirectoryManifest(targetRoot);
    const backups: DeploymentBackupEntry[] = [];

    if (!fs.existsSync(input.backupDir)) {
      fs.mkdirSync(input.backupDir, { recursive: true });
    }

    // 5. Copy artifacts from candidate artifactsDirectory to targetRoot.
    // 5. Sao chép các tệp tạo tác từ artifactsDirectory của ứng viên sang targetRoot.
    const sourceDir = input.candidate.artifactsDirectory;
    if (!fs.existsSync(sourceDir)) {
      throw new DeploymentError(
        'MUTATION_FAILED',
        `Candidate artifactsDirectory does not exist: "${sourceDir}".`
      );
    }

    const deployedFiles: string[] = [];

    for (const artifactRel of input.candidate.expectedArtifacts) {
      const srcFile = path.join(sourceDir, artifactRel);
      const destFile = path.join(targetRoot, artifactRel);

      if (!fs.existsSync(srcFile)) {
        throw new DeploymentError(
          'MUTATION_FAILED',
          `Expected candidate artifact missing from source: "${srcFile}".`
        );
      }

      // Check if existing file in target needs backup.
      // Kiểm tra xem tệp hiện có trong mục tiêu có cần sao lưu không.
      if (fs.existsSync(destFile)) {
        const existingContent = fs.readFileSync(destFile);
        const existingHash = crypto.createHash('sha256').update(existingContent).digest('hex');
        const backupFile = path.join(input.backupDir, `${artifactRel}.${existingHash}.bak`);
        const backupFileDir = path.dirname(backupFile);
        if (!fs.existsSync(backupFileDir)) {
          fs.mkdirSync(backupFileDir, { recursive: true });
        }
        fs.writeFileSync(backupFile, existingContent);
        backups.push({
          relativePath: artifactRel,
          backupPath: backupFile,
          sha256: existingHash,
        });
      }

      const destDir = path.dirname(destFile);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      fs.copyFileSync(srcFile, destFile);
      deployedFiles.push(artifactRel);
    }

    // Write a deployment marker metadata file in target.
    // Ghi tệp siêu dữ liệu đánh dấu triển khai trong mục tiêu.
    const markerFile = path.join(targetRoot, '.bowcon_deployment.json');
    const markerContent = JSON.stringify(
      {
        deploymentId: input.request.deploymentId,
        candidateId: input.candidate.candidateId,
        ringLevel: input.targetRing,
        deployedAt: Date.now(),
      },
      null,
      2
    );
    fs.writeFileSync(markerFile, markerContent, 'utf-8');
    deployedFiles.push('.bowcon_deployment.json');

    // 6. Compute post-deployment manifest.
    // 6. Tính toán biểu kê sau triển khai.
    const postManifest = this.computeDirectoryManifest(targetRoot);

    return {
      deployedFiles,
      backups,
      preDeploymentManifestHash: preManifest.manifestHash,
      postDeploymentManifestHash: postManifest.manifestHash,
      executedAt: Date.now(),
    };
  }
}
