export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: string[];
}
export declare class DurablePersistenceError extends Error {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
export declare class DurablePersistenceCorruptionError extends DurablePersistenceError {
    constructor(message: string, cause?: unknown);
}
export declare class DurablePersistenceSchemaError extends DurablePersistenceError {
    readonly validationErrors: string[];
    constructor(message: string, errors?: string[], cause?: unknown);
}
export declare class DurablePersistenceSecurityError extends DurablePersistenceError {
    constructor(message: string, cause?: unknown);
}
export interface DurableJsonStoreOptions<T> {
    filePath: string;
    validator: (data: unknown) => ValidationResult<T>;
    defaultFactory: () => T;
    allowedBaseDir?: string;
    maxRetries?: number;
    quarantineCorrupted?: boolean;
}
/**
 * DurableJsonStore<T> provides crash-safe, atomic, schema-validated JSON persistence.
 *
 * Guaranteed Invariants:
 * 1. Zero partial writes: writes to a unique temporary file and atomically replaces target.
 * 2. Fail-closed: malformed JSON or invalid schema throws without silently resetting state.
 * 3. Quarantine: corrupted files are safely preserved as .corrupted.<timestamp> for forensics.
 * 4. Security: strictly validates canonical paths against path traversal attacks.
 * 5. Concurrency: safe under interleaved execution with unique temporary filenames.
 */
export declare class DurableJsonStore<T> {
    readonly filePath: string;
    readonly allowedBaseDir?: string;
    private readonly validator;
    private readonly defaultFactory;
    private readonly maxRetries;
    private readonly quarantineCorrupted;
    private isWriting;
    constructor(options: DurableJsonStoreOptions<T>);
    /**
     * Verify symlink safety on Windows/POSIX.
     */
    private verifySymlinkSafety;
    /**
     * Quarantine a corrupted file so forensic analysis is possible without silent data loss.
     */
    private quarantineFile;
    /**
     * Read, parse, and validate durable data from disk.
     *
     * - If file does NOT exist: initializes with defaultFactory() via atomic write.
     * - If file contains malformed JSON: throws DurablePersistenceCorruptionError (fails closed).
     * - If file contains invalid schema: throws DurablePersistenceSchemaError (fails closed).
     */
    read(): T;
    /**
     * Atomically write validated data to disk using temporary file + rename replacement.
     *
     * Invariants:
     * - Validates before serializing.
     * - Writes to a temporary file in the exact same directory.
     * - Uses retry backoff for Windows transient file locks.
     * - Never exposes partially written or invalid state.
     */
    write(data: T): void;
    /**
     * Apply an atomic update using a mutator function.
     */
    update(mutator: (current: T) => T): T;
}
