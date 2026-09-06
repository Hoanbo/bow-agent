# BOWCON V4.0 — MS-1.3.9 Decision & Context-Aware Planning

## English

`PlanningService` converts a scoped `DecisionContext` and `SemanticIntent` into an immutable `ContextAwarePlan`. It separates intent (what the user wants), context (what was discussed), memory (known working state), and planning (the next proposed step). Plans are deterministic: their identity and default timestamp are stable unless a clock is injected at the service boundary.

Risk is semantic, not authorization: response/context work is LOW; actionable preparation is MEDIUM; create, update, cancel, and configuration requests are HIGH; delete/revoke requests are CRITICAL. High and critical plans propose `REQUEST_APPROVAL`, then an inert `EXECUTE_TOOL` step. Only the existing AgentLoop + PDP + ToolRegistry can actually execute.

Unresolved references, missing parameters, malformed input, or low confidence produce `StructuredClarification`; no entity is guessed. DecisionContext and plans are immutable and user/session scoped, reject secret-bearing context, and do not retain global planning state.

## Tiếng Việt

`PlanningService` chuyển `DecisionContext` đã scope và `SemanticIntent` thành `ContextAwarePlan` bất biến. Nó tách intent (người dùng muốn gì), context (đã trao đổi gì), memory (working state đã biết) và planning (bước tiếp theo được đề xuất). Plan có tính xác định: định danh và timestamp mặc định ổn định, trừ khi clock được inject tại service boundary.

Risk là ngữ nghĩa, không phải quyền hạn: phản hồi/context là LOW; chuẩn bị hành động là MEDIUM; create, update, cancel và configuration là HIGH; delete/revoke là CRITICAL. Plan HIGH/CRITICAL đề xuất `REQUEST_APPROVAL`, sau đó là step `EXECUTE_TOOL` không hoạt động. Chỉ AgentLoop + PDP + ToolRegistry hiện hữu mới có thể thực thi thực tế.

Reference chưa phân giải, parameter thiếu, input lỗi hoặc confidence thấp tạo `StructuredClarification`; không entity nào bị đoán. DecisionContext và plan bất biến, scope theo user/session, từ chối context chứa secret và không giữ planning state global.
