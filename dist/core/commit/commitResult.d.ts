import type { CommitResult } from './commitTypes.js';
/**
 * EN: Creates a deeply frozen, authoritative CommitResult.
 * VI: Tạo một CommitResult bất biến sâu, có thẩm quyền.
 */
export declare function createCommitResult(params: CommitResult): Readonly<CommitResult>;
