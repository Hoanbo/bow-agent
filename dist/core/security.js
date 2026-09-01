// src/core/security.ts
// BOW AGENT V3.3 — SECURITY, PII REDACTION, PROMPT INJECTION & AUTH GUARD
import crypto from 'node:crypto';
import { isDesktopAuthValid } from '../config.js';
/**
 * PII Detection & Sanitization Patterns
 */
const PHONE_REGEX = /(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const BANK_ACCOUNT_REGEX = /\b(?:\d{9,16})\b/g;
const TOKEN_KEY_REGEX = /(?:api[_-]?key|secret|token|password|bearer\s+)[=:]\s*['"]?([a-zA-Z0-9_\-\.]{8,})['"]?/gi;
export function detectPii(text) {
    if (!text)
        return false;
    return PHONE_REGEX.test(text) || EMAIL_REGEX.test(text);
}
export function redactPii(text) {
    if (!text)
        return '';
    return text
        .replace(PHONE_REGEX, '[REDACTED_PHONE]')
        .replace(EMAIL_REGEX, '[REDACTED_EMAIL]')
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
    if (PHONE_REGEX.test(text))
        piiTypes.push('PHONE');
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
