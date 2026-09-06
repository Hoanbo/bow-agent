// src/core/persistence/governanceSchemas.ts
// BOWCON V4.0 — RUNTIME SCHEMAS FOR MULTI-TENANT APPROVAL & IDEMPOTENCY DURABLE PERSISTENCE
// Compliant with ISO/IEC 42001 & NIST AI RMF
const VALID_APPROVAL_STATUSES = new Set([
    'PENDING',
    'APPROVED',
    'REJECTED',
    'EXPIRED',
    'CONSUMED',
    'REVOKED',
]);
const VALID_TARGET_DOMAINS = new Set([
    'shop',
    'desktop',
    'robot',
    'system',
    'dynamic_code',
]);
const VALID_IDEMPOTENCY_STATUSES = new Set([
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
]);
function isPlainObject(val) {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
}
function hasPrototypePollutionKey(obj) {
    for (const key of Object.keys(obj)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            return true;
        }
    }
    return false;
}
/**
 * Runtime schema validator for ApprovalRecord[]
 */
export function validateApprovalRecords(data) {
    if (!Array.isArray(data)) {
        return { success: false, errors: ['Approval storage must be an array of ApprovalRecords'] };
    }
    const errors = [];
    const sanitizedRecords = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!isPlainObject(item)) {
            errors.push(`Approval record at index ${i} is not a valid object`);
            continue;
        }
        if (hasPrototypePollutionKey(item)) {
            errors.push(`Prototype pollution token detected at index ${i}`);
            continue;
        }
        if (!item.id || typeof item.id !== 'string') {
            errors.push(`Missing or invalid id at index ${i}`);
        }
        // Default ownerUserId to requestedBy or primary if missing in legacy records
        const ownerUserId = typeof item.ownerUserId === 'string' && item.ownerUserId.trim().length > 0
            ? item.ownerUserId.trim()
            : (typeof item.requestedBy === 'string' && item.requestedBy.trim().length > 0
                ? item.requestedBy.trim()
                : 'boss_user');
        if (!item.actionName || typeof item.actionName !== 'string') {
            errors.push(`Missing or invalid actionName at index ${i}`);
        }
        if (!item.targetDomain || !VALID_TARGET_DOMAINS.has(item.targetDomain)) {
            errors.push(`Invalid targetDomain "${item.targetDomain}" at index ${i}`);
        }
        if (!item.argumentsHash || typeof item.argumentsHash !== 'string') {
            errors.push(`Missing or invalid argumentsHash at index ${i}`);
        }
        if (!isPlainObject(item.argumentsPreview)) {
            errors.push(`Missing or invalid argumentsPreview at index ${i}`);
        }
        if (!item.requestedBy || typeof item.requestedBy !== 'string') {
            errors.push(`Missing or invalid requestedBy at index ${i}`);
        }
        if (!item.status || !VALID_APPROVAL_STATUSES.has(item.status)) {
            errors.push(`Invalid approval status "${item.status}" at index ${i}`);
        }
        if (!item.createdAt || typeof item.createdAt !== 'string' || isNaN(Date.parse(item.createdAt))) {
            errors.push(`Invalid createdAt timestamp at index ${i}`);
        }
        if (!item.expiresAt || typeof item.expiresAt !== 'string' || isNaN(Date.parse(item.expiresAt))) {
            errors.push(`Invalid expiresAt timestamp at index ${i}`);
        }
        if (errors.length > 0) {
            continue;
        }
        const record = {
            id: item.id,
            ownerUserId,
            actionName: item.actionName,
            targetDomain: item.targetDomain,
            argumentsHash: item.argumentsHash,
            argumentsPreview: item.argumentsPreview,
            requestedBy: item.requestedBy,
            status: item.status,
            createdAt: item.createdAt,
            expiresAt: item.expiresAt,
        };
        if (item.approver && typeof item.approver === 'string') {
            record.approver = item.approver;
        }
        if (item.consumedAt && typeof item.consumedAt === 'string') {
            record.consumedAt = item.consumedAt;
        }
        if (item.executionToken && typeof item.executionToken === 'string') {
            record.executionToken = item.executionToken;
        }
        if (item.correlationId && typeof item.correlationId === 'string') {
            record.correlationId = item.correlationId;
        }
        sanitizedRecords.push(record);
    }
    if (errors.length > 0) {
        return { success: false, errors };
    }
    return { success: true, data: sanitizedRecords };
}
/**
 * Runtime schema validator for IdempotencyEntry[]
 */
export function validateIdempotencyEntries(data) {
    if (!Array.isArray(data)) {
        return { success: false, errors: ['Idempotency storage must be an array of IdempotencyEntries'] };
    }
    const errors = [];
    const sanitizedEntries = [];
    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!isPlainObject(item)) {
            errors.push(`Idempotency entry at index ${i} is not a valid object`);
            continue;
        }
        if (hasPrototypePollutionKey(item)) {
            errors.push(`Prototype pollution token detected at index ${i}`);
            continue;
        }
        if (!item.key || typeof item.key !== 'string') {
            errors.push(`Missing or invalid key at index ${i}`);
        }
        const ownerUserId = typeof item.ownerUserId === 'string' && item.ownerUserId.trim().length > 0
            ? item.ownerUserId.trim()
            : 'boss_user';
        if (typeof item.payloadHash !== 'string') {
            errors.push(`Missing or invalid payloadHash at index ${i}`);
        }
        if (typeof item.recordedAt !== 'number' || !Number.isFinite(item.recordedAt) || item.recordedAt <= 0) {
            errors.push(`Invalid recordedAt timestamp at index ${i}`);
        }
        if (typeof item.expiresAt !== 'number' || !Number.isFinite(item.expiresAt) || item.expiresAt <= 0) {
            errors.push(`Invalid expiresAt timestamp at index ${i}`);
        }
        if (item.status && !VALID_IDEMPOTENCY_STATUSES.has(item.status)) {
            errors.push(`Invalid idempotency status "${item.status}" at index ${i}`);
        }
        if (errors.length > 0) {
            continue;
        }
        const entry = {
            key: item.key,
            ownerUserId,
            payloadHash: item.payloadHash,
            result: item.result,
            recordedAt: item.recordedAt,
            expiresAt: item.expiresAt,
        };
        if (item.status) {
            entry.status = item.status;
        }
        if (item.updatedAt && typeof item.updatedAt === 'number' && Number.isFinite(item.updatedAt)) {
            entry.updatedAt = item.updatedAt;
        }
        if (item.correlationId && typeof item.correlationId === 'string') {
            entry.correlationId = item.correlationId;
        }
        sanitizedEntries.push(entry);
    }
    if (errors.length > 0) {
        return { success: false, errors };
    }
    return { success: true, data: sanitizedEntries };
}
