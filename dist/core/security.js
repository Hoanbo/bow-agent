// src/core/security.ts
// BOW AGENT V3.3 — SECURITY, PII REDACTION, PROMPT INJECTION & AUTH GUARD
import crypto from 'node:crypto';
import { CONFIG, isDesktopAuthValid } from '../config.js';
export * from '../security/webhookVerifier.js';
export * from '../security/requestGuard.js';
/**
 * PII Detection & Sanitization Patterns
 */
const PHONE_REGEX = /(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const BANK_ACCOUNT_REGEX = /\b(?:\d{9,16})\b/g;
const TOKEN_KEY_REGEX = /(?:api[_-]?key|key|secret|token|password|bearer\s+)[=:]\s*['"]?([a-zA-Z0-9_\-\.]{8,})['"]?/gi;
const API_TOKEN_PATTERN = /\b(?:sk-[a-zA-Z0-9_\-]{20,}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|xoxb-[a-zA-Z0-9_\-]{20,})\b/g;
export function detectPii(text) {
    if (!text)
        return false;
    // RegExp with the global flag is stateful. Resetting lastIndex keeps
    // repeated security scans deterministic.
    PHONE_REGEX.lastIndex = 0;
    EMAIL_REGEX.lastIndex = 0;
    return PHONE_REGEX.test(text) || EMAIL_REGEX.test(text);
}
export function redactPii(text) {
    if (!text)
        return '';
    return text
        .replace(PHONE_REGEX, '[REDACTED_PHONE]')
        .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
        .replace(API_TOKEN_PATTERN, '[REDACTED_SECRET]')
        .replace(TOKEN_KEY_REGEX, '$1=[REDACTED_SECRET]');
}
/**
 * Prompt Injection & Jailbreak Detection
 */
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
    /you\s+are\s+now\s+an\s+unfiltered\s+ai/i,
    /disregard\s+(your\s+)?(rules|safety|system\s+prompt)/i,
    /system\s*prompt\s*override/i,
    /show\s+(me\s+)?your\s+(internal|system)\s+prompt/i,
    /developer\s+mode\s+enabled/i,
    /act\s+as\s+DAN/i,
    /bypass\s+safety\s+filter/i,
];
export function detectPromptInjection(text) {
    if (!text)
        return false;
    return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}
/**
 * Comprehensive Security Scan
 */
export function scanSecurity(text) {
    const containsPii = detectPii(text);
    const containsPromptInjection = detectPromptInjection(text);
    const piiTypes = [];
    const violations = [];
    PHONE_REGEX.lastIndex = 0;
    if (PHONE_REGEX.test(text))
        piiTypes.push('PHONE');
    EMAIL_REGEX.lastIndex = 0;
    if (EMAIL_REGEX.test(text))
        piiTypes.push('EMAIL');
    if (containsPromptInjection) {
        violations.push('PROMPT_INJECTION_ATTEMPT');
    }
    const isSafe = !containsPromptInjection;
    const sanitizedText = redactPii(text);
    return {
        isSafe,
        containsPii,
        containsPromptInjection,
        piiTypes,
        sanitizedText,
        violations,
    };
}
export function verifyChannelAccess(auth, requiredPrivilege) {
    if (requiredPrivilege === 'READ')
        return true;
    if (requiredPrivilege === 'DESKTOP_EXEC') {
        return isDesktopAuthValid(auth.authToken);
    }
    if (requiredPrivilege === 'ADMIN') {
        return auth.role === 'admin' || isDesktopAuthValid(auth.authToken);
    }
    if (requiredPrivilege === 'WRITE') {
        return Boolean(auth.isAuthenticated || auth.role === 'admin' || auth.role === 'customer');
    }
    return false;
}
/**
 * Zero Auto-Mutation: Generate Cryptographic Decision Fingerprint (SHA-256)
 */
export function generateDecisionFingerprint(actionType, payload) {
    const content = JSON.stringify({ actionType, payload, timestamp: Date.now() });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 32);
}
/**
 * Verify a versioned HMAC webhook signature and reject stale requests.
 * Signature format: `v1=<hex sha256 of timestamp + '.' + raw body>`.
 */
export function verifyShopWebhookSignature(rawBody, timestamp, signature) {
    if (!CONFIG.shopWebhookSecret || !timestamp || !signature)
        return false;
    const timestampMs = Number(timestamp) * 1000;
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > CONFIG.webhookMaxAgeSeconds * 1000) {
        return false;
    }
    const expected = `v1=${crypto
        .createHmac('sha256', CONFIG.shopWebhookSecret)
        .update(`${timestamp}.${rawBody}`, 'utf8')
        .digest('hex')}`;
    const actual = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}
/**
 * Generate authenticated HMAC headers for outgoing or test webhooks.
 */
export function createShopWebhookHeaders(rawBody, secret) {
    const s = secret || CONFIG.shopWebhookSecret;
    if (!s)
        return {};
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = `v1=${crypto
        .createHmac('sha256', s)
        .update(`${timestamp}.${rawBody}`, 'utf8')
        .digest('hex')}`;
    return {
        'x-bow-timestamp': timestamp,
        'x-bow-signature': signature,
    };
}
