# BOWCON V4.0 — MS-1.3.8 Intent Model

## English

MS-1.3.8 adds a REAL deterministic semantic interpretation layer. `IntentService` consumes the latest text plus the already scoped ConversationContext and WorkingMemory, then produces `SemanticIntent`: intent type, explicit entities, parameters, resolved references, confidence, clarification requirements, and a data-only candidate action.

The layer performs no I/O. It does not call `ToolRegistry`, `PolicyDecisionPoint`, `ApprovalService`, `IdempotencyStore`, voice services, or durable memory. Ambiguous or missing data produces structured clarification rather than a guess. It is invoked after AgentLoop Stage 2 and before existing Stage 3 planning.

## Tiếng Việt

MS-1.3.8 bổ sung lớp diễn giải ngữ nghĩa xác định, ở mức REAL. `IntentService` nhận text mới nhất cùng ConversationContext và WorkingMemory đã được scope, sau đó tạo `SemanticIntent`: loại intent, entity rõ ràng, parameter, reference đã phân giải, confidence, yêu cầu clarification và candidate action chỉ-dữ-liệu.

Lớp này không thực hiện I/O. Nó không gọi `ToolRegistry`, `PolicyDecisionPoint`, `ApprovalService`, `IdempotencyStore`, dịch vụ voice hoặc durable memory. Dữ liệu mơ hồ hoặc thiếu tạo clarification có cấu trúc thay vì phỏng đoán. Nó được gọi sau Stage 2 của AgentLoop và trước Stage 3 planning hiện hữu.

## Security / Bảo mật

Input is bounded to 8,192 characters and rejects malformed values, null bytes, control characters, and non-string input. There is no global mutable intent state; all supplied context is already scoped by `userId + sessionId`.

Input được giới hạn 8.192 ký tự và từ chối giá trị sai dạng, byte null, ký tự điều khiển và input không phải string. Không có intent state global có thể thay đổi; mọi context được cung cấp đã scope theo `userId + sessionId`.
