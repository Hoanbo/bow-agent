import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type DurableCommitRecord } from './durableCommitTypes.js';
export interface DurableCommitStoreOptions {
    readonly baseDir?: string;
    readonly sanitizer?: DiagnosisSanitizer;
}
export interface CommitIdentityInput {
    readonly taskId: string;
    readonly tenantId: string;
    readonly stepId: string;
    readonly executionId: string;
    readonly verificationId: string;
    readonly taskVersion: number;
}
export declare class DurableCommitStore {
    private readonly baseDir;
    private readonly sanitizer;
    constructor(options?: DurableCommitStoreOptions);
    /**
     * EN: Computes a deterministic commit ID from the authoritative identity tuple.
     */
    computeCommitId(input: CommitIdentityInput): string;
    /**
     * EN: Resolves the tenant commits directory, ensuring it exists.
     */
    getTenantCommitsDir(tenantId: string): string;
    /**
     * EN: Returns the file path for a commit record.
     */
    getCommitFilePath(tenantId: string, commitId: string): string;
    /**
     * EN: Checks whether a commit already exists for a tenant.
     */
    hasCommit(tenantId: string, commitId: string): boolean;
    /**
     * EN: Saves a DurableCommitRecord to disk using atomic temporary file replacement.
     * Fails closed if the record already exists (DuplicateCommitError).
     */
    saveCommit(record: DurableCommitRecord): void;
    /**
     * EN: Retrieves a DurableCommitRecord from disk, enforcing tenant isolation.
     */
    getCommit(tenantId: string, commitId: string): DurableCommitRecord | undefined;
    /**
     * EN: Lists all commits for a tenant.
     */
    listCommits(tenantId: string): readonly DurableCommitRecord[];
}
export declare const globalDurableCommitStore: DurableCommitStore;
