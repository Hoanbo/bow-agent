// src/speech/piiRedactor.ts
// BOWCON V4.0 — SPEECH PII REDACTION & DATA HYGIENE FILTER (PROMPT #5 / H3)
//
// EN:
// Rule-based regex PII redactor protecting sensitive personal data before it enters
// long-term memory, audit ledger, or durable storage.
// Preserves the raw user text for current-turn real-time intent reasoning while
// redacting credit cards, Vietnamese phone numbers, passwords, and emails for storage.
//
// VI:
// Bộ lọc và che (redact) thông tin nhạy cảm PII bằng regex rule-based, bảo vệ dữ liệu cá nhân
// trước khi đi vào bộ nhớ dài hạn, nhật ký kiểm toán (audit log) hoặc lưu trữ bền vững.
// Bảo toàn văn bản gốc để AgentLoop xử lý ý định trong phiên hiện tại, đồng thời
// che số thẻ tín dụng, số điện thoại Việt Nam, mật khẩu và email trước khi lưu trữ.
/**
 * EN: Regex patterns for PII detection and redaction.
 * VI: Các mẫu biểu thức chính quy nhận diện và che thông tin nhạy cảm.
 */
const PATTERNS = {
    // 1. Số thẻ tín dụng: chuỗi 13-19 chữ số (có thể có khoảng trắng hoặc dấu gạch ngang)
    CREDIT_CARD: /\b(?:\d[ -]*?){13,19}\b/g,
    // 2. Mật khẩu / Khóa bí mật (hỗ trợ cả tiếng Việt và tiếng Anh)
    // Che phần secret phía sau cụm từ: "mật khẩu của tôi là", "mật khẩu là", "password is", "pass là"...
    PASSWORD_PHRASE: /((?:mật\s*khẩu(?:\s+(?:của\s+)?(?:tôi|em|anh|chị|sếp|mình|wifi|hệ\s*thống))?|password|pass|mật\s*mã)\s*(?:là|is|:|=)\s*)([^\s,;.!?]+)/gi,
    // 3. Số điện thoại Việt Nam: 10-11 chữ số bắt đầu bằng 0 hoặc +84 và các đầu số phổ biến (3, 5, 7, 8, 9)
    VIETNAMESE_PHONE: /(?:\+?84|0)(?:[.\s-]?[35789])[0-9](?:[.\s-]?[0-9]){7}\b/g,
    // 4. Địa chỉ email
    EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
    // 5. Khóa API / Secret tokens (bảo vệ dự phòng)
    API_SECRET_KEY: /((?:api[_-]?key|secret|token)\s*[:=]\s*['"]?)([a-zA-Z0-9_.-]{12,})(['"]?)/gi,
    RAW_API_TOKEN: /\b(?:sk-[a-zA-Z0-9_-]{20,}|ghp_[a-zA-Z0-9]{20,}|gho_[a-zA-Z0-9]{20,}|xoxb-[a-zA-Z0-9_-]{20,})\b/g,
};
/**
 * EN: Redacts sensitive PII from speech transcript text.
 * VI: Che các thông tin nhạy cảm (PII) khỏi văn bản phiên âm giọng nói.
 *
 * @param text Văn bản cần kiểm tra và che thông tin nhạy cảm.
 * @returns Object chứa `redactedText` (đã che) và `detectedTypes` (danh sách loại PII phát hiện được).
 */
export function redactPii(text) {
    if (!text || typeof text !== 'string') {
        return {
            redactedText: text || '',
            detectedTypes: [],
        };
    }
    let result = text;
    const detectedTypesSet = new Set();
    // 1. Kiểm tra & Che số thẻ tín dụng (13-19 chữ số)
    PATTERNS.CREDIT_CARD.lastIndex = 0;
    if (PATTERNS.CREDIT_CARD.test(result)) {
        detectedTypesSet.add('credit_card');
        PATTERNS.CREDIT_CARD.lastIndex = 0;
        result = result.replace(PATTERNS.CREDIT_CARD, '[REDACTED_CREDIT_CARD]');
    }
    // 2. Kiểm tra & Che cụm từ mật khẩu ("mật khẩu của tôi là ...", "password is ...")
    PATTERNS.PASSWORD_PHRASE.lastIndex = 0;
    if (PATTERNS.PASSWORD_PHRASE.test(result)) {
        detectedTypesSet.add('password');
        PATTERNS.PASSWORD_PHRASE.lastIndex = 0;
        result = result.replace(PATTERNS.PASSWORD_PHRASE, '$1[REDACTED_PASSWORD]');
    }
    // 3. Kiểm tra & Che email
    PATTERNS.EMAIL.lastIndex = 0;
    if (PATTERNS.EMAIL.test(result)) {
        detectedTypesSet.add('email');
        PATTERNS.EMAIL.lastIndex = 0;
        result = result.replace(PATTERNS.EMAIL, '[REDACTED_EMAIL]');
    }
    // 4. Kiểm tra & Che số điện thoại Việt Nam
    PATTERNS.VIETNAMESE_PHONE.lastIndex = 0;
    if (PATTERNS.VIETNAMESE_PHONE.test(result)) {
        detectedTypesSet.add('phone_number');
        PATTERNS.VIETNAMESE_PHONE.lastIndex = 0;
        result = result.replace(PATTERNS.VIETNAMESE_PHONE, '[REDACTED_PHONE]');
    }
    // 5. Kiểm tra & Che API Key / Token nếu có
    PATTERNS.API_SECRET_KEY.lastIndex = 0;
    if (PATTERNS.API_SECRET_KEY.test(result)) {
        detectedTypesSet.add('api_token');
        PATTERNS.API_SECRET_KEY.lastIndex = 0;
        result = result.replace(PATTERNS.API_SECRET_KEY, '$1[REDACTED_SECRET]$3');
    }
    PATTERNS.RAW_API_TOKEN.lastIndex = 0;
    if (PATTERNS.RAW_API_TOKEN.test(result)) {
        detectedTypesSet.add('api_token');
        PATTERNS.RAW_API_TOKEN.lastIndex = 0;
        result = result.replace(PATTERNS.RAW_API_TOKEN, '[REDACTED_SECRET]');
    }
    const detectedTypes = Array.from(detectedTypesSet);
    // Ghi log bảo vệ an toàn: CHỈ ghi loại PII phát hiện được, KHÔNG ghi nội dung nhạy cảm
    if (detectedTypes.length > 0) {
        console.log(`[PII-REDACTOR] PII detected and redacted. types=[${detectedTypes.join(', ')}]`);
    }
    return {
        redactedText: result,
        detectedTypes,
    };
}
