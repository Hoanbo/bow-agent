// src/core/sandbox/sandboxTypes.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - SANDBOX != AUTHORITY
// - WORKTREE != AUTHORITY
// - DIFF != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

/**
 * Branded identifier for an isolated sandbox.
 * Định danh có thương hiệu cho một sandbox cô lập.
 */
export type SandboxId = string & { readonly __brand: 'SandboxId' };

/**
 * Helper to construct a branded SandboxId.
 * Hàm hỗ trợ tạo SandboxId có thương hiệu.
 */
export function createSandboxId(raw: string): SandboxId {
  return raw as SandboxId;
}

/**
 * Branded identifier for an isolated project worktree.
 * Định danh có thương hiệu cho một worktree dự án cô lập.
 */
export type WorktreeId = string & { readonly __brand: 'WorktreeId' };

/**
 * Helper to construct a branded WorktreeId.
 * Hàm hỗ trợ tạo WorktreeId có thương hiệu.
 */
export function createWorktreeId(raw: string): WorktreeId {
  return raw as WorktreeId;
}

/**
 * Non-semantic, strictly governed sandbox lifecycle states.
 * Các trạng thái vòng đời sandbox được quản trị nghiêm ngặt, phi ngữ nghĩa quyền lực.
 */
export type SandboxState =
  | 'CREATED'
  | 'INITIALIZED'
  | 'ACTIVE'
  | 'MODIFICATION_PENDING'
  | 'VALIDATING'
  | 'REVIEW_PENDING'
  | 'APPROVED'
  | 'EXPORTED'
  | 'ROLLED_BACK'
  | 'DISCARDED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'REVOKED'
  | 'BLOCKED'
  | 'INTERRUPTED';

/**
 * Permitted file operation categories within the sandbox.
 * Các danh mục thao tác tệp được phép trong sandbox.
 */
export type SandboxOperationType =
  | 'CREATE'
  | 'READ'
  | 'UPDATE'
  | 'RENAME'
  | 'DELETE'
  | 'LIST'
  | 'STAT';

/**
 * Structural boundaries and constraints for an isolated sandbox.
 * Các ranh giới cấu trúc và ràng buộc cho một sandbox cô lập.
 */
export interface SandboxScope {
  // Allowed project root paths that the sandbox may target.
  // Các đường dẫn gốc dự án được phép mà sandbox có thể nhắm tới.
  readonly allowedProjectRoots: string[];

  // Permitted operation types within the sandbox.
  // Các loại thao tác được phép trong sandbox.
  readonly allowedOperations: readonly SandboxOperationType[];

  // Maximum number of files permitted in the sandbox.
  // Số lượng tệp tối đa được phép trong sandbox.
  readonly maxFileCount?: number;

  // Maximum total workspace size in bytes.
  // Kích thước không gian làm việc tối đa tính bằng byte.
  readonly maxWorkspaceSizeBytes?: number;

  // Allowed file extensions (e.g. ['.ts', '.json', '.md']).
  // Các phần mở rộng tệp được phép (ví dụ ['.ts', '.json', '.md']).
  readonly allowedFileExtensions?: readonly string[];

  // Explicitly forbidden file patterns or globs.
  // Các mẫu tệp hoặc glob bị cấm rõ ràng.
  readonly deniedFilePatterns?: readonly string[];
}

/**
 * Binding descriptor linking a sandbox to governance entities.
 * Bộ mô tả liên kết một sandbox với các thực thể quản trị.
 */
export interface SandboxBinding {
  readonly sandboxId: SandboxId;
  readonly sessionId: string;
  readonly taskId: string;
  readonly taskGroupId?: string;
  readonly delegationId: string;
  readonly capabilityLeaseId: string;
  readonly agentId: string;
  readonly deviceId: string;
  readonly createdAt: number;
  readonly expiresAt: number;
}

/**
 * Complete runtime descriptor for an isolated sandbox.
 * Bộ mô tả thời gian chạy hoàn chỉnh cho một sandbox cô lập.
 */
export interface SandboxDescriptor {
  readonly id: SandboxId;
  readonly binding: SandboxBinding;
  readonly scope: SandboxScope;
  readonly rootPath: string;
  readonly state: SandboxState;
  readonly stateReason?: string;
  readonly worktreeId?: WorktreeId;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly expiresAt: number;
  readonly isRevoked: boolean;
  readonly isStopped: boolean;
}

/**
 * Input required to create a governed sandbox.
 * Dữ liệu đầu vào cần thiết để tạo một sandbox được quản trị.
 */
export interface CreateSandboxInput {
  readonly sessionId: string;
  readonly taskId: string;
  readonly taskGroupId?: string;
  readonly delegationId: string;
  readonly capabilityLeaseId: string;
  readonly agentId: string;
  readonly deviceId: string;
  readonly projectRoot: string;
  readonly scope: SandboxScope;
  readonly ttlMs: number;
  readonly maxExpiresAt?: number;
}

/**
 * Detailed representation of an individual file operation.
 * Biểu diễn chi tiết của một thao tác tệp đơn lẻ.
 */
export interface SandboxFileOperation {
  readonly operationId: string;
  readonly type: SandboxOperationType;
  readonly path: string;
  readonly targetPath?: string;
  readonly content?: string;
  readonly timestamp: number;
  readonly agentId: string;
  readonly deviceId: string;
  readonly sessionId: string;
  readonly taskId: string;
}

/**
 * Manifest entry for an individual file or directory inside the sandbox.
 * Mục kê khai cho một tệp hoặc thư mục đơn lẻ bên trong sandbox.
 */
export interface SandboxEntry {
  readonly relativePath: string;
  readonly entryType: 'FILE' | 'DIRECTORY';
  readonly sizeBytes: number;
  readonly contentHash?: string;
  readonly mtimeMs: number;
}

/**
 * Deterministic, cryptographically verifiable filesystem manifest.
 * Bảng kê khai hệ thống tệp tất định, có thể kiểm chứng bằng mật mã.
 */
export interface SandboxManifest {
  readonly manifestId: string;
  readonly sandboxId: SandboxId;
  readonly entries: readonly SandboxEntry[];
  readonly manifestHash: string;
  readonly generatedAt: number;
  readonly totalFiles: number;
  readonly totalSizeBytes: number;
}

/**
 * Change type for an isolated diff record.
 * Loại thay đổi cho một bản ghi diff cô lập.
 */
export type SandboxChangeType = 'ADDED' | 'MODIFIED' | 'DELETED' | 'RENAMED';

/**
 * Individual file change within an isolated project worktree.
 * Thay đổi tệp đơn lẻ bên trong một worktree dự án cô lập.
 */
export interface SandboxChange {
  readonly changeType: SandboxChangeType;
  readonly relativePath: string;
  readonly previousHash?: string;
  readonly newHash?: string;
  readonly previousPath?: string;
  readonly sizeChangeBytes?: number;
  readonly agentId: string;
  readonly taskId: string;
  readonly timestamp: number;
  readonly provenance: string;
}

/**
 * Cryptographically hashed, deterministic changeset representing worktree modifications.
 * Tập thay đổi tất định, được băm mật mã đại diện cho các sửa đổi worktree.
 */
export interface SandboxDiff {
  readonly diffId: string;
  readonly sandboxId: SandboxId;
  readonly taskId: string;
  readonly sessionId: string;
  readonly baseManifestHash: string;
  readonly targetManifestHash: string;
  readonly changes: readonly SandboxChange[];
  readonly diffHash: string;
  readonly generatedAt: number;
}

/**
 * Rollback record documenting discarded or reverted modifications.
 * Bản ghi rollback ghi lại các sửa đổi bị hủy bỏ hoặc hoàn tác.
 */
export interface SandboxRollback {
  readonly rollbackId: string;
  readonly sandboxId: SandboxId;
  readonly rolledBackAt: number;
  readonly restoredFilesCount: number;
  readonly removedFilesCount: number;
  readonly reason: string;
  readonly rolledBackBy: string;
}

/**
 * Export record documenting governed commit/export of sandbox modifications.
 * Bản ghi xuất khẩu ghi lại việc commit/xuất các sửa đổi sandbox được quản trị.
 */
export interface SandboxExport {
  readonly exportId: string;
  readonly sandboxId: SandboxId;
  readonly taskId: string;
  readonly sessionId: string;
  readonly manifestHash: string;
  readonly diffHash: string;
  readonly evidenceBundleId?: string;
  readonly exportedAt: number;
  readonly exportedBy: string;
  readonly targetProjectRoot: string;
  readonly status: 'EXPORTED' | 'REJECTED';
}

/**
 * Error and security violation codes for the sandbox subsystem.
 * Các mã lỗi và vi phạm an ninh cho hệ thống con sandbox.
 */
export type SandboxViolationCode =
  | 'SECURITY_VIOLATION'
  | 'PATH_TRAVERSAL_REJECTED'
  | 'ABSOLUTE_PATH_REJECTED'
  | 'CROSS_SESSION_SANDBOX_REJECTED'
  | 'CROSS_SANDBOX_REJECTED'
  | 'FORBIDDEN_WORKSPACE_TARGET'
  | 'UNAUTHORIZED_PROJECT_ROOT'
  | 'USER_STOP_ACTIVE'
  | 'REVOKED_DELEGATION'
  | 'EXPIRED_DELEGATION'
  | 'INVALID_CAPABILITY_LEASE'
  | 'SANDBOX_EXPIRED'
  | 'SANDBOX_NOT_ACTIVE'
  | 'POLICY_VIOLATION'
  | 'ROLLBACK_FAILED'
  | 'EXPORT_NOT_APPROVED'
  | 'SELF_APPROVAL_REJECTED'
  | 'CORRUPTED_STATE_REJECTED'
  | 'FORBIDDEN_CREDENTIAL_PERSISTENCE'
  | 'WORKTREE_SCOPE_CANNOT_EXCEED_SANDBOX';

/**
 * Structured violation record for audit and supervisory logging.
 * Bản ghi vi phạm có cấu trúc phục vụ kiểm toán và ghi nhật ký giám sát.
 */
export interface SandboxViolation {
  readonly violationId: string;
  readonly code: SandboxViolationCode;
  readonly message: string;
  readonly path?: string;
  readonly timestamp: number;
  readonly sessionId: string;
  readonly sandboxId?: SandboxId;
  readonly agentId?: string;
}

/**
 * Custom error class for all governed sandbox operations.
 * Lớp lỗi tùy chỉnh cho tất cả các thao tác sandbox được quản trị.
 */
export class SandboxError extends Error {
  constructor(
    public readonly code: SandboxViolationCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'SandboxError';
  }
}
