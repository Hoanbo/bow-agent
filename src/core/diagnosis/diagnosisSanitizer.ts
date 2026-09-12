// src/core/diagnosis/diagnosisSanitizer.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// In-memory credential and secret sanitization engine.
// Scrubs authorization tokens, keys, passwords, and sensitive connection strings
// BEFORE persistence, hashing, provenance construction, and package serialization.
// Động cơ làm sạch thông tin đăng nhập và bí mật trong bộ nhớ.
// Loại bỏ các mã token ủy quyền, khóa, mật khẩu và chuỗi kết nối nhạy cảm
// TRƯỚC KHI lưu trữ, băm, xây dựng nguồn gốc và tuần tự hóa gói.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - IMMUTABILITY: Never mutate the caller's original object; return fresh sanitized copies.
// - FAIL-CLOSED SANITIZATION: Redact all potential secrets with deterministic placeholder [REDACTED].
// - ZERO SECRET LEAKAGE: No token, password, or key shall ever appear in decision-support packages or hashes.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

export class DiagnosisSanitizer {
  private static readonly SECRET_KEY_PATTERNS = [
    /token/i,
    /secret/i,
    /password/i,
    /passwd/i,
    /api[-_]?key/i,
    /authorization/i,
    /auth[-_]?header/i,
    /bearer/i,
    /private[-_]?key/i,
    /credential/i,
    /conn[-_]?str/i,
    /connection[-_]?string/i,
    /access[-_]?key/i,
    /client[-_]?secret/i,
    /webhook[-_]?secret/i,
  ];

  private static readonly STRING_REDACTION_PATTERNS: readonly [RegExp, string][] = [
    // Bearer tokens
    [/bearer\s+[a-zA-Z0-9._\-~+/]+=*/gi, 'Bearer [REDACTED]'],
    // Authorization header value patterns
    [/(authorization\s*[:=]\s*['"]?)[^'"\s\r\n]+/gi, '$1[REDACTED]'],
    // API Key in query strings or JSON
    [/((?:api[_-]?key|access[_-]?token|secret|password|auth)=)[^&'"\s]+/gi, '$1[REDACTED]'],
    // JSON key-value pairs
    [/"(token|secret|password|key|authorization|apiKey|authHeader|clientSecret|privateKey)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"'],
    // Connection strings (postgres, mysql, mongodb, redis, etc.)
    [/(?:postgres|mysql|mongodb|redis|amqp):\/\/[^:\s"']+:[^@\s"']+@/gi, '$1://[REDACTED]:[REDACTED]@'],
  ];

  /**
   * Sanitizes a string, replacing all credential patterns with deterministic redaction markers.
   * Làm sạch một chuỗi, thay thế tất cả các mẫu thông tin đăng nhập bằng dấu hiệu làm sạch xác định.
   */
  public sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return input;
    }

    let result = input;
    for (const [pattern, replacement] of DiagnosisSanitizer.STRING_REDACTION_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }

  /**
   * Deeply sanitizes any object, array, or primitive without mutating the original input.
   * Returns a fresh, sanitized clone.
   * Làm sạch sâu bất kỳ đối tượng, mảng hoặc kiểu nguyên thủy nào mà không làm đột biến dữ liệu gốc.
   * Trả về bản sao sạch mới.
   */
  public sanitize<T>(input: T): T {
    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input) as unknown as T;
    }

    if (typeof input === 'number' || typeof input === 'boolean') {
      return input;
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitize(item)) as unknown as T;
    }

    if (typeof input === 'object') {
      const sanitizedObj: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        // Check if key name matches any secret pattern
        const isKeySensitive = DiagnosisSanitizer.SECRET_KEY_PATTERNS.some((pattern) =>
          pattern.test(key)
        );

        if (isKeySensitive) {
          sanitizedObj[key] = '[REDACTED]';
        } else if (typeof value === 'string') {
          sanitizedObj[key] = this.sanitizeString(value);
        } else {
          sanitizedObj[key] = this.sanitize(value);
        }
      }

      return sanitizedObj as T;
    }

    return input;
  }
}

export const globalDiagnosisSanitizer = new DiagnosisSanitizer();
