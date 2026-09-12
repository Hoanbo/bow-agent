import { type SandboxId, type WorktreeId, type SandboxDescriptor, type SandboxScope } from './sandboxTypes.js';
export interface WorktreeDescriptor {
    readonly worktreeId: WorktreeId;
    readonly sandboxId: SandboxId;
    readonly sessionId: string;
    readonly taskId: string;
    readonly taskGroupId?: string;
    readonly worktreeName: string;
    readonly rootPath: string;
    readonly scope: SandboxScope;
    readonly createdAt: number;
    readonly expiresAt: number;
}
export interface CreateWorktreeInput {
    readonly sandbox: SandboxDescriptor;
    readonly worktreeName: string;
    readonly customScope?: Partial<SandboxScope>;
    readonly taskGroupId?: string;
}
export declare class WorktreeIsolationEngine {
    private worktrees;
    /**
     * Asserts that a child worktree scope does not exceed parent sandbox boundaries.
     * Khẳng định rằng phạm vi của worktree con không vượt quá ranh giới của sandbox cha.
     */
    private validateScopeContainment;
    /**
     * Creates an isolated project worktree strictly contained within a parent sandbox.
     * Tạo một worktree dự án cô lập được chứa hoàn toàn bên trong một sandbox cha.
     */
    createWorktree(input: CreateWorktreeInput): WorktreeDescriptor;
    /**
     * Retrieves a worktree descriptor by id.
     * Lấy bộ mô tả worktree theo định danh.
     */
    getWorktree(worktreeId: WorktreeId): WorktreeDescriptor | undefined;
    /**
     * Lists worktrees belonging to a specific sandbox.
     * Liệt kê các worktree thuộc về một sandbox cụ thể.
     */
    listWorktrees(sandboxId: SandboxId): readonly WorktreeDescriptor[];
    /**
     * Clears in-memory worktrees.
     * Xóa danh sách worktree trong bộ nhớ.
     */
    clear(): void;
}
