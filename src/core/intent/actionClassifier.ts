import type { Actionability, IntentType } from './intentTypes.js';

// EN: Classification is deterministic and describes a candidate only; it does not map to or call a tool.
// VI: Phân loại là xác định và chỉ mô tả candidate; nó không ánh xạ tới hoặc gọi tool.
export function classifyIntent(normalizedText: string): { intentType: IntentType; actionability: Actionability; confidence: number } {
  const text = normalizedText;
  if (/^(what|why|how|explain|giải thích|là gì|tại sao|như thế nào)/iu.test(text)) return { intentType: /explain|giải thích/iu.test(text) ? 'EXPLANATION_REQUEST' : 'INFORMATION_REQUEST', actionability: 'INFORMATIONAL', confidence: 0.9 };
  if (/(giá|price|bao nhiêu)/iu.test(text)) return { intentType: 'INFORMATION_REQUEST', actionability: 'INFORMATIONAL', confidence: 0.82 };
  if (/(status|check|xem|kiểm tra|hiển thị)/iu.test(text)) return { intentType: 'STATUS_REQUEST', actionability: 'INFORMATIONAL', confidence: 0.84 };
  if (/(search|find|tìm)/iu.test(text)) return { intentType: 'SEARCH_REQUEST', actionability: 'INFORMATIONAL', confidence: 0.84 };
  if (/(cancel|hủy)/iu.test(text)) return { intentType: 'CANCEL_REQUEST', actionability: 'ACTIONABLE', confidence: 0.9 };
  if (/(delete|xóa)/iu.test(text)) return { intentType: 'DELETE_REQUEST', actionability: 'ACTIONABLE', confidence: 0.9 };
  if (/(create|tạo)/iu.test(text)) return { intentType: 'CREATE_REQUEST', actionability: 'ACTIONABLE', confidence: 0.86 };
  if (/(update|change|đổi|đặt|set)/iu.test(text)) return { intentType: /voice|giọng|language|ngôn ngữ/iu.test(text) ? 'CONFIGURATION_REQUEST' : 'UPDATE_REQUEST', actionability: 'ACTIONABLE', confidence: 0.85 };
  if (/(approve|phê duyệt)/iu.test(text)) return { intentType: 'APPROVE_REQUEST', actionability: 'ACTIONABLE', confidence: 0.88 };
  if (/(revoke|thu hồi)/iu.test(text)) return { intentType: 'REVOKE_REQUEST', actionability: 'ACTIONABLE', confidence: 0.88 };
  return { intentType: 'UNKNOWN', actionability: 'INFORMATIONAL', confidence: 0.25 };
}
