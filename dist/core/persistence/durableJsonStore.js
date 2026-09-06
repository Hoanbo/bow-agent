// src/core/persistence/durableJsonStore.ts
// BOW CON V4.0 — MILESTONE 1.3.2: ATOMIC DURABLE JSON PERSISTENCE ENGINE
import fs from 'node:fs';
import path from 'node:path';
export class DurablePersistenceError extends Error {
    cause;
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'DurablePersistenceError';
    }
}
export class DurablePersistenceCorruptionError extends DurablePersistenceError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'DurablePersistenceCorruptionError';
    }
}
export class DurablePersistenceSchemaError extends DurablePersistenceError {
    validationErrors;
    constructor(message, errors = [], cause) {
        super(message, cause);
        this.name = 'DurablePersistenceSchemaError';
        this.validationErrors = errors;
    }
}
export class DurablePersistenceSecurityError extends DurablePersistenceError {
    constructor(message, cause) {
        super(message, cause);
        this.name = 'DurablePersistenceSecurityError';
    }
}
let tempFileCounter = 0;
/**
 * Synchronous sleep using Atomics.wait for robust retry under Windows transient file locks.
 */
function syncSleep(ms) {
    if (ms <= 0)
        return;
    try {
        const buf = new SharedArrayBuffer(4);
        const view = new Int32Array(buf);
        Atomics.wait(view, 0, 0, ms);
    }
    catch {
        // Fallback busy wait if SharedArrayBuffer is unavailable
        const start = Date.now();
        while (Date.now() - start < ms) {
            // noop
        }
    }
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
export class DurableJsonStore {
    filePath;
    allowedBaseDir;
    validator;
    defaultFactory;
    maxRetries;
    quarantineCorrupted;
    isWriting = false;
    constructor(options) {
        if (!options.filePath || typeof options.filePath !== 'string') {
            throw new DurablePersistenceError('filePath must be a non-empty string');
        }
        // Path traversal check & null byte elimination
        if (options.filePath.includes('\0')) {
            throw new DurablePersistenceSecurityError('Null byte detected in file path');
        }
        const resolvedPath = path.resolve(options.filePath);
        if (options.allowedBaseDir) {
            if (options.allowedBaseDir.includes('\0')) {
                throw new DurablePersistenceSecurityError('Null byte detected in allowedBaseDir');
            }
            const resolvedBase = path.resolve(options.allowedBaseDir);
            const relative = path.relative(resolvedBase, resolvedPath);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                throw new DurablePersistenceSecurityError(`Path traversal blocked: target file path is outside allowedBaseDir`);
            }
        }
        this.filePath = resolvedPath;
        this.allowedBaseDir = options.allowedBaseDir ? path.resolve(options.allowedBaseDir) : undefined;
        this.validator = options.validator;
        this.defaultFactory = options.defaultFactory;
        this.maxRetries = options.maxRetries ?? 5;
        this.quarantineCorrupted = options.quarantineCorrupted ?? true;
    }
    /**
     * Verify symlink safety on Windows/POSIX.
     */
    verifySymlinkSafety(targetPath) {
        if (!fs.existsSync(targetPath))
            return;
        try {
            const lstat = fs.lstatSync(targetPath);
            if (lstat.isSymbolicLink()) {
                const real = fs.realpathSync(targetPath);
                if (this.allowedBaseDir) {
                    const relative = path.relative(this.allowedBaseDir, real);
                    if (relative.startsWith('..') || path.isAbsolute(relative)) {
                        throw new DurablePersistenceSecurityError('Symbolic link points outside allowed base directory');
                    }
                }
            }
        }
        catch (err) {
            if (err instanceof DurablePersistenceSecurityError)
                throw err;
            // Other fs errors will surface during read/write
        }
    }
    /**
     * Quarantine a corrupted file so forensic analysis is possible without silent data loss.
     */
    quarantineFile() {
        if (!this.quarantineCorrupted)
            return null;
        try {
            if (fs.existsSync(this.filePath)) {
                const quarantinePath = `${this.filePath}.corrupted.${Date.now()}`;
                fs.copyFileSync(this.filePath, quarantinePath);
                return quarantinePath;
            }
        }
        catch {
            // Best effort quarantine
        }
        return null;
    }
    /**
     * Read, parse, and validate durable data from disk.
     *
     * - If file does NOT exist: initializes with defaultFactory() via atomic write.
     * - If file contains malformed JSON: throws DurablePersistenceCorruptionError (fails closed).
     * - If file contains invalid schema: throws DurablePersistenceSchemaError (fails closed).
     */
    read() {
        this.verifySymlinkSafety(this.filePath);
        if (!fs.existsSync(this.filePath)) {
            const initialData = this.defaultFactory();
            const validation = this.validator(initialData);
            if (!validation.success || validation.data === undefined) {
                throw new DurablePersistenceSchemaError('Default factory produced invalid data schema', validation.errors);
            }
            this.write(validation.data);
            return validation.data;
        }
        let rawText;
        try {
            rawText = fs.readFileSync(this.filePath, 'utf8');
        }
        catch (err) {
            throw new DurablePersistenceError(`Failed to read file: ${err.message}`, err);
        }
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        }
        catch (err) {
            const qPath = this.quarantineFile();
            const qMsg = qPath ? ` (Quarantined to ${path.basename(qPath)})` : '';
            throw new DurablePersistenceCorruptionError(`Durable JSON file is malformed and cannot be parsed${qMsg}: ${err.message}`, err);
        }
        const validation = this.validator(parsed);
        if (!validation.success || validation.data === undefined) {
            const qPath = this.quarantineFile();
            const qMsg = qPath ? ` (Quarantined to ${path.basename(qPath)})` : '';
            throw new DurablePersistenceSchemaError(`Durable JSON data failed runtime schema validation${qMsg}`, validation.errors);
        }
        return validation.data;
    }
    /**
     * Atomically write validated data to disk using temporary file + rename replacement.
     *
     * Invariants:
     * - Validates before serializing.
     * - Writes to a temporary file in the exact same directory.
     * - Uses retry backoff for Windows transient file locks.
     * - Never exposes partially written or invalid state.
     */
    write(data) {
        this.verifySymlinkSafety(this.filePath);
        // 1. Runtime schema validation prior to write
        const validation = this.validator(data);
        if (!validation.success || validation.data === undefined) {
            throw new DurablePersistenceSchemaError('Cannot persist data: payload failed runtime schema validation', validation.errors);
        }
        const targetData = validation.data;
        // 2. Deterministic serialization
        let serialized;
        try {
            serialized = JSON.stringify(targetData, null, 2);
        }
        catch (err) {
            throw new DurablePersistenceError(`JSON serialization failed: ${err.message}`, err);
        }
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // 3. Unique temporary file path in the SAME directory
        tempFileCounter = (tempFileCounter + 1) % 1000000;
        const rand = Math.random().toString(36).slice(2, 8);
        const tmpFileName = `.${path.basename(this.filePath)}.tmp.${process.pid}.${Date.now()}.${tempFileCounter}.${rand}`;
        const tmpFilePath = path.join(dir, tmpFileName);
        // 4. Write completely to temporary file
        try {
            fs.writeFileSync(tmpFilePath, serialized, 'utf8');
        }
        catch (err) {
            try {
                if (fs.existsSync(tmpFilePath)) {
                    fs.unlinkSync(tmpFilePath);
                }
            }
            catch {
                // cleanup best effort
            }
            throw new DurablePersistenceError(`Failed to write temporary file: ${err.message}`, err);
        }
        // 5. Atomic rename replacement with retry for Windows EPERM/EBUSY
        let success = false;
        let lastError = null;
        const retryDelays = [10, 25, 50, 100, 200];
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                fs.renameSync(tmpFilePath, this.filePath);
                success = true;
                break;
            }
            catch (err) {
                lastError = err;
                if (attempt < this.maxRetries) {
                    const delay = retryDelays[attempt] || 50;
                    syncSleep(delay);
                }
            }
        }
        if (!success) {
            // Clean up tmp file to prevent leaking
            try {
                if (fs.existsSync(tmpFilePath)) {
                    fs.unlinkSync(tmpFilePath);
                }
            }
            catch {
                // cleanup best effort
            }
            throw new DurablePersistenceError(`Atomic replace failed after ${this.maxRetries} retries: ${lastError?.message || 'unknown error'}`, lastError);
        }
    }
    /**
     * Apply an atomic update using a mutator function.
     */
    update(mutator) {
        const current = this.read();
        const updated = mutator(current);
        this.write(updated);
        return updated;
    }
}
