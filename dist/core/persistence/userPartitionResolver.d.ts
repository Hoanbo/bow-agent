export declare const DEFAULT_PRIMARY_USER_ID = "boss_user";
export interface UserPartition {
    userId: string;
    partitionKey: string;
    filePath: string;
    baseDir: string;
}
/**
 * Validates, normalizes, and maps an authenticated user identifier to a
 * strictly confined filesystem partition path.
 *
 * Guaranteed Invariants:
 * 1. Rejects missing, empty, or whitespace-only userId.
 * 2. Rejects 'anonymous' or unresolved access (No unauthenticated durable memory).
 * 3. Rejects path traversal tokens ('..', '/', '\', ':', null bytes).
 * 4. Rejects Windows reserved device names (CON, PRN, AUX, NUL, COM1..9, LPT1..9).
 * 5. Deterministic: equivalent inputs resolve to the exact same partition.
 * 6. Strictly confined: destination file is guaranteed within baseDir.
 */
export declare function resolveUserPartition(userId: string, baseDir: string): UserPartition;
