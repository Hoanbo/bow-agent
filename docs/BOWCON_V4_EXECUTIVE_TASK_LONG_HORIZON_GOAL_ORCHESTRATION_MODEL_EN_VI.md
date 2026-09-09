# BOWCON V4 — Executive Task & Long-Horizon Goal Orchestration / Điều phối mục tiêu dài hạn

## Purpose / Mục đích

The Executive Runtime turns an authorized objective into a durable task DAG. It is an orchestrator, not a second host-execution engine. Cognitive output is advisory; governance and authorization remain mandatory before execution.

Executive Runtime nhận mục tiêu đã được ủy quyền và tạo DAG tác vụ bền vững. Đây là lớp điều phối, không phải engine thực thi host thứ hai. Đầu ra nhận thức chỉ mang tính tư vấn; governance và authorization luôn bắt buộc trước khi thực thi.

## Control and lifecycle / Điều khiển và vòng đời

`USER_STOP > ExecutiveRuntime > autonomous execution`. STOP blocks submission and future scheduling; CANCEL terminates one goal; PAUSE preserves its durable state; RESUME returns through the governed state machine. Goal transitions and task transitions are fail-closed matrices. A task becomes complete only after execution and independent verification; goal completion is computed from the authoritative task ledger.

`USER_STOP > ExecutiveRuntime > thực thi tự động`. STOP chặn nộp mục tiêu và lập lịch mới; CANCEL kết thúc một mục tiêu; PAUSE giữ trạng thái bền vững; RESUME quay lại qua state machine có governance. Chuyển trạng thái goal/task dùng ma trận fail-closed. Task chỉ hoàn tất sau execution và independent verification; goal completion được tính từ task ledger.

## Dependency, scheduling, and authority / Phụ thuộc, lập lịch, thẩm quyền

`ExecutiveDependencyGraph` rejects duplicate IDs, self-dependencies, orphan dependencies, and cycles. Ready tasks require every parent to reach the requested completion state. The scheduler applies priority only after dependency, resource-lock, governance, and human-approval checks; priority never bypasses authority. HIGH/CRITICAL and explicitly gated operations wait for a human authorization token.

`ExecutiveDependencyGraph` từ chối ID trùng, tự phụ thuộc, phụ thuộc mồ côi và chu trình. Task sẵn sàng chỉ khi mọi parent đạt trạng thái yêu cầu. Scheduler chỉ áp dụng ưu tiên sau kiểm tra dependency, resource lock, governance và human approval; ưu tiên không thể vượt quyền. HIGH/CRITICAL và thao tác được gate rõ ràng phải chờ token ủy quyền của con người.

## Recovery and durability / Khôi phục và độ bền

Retries are bounded by task policy (default maximum three attempts). Failure is classified for recovery or escalation; escalation records identify the blocked task, risk, attempts, diagnosis, and required operator decision. Checkpoints carry the goal, task ledger, progress, escalation records, and SHA-256 checksum. Restore rejects incompatible, stale, tampered, cross-session/cross-goal, or graph-invalid checkpoints and rehydrates the original goal/task identities.

Retry bị giới hạn bởi policy của task (mặc định tối đa ba lần). Lỗi được phân loại để recovery hoặc escalation; escalation record nêu task bị chặn, risk, số lần thử, chẩn đoán và quyết định cần từ operator. Checkpoint chứa goal, task ledger, progress, escalation record và SHA-256. Restore từ chối checkpoint không tương thích, stale, bị sửa, sai session/goal hoặc DAG không hợp lệ; đồng thời khôi phục đúng ID goal/task ban đầu.

## Security and isolation / Bảo mật và cô lập

Executive audit events form a SHA-256 previous-hash chain and recursively redact secrets as `[REDACTED_SECRET]`. Goals are session-scoped and session-mismatched reads fail. Governance blocks protected workspace references and unrestricted-shell/eval patterns. The executive package does not access `C:\BOW\shopofbow`.

Executive audit event tạo chuỗi SHA-256 previous-hash và xóa bí mật đệ quy thành `[REDACTED_SECRET]`. Goal thuộc session cụ thể và đọc sai session sẽ thất bại. Governance chặn tham chiếu protected workspace và mẫu unrestricted shell/eval. Package executive không truy cập `C:\BOW\shopofbow`.

## Verification / Kiểm chứng

`tests/test_v4_agent_executive_task_orchestration.ts` verifies DAG safety, checkpoint integrity/staleness, durable identity, end-to-end governed execution, progress, audit integrity, pause/resume/cancel/stop, and session isolation.
