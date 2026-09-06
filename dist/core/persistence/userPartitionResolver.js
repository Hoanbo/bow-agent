// src/core/persistence/userPartitionResolver.ts
// BOW CON V4.0 — MILESTONE 1.3.3: AUTHORITATIVE USER PARTITION RESOLVER
import path from 'node:path';
import crypto from 'node:crypto';
import { DurablePersistenceSecurityError } from './durableJsonStore.js';
export const DEFAULT_PRIMARY_USER_ID = 'boss_user';
const WINDOWS_RESERVED_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;
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
export function resolveUserPartition(userId, baseDir) {
    if (!userId || typeof userId !== 'string') {
        throw new DurablePersistenceSecurityError('userId must be a non-empty string');
    }
    const trimmed = userId.trim();
    if (trimmed.length === 0) {
        throw new DurablePersistenceSecurityError('userId cannot be empty or whitespace');
    }
    if (trimmed.includes('\0')) {
        throw new DurablePersistenceSecurityError('Null byte detected in userId');
    }
    const ANONYMOUS_IDENTIFIERS = ['anonymous', 'anon', 'unknown', 'unauthenticated'];
    if (ANONYMOUS_IDENTIFIERS.includes(trimmed.toLowerCase())) {
        throw new DurablePersistenceSecurityError('Anonymous or unresolved user cannot access durable memory partition');
    }
    // Traversal and separator injection defenses
    if (trimmed.includes('..') ||
        trimmed.includes('/') ||
        trimmed.includes('\\') ||
        trimmed.includes(':') ||
        trimmed.includes('~')) {
        throw new DurablePersistenceSecurityError(`Path traversal or illegal separator detected in userId: "${userId}"`);
    }
    // Windows device name defense
    if (WINDOWS_RESERVED_NAMES.test(trimmed)) {
        throw new DurablePersistenceSecurityError(`Windows reserved device name detected in userId: "${userId}"`);
    }
    // Normalization: clean slug
    let partitionKey;
    if (/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
        partitionKey = trimmed.toLowerCase();
    }
    else {
        // For emails or IDs with special chars (e.g. user.name@domain.com)
        const hash = crypto.createHash('sha256').update(trimmed).digest('hex').slice(0, 12);
        const safeSlug = trimmed.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 24);
        partitionKey = `${safeSlug}_${hash}`;
    }
    if (!baseDir || typeof baseDir !== 'string') {
        throw new DurablePersistenceSecurityError('baseDir must be a non-empty string');
    }
    const resolvedBase = path.resolve(baseDir);
    const filePath = path.resolve(resolvedBase, `${partitionKey}.json`);
    // Verify strict directory confinement
    const relative = path.relative(resolvedBase, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.includes(path.sep + '..')) {
        throw new DurablePersistenceSecurityError(`Security violation: resolved partition path escapes baseDir`);
    }
    return {
        userId: trimmed,
        partitionKey,
        filePath,
        baseDir: resolvedBase,
    };
}
