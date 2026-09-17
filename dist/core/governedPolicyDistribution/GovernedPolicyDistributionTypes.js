// src/core/governedPolicyDistribution/GovernedPolicyDistributionTypes.ts
// Component 1218: GovernedPolicyDistributionTypes
//
// Canonical contracts, branded IDs, validation, deterministic canonicalization,
// cryptographic hashing helpers, secret scrubbing, and typed error hierarchy for MS-1.5.25.
import { createHash, createHmac, timingSafeEqual } from 'crypto';
export function asFleetNodeId(val) { return val; }
export function asDistributionManifestId(val) { return val; }
export function asDistributionSessionId(val) { return val; }
export function asNodeAttestationId(val) { return val; }
export function asNodeQuarantineId(val) { return val; }
export function asPolicyEpochId(val) { return val; }
export function asDistributionAuditRecordId(val) { return val; }
export const ALL_POLICY_DOMAINS = Object.freeze([
    'LEASE',
    'CONVERGENCE',
    'FEDERATION',
    'SECURITY',
    'RESOURCE',
    'AUDIT',
]);
export const ALL_QUARANTINE_REASONS = Object.freeze([
    'HASH_MISMATCH',
    'SIGNATURE_INVALID',
    'DELIVERY_TIMEOUT',
    'COMMIT_DELIVERY_EXHAUSTED',
    'STALE_EPOCH',
    'CROSS_TENANT',
    'STALE_HEARTBEAT',
    'MANIFEST_TAMPERED',
    'SPLIT_BRAIN',
]);
export const ALL_DISTRIBUTION_AUDIT_EVENT_TYPES = Object.freeze([
    'NODE_REGISTERED',
    'NODE_HEARTBEAT',
    'MANIFEST_PACKAGED',
    'PREPARE_DELIVERED',
    'DELIVERY_FAILED',
    'RECEIPT_ACCEPTED',
    'RECEIPT_REJECTED',
    'NONCE_REPLAY_REJECTED',
    'CONVERGENCE_EVALUATED',
    'EPOCH_PREPARED',
    'EPOCH_COMMIT_DURABLE',
    'EPOCH_COMMIT_DELIVERY',
    'EPOCH_CONVERGED',
    'EPOCH_DIVERGED',
    'EPOCH_RECOVERY_EXHAUSTED',
    'EPOCH_ABORTED',
    'SPLIT_BRAIN_DETECTED',
    'NODE_QUARANTINED',
    'NODE_QUARANTINE_RELEASED',
    'QUARANTINE_PUBLICATION_FAILED',
    'TENANT_ACCESS_REJECTED',
    'EMERGENCY_STOP_BLOCKED',
    'LOCK_TIMEOUT',
    'PERSISTENCE_CORRUPTION',
    'LEDGER_VERIFIED',
]);
export const GOVERNED_POLICY_DISTRIBUTION_INVARIANTS = Object.freeze({
    DISTRIBUTION_NOT_RATIFICATION: true,
    DISTRIBUTION_NOT_AUTHORIZATION: true,
    ATTESTATION_NOT_POLICY_AUTHORITY: true,
    CONVERGENCE_SCORE_NOT_AUTHORIZATION: true,
    MANIFEST_HASH_NOT_AUTHORIZATION: true,
    QUARANTINE_NOT_POLICY_RATIFICATION: true,
    QUARANTINE_NOT_POLICY_AUTHORIZATION: true,
    QUARANTINE_NOT_POLICY_MUTATION: true,
    EPOCH_COMMIT_NOT_LIFECYCLE_AUTHORITY: true,
    SOLE_HUMAN_AUTHORITY: true,
    EMERGENCY_STOP_DOMINATES: true,
    TENANT_BOUNDARY_STRICT: true,
    EXECUTION_FIREWALL_STRICT: true,
});
// ============================================================================
// 4. CONSTANTS & INVARIANTS
// ============================================================================
export const GENESIS_DISTRIBUTION_HASH = '0'.repeat(64);
export const HEARTBEAT_STALE_THRESHOLD_MS = 15000;
export const PREPARE_DEADLINE_MS = 5000;
export const COMMIT_RETRY_INTERVAL_MS = 1000;
export const COMMIT_RETRY_TIMEOUT_MS = 30000;
export const MAX_COMMIT_RETRIES = 30;
export const QUARANTINE_ADAPTER_RETRY_INTERVAL_MS = 1000;
export const MAX_QUARANTINE_ADAPTER_RETRIES = 5;
export const LOCK_TIMEOUT_MS = 5000;
export const CANARY_THRESHOLDS = Object.freeze({
    0: 0.80,
    1: 0.90,
    2: 0.95,
    3: 0.95,
    4: 0.99,
});
export const GOVERNED_DISTRIBUTION_INVARIANTS = Object.freeze({
    SOLE_HUMAN_AUTHORITY: true,
    DISTRIBUTION_NOT_EQUAL_RATIFICATION: true,
    DISTRIBUTION_NOT_EQUAL_AUTHORIZATION: true,
    ATTESTATION_NOT_EQUAL_POLICY_AUTHORITY: true,
    CONVERGENCE_SCORE_NOT_EQUAL_AUTHORIZATION: true,
    MANIFEST_HASH_NOT_EQUAL_AUTHORIZATION: true,
    QUARANTINE_NOT_EQUAL_RATIFICATION: true,
    QUARANTINE_NOT_EQUAL_POLICY_AUTHORIZATION: true,
    QUARANTINE_NOT_EQUAL_POLICY_MUTATION: true,
    EPOCH_COMMIT_NOT_EQUAL_LIFECYCLE_AUTHORITY: true,
});
// ============================================================================
// 5. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyDistributionBaseError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class DistributionValidationError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_VALIDATION_ERROR'); }
}
export class DistributionTenantIsolationError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_TENANT_ISOLATION_ERROR'); }
}
export class DistributionManifestValidationError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_MANIFEST_VALIDATION_ERROR'); }
}
export class DistributionCanonicalizationError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_CANONICALIZATION_ERROR'); }
}
export class DistributionTransportError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_TRANSPORT_ERROR'); }
}
export class DistributionTimeoutError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_TIMEOUT_ERROR'); }
}
export class DistributionAttestationVerificationError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_ATTESTATION_VERIFICATION_ERROR'); }
}
export class DistributionNonceReplayError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_NONCE_REPLAY_ERROR'); }
}
export class DistributionConvergenceError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_CONVERGENCE_ERROR'); }
}
export class DistributionEpochConflictError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_EPOCH_CONFLICT_ERROR'); }
}
export class DistributionQuarantineError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_QUARANTINE_ERROR'); }
}
export class DistributionQuarantinePublicationError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_QUARANTINE_PUBLICATION_ERROR'); }
}
export class DistributionEmergencyStopActiveError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_EMERGENCY_STOP_ACTIVE_ERROR'); }
}
export class DistributionLockTimeoutError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_LOCK_TIMEOUT_ERROR'); }
}
export class DistributionPersistenceCorruptionError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_PERSISTENCE_CORRUPTION_ERROR'); }
}
export class DistributionLedgerIntegrityError extends GovernedPolicyDistributionBaseError {
    constructor(message) { super(message, 'DISTRIBUTION_LEDGER_INTEGRITY_ERROR'); }
}
// ============================================================================
// 6. IDENTIFIER & DOMAIN SANITIZATION
// ============================================================================
const RESERVED_WINDOWS_NAMES = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
const VALID_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const VALID_POLICY_DOMAINS = new Set([
    'LEASE',
    'CONVERGENCE',
    'FEDERATION',
    'SECURITY',
    'RESOURCE',
    'AUDIT',
]);
export function assertValidIdentifier(id, fieldName) {
    if (typeof id !== 'string' || !VALID_IDENTIFIER_PATTERN.test(id)) {
        throw new DistributionValidationError(`Invalid ${fieldName}: must match ^[A-Za-z0-9_-]{1,64}$`);
    }
    if (RESERVED_WINDOWS_NAMES.test(id)) {
        throw new DistributionValidationError(`Invalid ${fieldName}: reserved device name forbidden (${id})`);
    }
    if (id.includes('..') || id.includes('/') || id.includes('\\') || id.includes('\0')) {
        throw new DistributionValidationError(`Invalid ${fieldName}: path traversal or null byte forbidden`);
    }
    return id;
}
export function assertValidDomain(domain) {
    if (!domain || !VALID_POLICY_DOMAINS.has(domain)) {
        throw new DistributionValidationError(`Invalid policyDomain: ${domain}`);
    }
    return domain;
}
export function assertValidHash(hash, fieldName) {
    if (typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
        throw new DistributionValidationError(`Invalid ${fieldName}: must be 64 lowercase hexadecimal characters`);
    }
    return hash;
}
export function assertValidNonce(nonce, fieldName) {
    if (typeof nonce !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce)) {
        throw new DistributionValidationError(`Invalid ${fieldName}: must be a valid UUIDv4 string`);
    }
    return nonce.toLowerCase();
}
export function assertEmergencyStopInactive(provider) {
    if (!provider) {
        throw new DistributionEmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active;
    try {
        if (typeof provider === 'function') {
            active = provider();
        }
        else if (typeof provider === 'object' && typeof provider.isEmergencyStopActive === 'function') {
            active = provider.isEmergencyStopActive();
        }
        else {
            throw new Error('Invalid emergency stop provider');
        }
    }
    catch (err) {
        throw new DistributionEmergencyStopActiveError(`Emergency stop provider threw: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (typeof active !== 'boolean' || active !== false) {
        throw new DistributionEmergencyStopActiveError('Emergency stop is active or non-boolean (fail-closed)');
    }
}
// ============================================================================
// 7. DETERMINISTIC CANONICAL JSON & CRYPTOGRAPHIC HELPERS
// ============================================================================
/**
 * Deterministic Canonical JSON according to MS-1.5.25 specification.
 * - Accepts null, booleans, finite numbers, NFC-normalized strings, arrays, plain objects.
 * - Rejects undefined, Symbol, Function, BigInt, Date, Map, Set, Buffer, NaN, Infinity.
 * - UTF-8 without BOM, no whitespace.
 * - Keys sort by UTF-16 code unit sequence.
 * - Numbers serialized via ECMAScript 2023 ToString (-0 -> 0).
 */
export function canonicalJson(value) {
    if (value === null)
        return 'null';
    if (typeof value === 'boolean')
        return value ? 'true' : 'false';
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new DistributionCanonicalizationError('Non-finite number cannot be canonicalized');
        }
        if (Object.is(value, -0) || value === 0) {
            return '0';
        }
        // ECMAScript 2023 ToString
        return String(value);
    }
    if (typeof value === 'string') {
        return serializeCanonicalString(value);
    }
    if (Array.isArray(value)) {
        const serializedElements = value.map(elem => {
            if (elem === undefined || typeof elem === 'function' || typeof elem === 'symbol') {
                throw new DistributionCanonicalizationError('Unsupported element in array');
            }
            return canonicalJson(elem);
        });
        return '[' + serializedElements.join(',') + ']';
    }
    if (typeof value === 'object') {
        // Reject non-plain objects: Buffer, Uint8Array, Date, RegExp, Map, Set, etc.
        if (value instanceof Date ||
            value instanceof RegExp ||
            value instanceof Map ||
            value instanceof Set ||
            ArrayBuffer.isView(value) ||
            value.constructor !== Object && Object.getPrototypeOf(value) !== null) {
            throw new DistributionCanonicalizationError('Non-plain object cannot be canonicalized');
        }
        const obj = value;
        const rawKeys = Object.keys(obj);
        const normalizedKeysMap = new Map(); // normalizedKey -> originalKey
        for (const key of rawKeys) {
            const normKey = key.normalize('NFC');
            if (normalizedKeysMap.has(normKey)) {
                throw new DistributionCanonicalizationError(`NFC key collision detected: ${normKey}`);
            }
            normalizedKeysMap.set(normKey, key);
        }
        // Sort keys by UTF-16 code-unit sequence
        const sortedNormKeys = Array.from(normalizedKeysMap.keys()).sort((a, b) => {
            const len = Math.min(a.length, b.length);
            for (let i = 0; i < len; i++) {
                const codeA = a.charCodeAt(i);
                const codeB = b.charCodeAt(i);
                if (codeA !== codeB)
                    return codeA - codeB;
            }
            return a.length - b.length;
        });
        const entries = [];
        for (const normKey of sortedNormKeys) {
            const originalKey = normalizedKeysMap.get(normKey);
            const val = obj[originalKey];
            if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
                throw new DistributionCanonicalizationError(`Unsupported value for key: ${originalKey}`);
            }
            entries.push(`${serializeCanonicalString(normKey)}:${canonicalJson(val)}`);
        }
        return '{' + entries.join(',') + '}';
    }
    throw new DistributionCanonicalizationError(`Unsupported type for canonicalJson: ${typeof value}`);
}
function serializeCanonicalString(str) {
    // Check for unpaired surrogates
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
            // High surrogate
            if (i + 1 >= str.length) {
                throw new DistributionCanonicalizationError('Unpaired high surrogate in string');
            }
            const next = str.charCodeAt(i + 1);
            if (next < 0xdc00 || next > 0xdfff) {
                throw new DistributionCanonicalizationError('Unpaired high surrogate in string');
            }
            i++; // Skip low surrogate
        }
        else if (code >= 0xdc00 && code <= 0xdfff) {
            throw new DistributionCanonicalizationError('Unpaired low surrogate in string');
        }
    }
    const normalized = str.normalize('NFC');
    let result = '"';
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized[i];
        const code = normalized.charCodeAt(i);
        if (char === '"') {
            result += '\\"';
        }
        else if (char === '\\') {
            result += '\\\\';
        }
        else if (char === '\b') {
            result += '\\b';
        }
        else if (char === '\t') {
            result += '\\t';
        }
        else if (char === '\n') {
            result += '\\n';
        }
        else if (char === '\f') {
            result += '\\f';
        }
        else if (char === '\r') {
            result += '\\r';
        }
        else if (code <= 0x001f) {
            result += '\\u00' + code.toString(16).padStart(2, '0');
        }
        else if (code === 0x2028) {
            result += '\\u2028';
        }
        else if (code === 0x2029) {
            result += '\\u2029';
        }
        else {
            result += char;
        }
    }
    result += '"';
    return result;
}
export function sha256(data) {
    return createHash('sha256').update(data).digest('hex');
}
export function hmacSha256(key, data) {
    return createHmac('sha256', key).update(data).digest('hex');
}
export function timingSafeEqualHex(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) {
        return false;
    }
    const bufA = Buffer.from(a, 'utf-8');
    const bufB = Buffer.from(b, 'utf-8');
    return timingSafeEqual(bufA, bufB);
}
// MS-1.5.20 upstream canonicalizer for policy hash
function ms120CanonicalizeJson(obj) {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(ms120CanonicalizeJson).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + ms120CanonicalizeJson(obj[k])).join(',') + '}';
}
export function ms120CanonicalPolicyHash(policy) {
    const meta = policy.metadata || policy;
    const normalized = {
        policyId: meta.policyId,
        tenantId: meta.tenantId,
        policyDomain: meta.policyDomain,
        policyVersion: meta.policyVersion,
        parentVersion: meta.parentVersion || 0,
        rules: policy.rules,
    };
    return createHash('sha256').update(ms120CanonicalizeJson(normalized)).digest('hex');
}
export function computeManifestFingerprint(manifest) {
    return sha256(canonicalJson(manifest));
}
export function computePepBindingHash(bindings) {
    return sha256(canonicalJson(bindings));
}
export function computeReceiptProofPayload(receipt) {
    return canonicalJson({
        attestationId: receipt.attestationId,
        nodeId: receipt.nodeId,
        tenantId: receipt.tenantId,
        federationId: receipt.federationId,
        policyDomain: receipt.policyDomain,
        manifestId: receipt.manifestId,
        manifestFingerprint: receipt.manifestFingerprint,
        canonicalPolicyHash: receipt.canonicalPolicyHash,
        policyVersion: receipt.policyVersion,
        epoch: receipt.epoch,
        pepBindingHash: receipt.pepBindingHash,
        distributionNonce: receipt.distributionNonce,
        receiptNonce: receipt.receiptNonce,
        status: receipt.status,
        keyId: receipt.keyId,
        timestamp: receipt.timestamp,
    });
}
export function computeQuarantineRequestProofPayload(req) {
    return canonicalJson({
        requestId: req.requestId,
        tenantId: req.tenantId,
        federationId: req.federationId,
        nodeId: req.nodeId,
        policyDomain: req.policyDomain,
        policyVersion: req.policyVersion,
        canonicalPolicyHash: req.canonicalPolicyHash,
        reason: req.reason,
        evidenceFingerprint: req.evidenceFingerprint,
        quarantineEpoch: req.quarantineEpoch,
        issuedAt: req.issuedAt,
        nonce: req.nonce,
        keyId: req.keyId,
    });
}
export function computeQuarantineAckProofPayload(ack) {
    return canonicalJson({
        requestId: ack.requestId,
        status: ack.status,
        nodeId: ack.nodeId,
        tenantId: ack.tenantId,
        federationId: ack.federationId,
        policyDomain: ack.policyDomain,
        quarantineEpoch: ack.quarantineEpoch,
        timestamp: ack.timestamp,
        keyId: ack.keyId,
    });
}
export function computeEventHash(previousHash, payload) {
    return sha256(previousHash + canonicalJson(payload));
}
export const computeAuditEventHash = computeEventHash;
// ============================================================================
// 8. SECRET SCRUBBING
// ============================================================================
const SECRET_KEY_PATTERNS = [
    'authorization',
    'password',
    'passwd',
    'secret',
    'token',
    'apikey',
    'privatekey',
    'credential',
    'cookie',
    'session',
];
const BEARER_PATTERN = /bearer\s+\S+/i;
const PRIVATE_KEY_PATTERN = /-----BEGIN[^\r\n]*PRIVATE KEY-----/i;
const HMAC_SECRET_PATTERN = /BOW_GOVERNANCE_HMAC_SECRET/i;
export function scrubAuditData(data, depth = 0) {
    if (depth > 16) {
        throw new DistributionValidationError('Maximum audit data depth exceeded (16)');
    }
    if (data === null || typeof data === 'boolean') {
        return data;
    }
    if (typeof data === 'number') {
        if (!Number.isFinite(data)) {
            throw new DistributionValidationError('Non-finite number in audit data');
        }
        return data;
    }
    if (typeof data === 'string') {
        const bytes = Buffer.byteLength(data, 'utf-8');
        if (bytes > 8192) {
            throw new DistributionValidationError('Audit string exceeds 8192 bytes');
        }
        if (BEARER_PATTERN.test(data) ||
            PRIVATE_KEY_PATTERN.test(data) ||
            HMAC_SECRET_PATTERN.test(data)) {
            return '[REDACTED]';
        }
        return data.normalize('NFC');
    }
    if (Array.isArray(data)) {
        if (data.length > 100) {
            throw new DistributionValidationError('Audit array exceeds 100 members');
        }
        return data.map(item => scrubAuditData(item, depth + 1));
    }
    if (typeof data === 'object') {
        const keys = Object.keys(data);
        if (keys.length > 100) {
            throw new DistributionValidationError('Audit object exceeds 100 members');
        }
        const scrubbedObj = {};
        for (const key of keys) {
            const normKey = key.normalize('NFC');
            const strippedKey = normKey.toLowerCase().replace(/[^a-z0-9]/g, '');
            let isSecretKey = false;
            for (const pattern of SECRET_KEY_PATTERNS) {
                if (strippedKey.includes(pattern)) {
                    isSecretKey = true;
                    break;
                }
            }
            if (isSecretKey) {
                scrubbedObj[normKey] = '[REDACTED]';
            }
            else {
                scrubbedObj[normKey] = scrubAuditData(data[key], depth + 1);
            }
        }
        return scrubbedObj;
    }
    throw new DistributionValidationError('Unsupported type in audit data');
}
export const recursivelyScrubSecrets = scrubAuditData;
