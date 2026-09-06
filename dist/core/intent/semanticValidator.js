export const MAX_INTENT_TEXT_LENGTH = 8_192;
// EN: Validate untrusted values before semantic parsing. Reject rather than coerce malformed input.
// VI: Xác thực giá trị không tin cậy trước semantic parsing. Từ chối thay vì ép kiểu input sai dạng.
export function validateIntentInput(input) {
    const issues = [];
    if (!input || typeof input !== 'object' || Array.isArray(input))
        return [{ reason: 'MALFORMED_INPUT' }];
    if (typeof input.userId !== 'string' || !input.userId.trim() || typeof input.sessionId !== 'string' || !input.sessionId.trim())
        issues.push({ reason: 'MALFORMED_INPUT' });
    if (typeof input.userText !== 'string' || input.userText.length === 0 || input.userText.length > MAX_INTENT_TEXT_LENGTH || /[\0\u0001-\u0008\u000B\u000C\u000E-\u001F]/u.test(input.userText))
        issues.push({ reason: 'MALFORMED_INPUT' });
    return issues;
}
export function isSafeRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}
