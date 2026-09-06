# BOWCON V4.0 — SECURITY MODEL (BILINGUAL)
# Mô Hình Bảo Mật BOWCON V4.0 (Song Ngữ)

---

## Overview / Tổng Quan

**EN:** BOWCON V4.0 implements a defense-in-depth security model. Every boundary has independent protection. Failure of one layer does not defeat another.

**VI:** BOWCON V4.0 triển khai mô hình bảo mật nhiều lớp (defense-in-depth). Mỗi ranh giới có sự bảo vệ độc lập. Sự cố của một lớp không ảnh hưởng đến lớp khác.

---

## 1. User Isolation / Cô Lập Người Dùng

**Threat (Mối đe dọa):**
User A reads or writes User B's data.

User A đọc hoặc ghi dữ liệu của User B.

**Defense (Phòng thủ):**
Every store is keyed by `${userId}::${sessionId}`. Data for different users is stored in separate physical files in separate directories.

Mỗi kho lưu trữ được khóa bằng `${userId}::${sessionId}`. Dữ liệu cho người dùng khác nhau được lưu trong các file vật lý riêng biệt trong các thư mục riêng.

**Implementation (Triển khai):**
- `MemoryStore.buildScopeKey()` → composite key
- `UserPartitionResolver.resolveUserPartition()` → safe file path per user
- `ContextStore` partition map keyed by `userId::sessionId`

**Tests (Kiểm thử):**
- `test_v4_memory_session_isolation.ts` Section 7
- `test_v4_multi_user_durable_memory.ts` Section 2, 3, 4
- `test_v4_agent_conversation_context.ts` Section 7

---

## 2. Session Isolation / Cô Lập Phiên Làm Việc

**Threat (Mối đe dọa):**
Session A leaks conversation data into Session B for the same user.

Session A rò rỉ dữ liệu hội thoại vào Session B của cùng một người dùng.

**Defense (Phòng thủ):**
Working memory and context store use `userId::sessionId` composite keys. Even if the same user has multiple concurrent sessions, they are isolated from each other.

Bộ nhớ làm việc và context store sử dụng khóa tổng hợp `userId::sessionId`. Ngay cả khi cùng một người dùng có nhiều session đồng thời, chúng được cô lập khỏi nhau.

**Tests (Kiểm thử):**
- `test_v4_agent_conversation_context.ts` Section 6

---

## 3. Tenant Isolation / Cô Lập Người Thuê

**Threat (Mối đe dọa):**
One tenant's approval tokens or idempotency entries are accessible by another tenant.

Token phê duyệt hoặc mục nhập idempotency của một người thuê có thể truy cập được bởi người thuê khác.

**Defense (Phòng thủ):**
ApprovalService and IdempotencyStore maintain per-user DurableJsonStore instances in physically separate directories. Token ownership is verified against `ownerUserId` on every consume operation.

ApprovalService và IdempotencyStore duy trì các phiên bản DurableJsonStore riêng cho mỗi người dùng trong các thư mục vật lý riêng biệt. Quyền sở hữu token được xác minh theo `ownerUserId` ở mỗi thao tác tiêu thụ.

**Tests (Kiểm thử):**
- `test_v4_multi_tenant_approval_idempotency.ts` Sections 5, 6, 9, 16, 17, 18

---

## 4. Token Ownership / Quyền Sở Hữu Token

**Threat (Mối đe dọa):**
User A submits User B's execution token to perform an action on B's behalf.

User A gửi token thực thi của User B để thực hiện hành động thay mặt B.

**Defense (Phòng thủ):**
`ApprovalService.consumeToken()` requires that the `userId` of the consumer matches the `ownerUserId` stored in the approval record. Any mismatch results in POLICY_DENIED.

`ApprovalService.consumeToken()` yêu cầu `userId` của người tiêu thụ phải khớp với `ownerUserId` được lưu trong bản ghi phê duyệt. Bất kỳ sự không khớp nào đều dẫn đến POLICY_DENIED.

**Tests (Kiểm thử):**
- `test_v4_multi_tenant_approval_idempotency.ts` Section 18

---

## 5. Token Consumption (One-Time Use) / Tiêu Thụ Token (Sử Dụng Một Lần)

**Threat (Mối đe dọa):**
A captured execution token is replayed to execute an action a second time.

Một token thực thi bị chụp lại và được phát lại để thực thi hành động lần thứ hai.

**Defense (Phòng thủ):**
`consumeToken()` atomically transitions the token status from `APPROVED` to `CONSUMED`. Any subsequent attempt to use the same token finds status `CONSUMED` and is rejected.

`consumeToken()` nguyên tử chuyển trạng thái token từ `APPROVED` sang `CONSUMED`. Mọi nỗ lực tiếp theo sử dụng cùng token đều thấy trạng thái `CONSUMED` và bị từ chối.

**Tests (Kiểm thử):**
- `test_v4_multi_tenant_approval_idempotency.ts` Section 8

---

## 6. Idempotency Reservation / Đặt Trước Idempotency

**Threat (Mối đe dọa):**
Two concurrent requests with the same idempotency key both execute, causing a duplicate side-effect (e.g., double payment).

Hai yêu cầu đồng thời có cùng khóa idempotency đều thực thi, gây ra tác dụng phụ trùng lặp (ví dụ: thanh toán kép).

**Defense (Phòng thủ):**
`IdempotencyStore.reserve()` marks the entry as `IN_PROGRESS` immediately. Any concurrent request finding `IN_PROGRESS` is blocked. Only after the first request completes does the entry transition to `SUCCESS` or `FAILURE`.

`IdempotencyStore.reserve()` đánh dấu mục nhập là `IN_PROGRESS` ngay lập tức. Bất kỳ yêu cầu đồng thời nào tìm thấy `IN_PROGRESS` đều bị chặn. Chỉ sau khi yêu cầu đầu tiên hoàn thành, mục nhập mới chuyển sang `SUCCESS` hoặc `FAILURE`.

**Tests (Kiểm thử):**
- `test_v4_multi_tenant_approval_idempotency.ts` Sections 11, 12, 13

---

## 7. Path Traversal Defense / Phòng Thủ Duyệt Đường Dẫn

**Threat (Mối đe dọa):**
A userId of `../../etc/passwd` causes the agent to read or write outside its data directory.

userId là `../../etc/passwd` khiến agent đọc hoặc ghi bên ngoài thư mục dữ liệu của nó.

**Defense (Phòng thủ):**
`UserPartitionResolver` rejects any userId containing `..`, `/`, `\`, null bytes, or Windows reserved device names (`CON`, `NUL`, `COM1`, etc.). The resolved path is verified to start with the allowed base directory.

`UserPartitionResolver` từ chối bất kỳ userId nào chứa `..`, `/`, `\`, byte null, hoặc tên thiết bị Windows dành riêng (`CON`, `NUL`, `COM1`, v.v.). Đường dẫn đã giải quyết được xác minh bắt đầu bằng thư mục cơ sở được phép.

**Tests (Kiểm thử):**
- `test_v4_multi_user_durable_memory.ts` Section 1
- `test_v4_agent_conversation_context.ts` Section 30
- `test_v4_durable_memory_persistence.ts` Section 15

---

## 8. Null Byte Defense / Phòng Thủ Byte Null

**Threat (Mối đe dọa):**
A null byte (`\0`) in a userId or file path causes filesystem bypass on some OS implementations.

Byte null (`\0`) trong userId hoặc đường dẫn file gây ra bỏ qua filesystem trên một số triển khai OS.

**Defense (Phòng thủ):**
Both `UserPartitionResolver` and `ContextStore` explicitly check for null bytes (`\0`) and throw a security error before any filesystem operation.

Cả `UserPartitionResolver` và `ContextStore` đều kiểm tra rõ ràng các byte null (`\0`) và ném lỗi bảo mật trước bất kỳ thao tác filesystem nào.

**Tests (Kiểm thử):**
- `test_v4_agent_conversation_context.ts` Section 30

---

## 9. Windows Device-Name Defense / Phòng Thủ Tên Thiết Bị Windows

**Threat (Mối đe dọa):**
A userId of `CON`, `NUL`, `COM1`, `LPT1` causes silent I/O failures or hangs on Windows.

userId là `CON`, `NUL`, `COM1`, `LPT1` gây ra lỗi I/O thầm lặng hoặc treo trên Windows.

**Defense (Phòng thủ):**
`UserPartitionResolver` maintains an explicit blocklist of Windows reserved device names and rejects them fail-closed.

`UserPartitionResolver` duy trì danh sách chặn rõ ràng các tên thiết bị Windows dành riêng và từ chối chúng theo kiểu fail-closed.

**Tests (Kiểm thử):**
- `test_v4_multi_user_durable_memory.ts` Section 1

---

## 10. Prototype Pollution Defense / Phòng Thủ Ô Nhiễm Prototype

**Threat (Mối đe dọa):**
A configuration payload containing `{"__proto__": {"admin": true}}` silently modifies all JavaScript objects.

Tải trọng cấu hình chứa `{"__proto__": {"admin": true}}` âm thầm sửa đổi tất cả các đối tượng JavaScript.

**Defense (Phòng thủ):**
All configuration validation functions (`validateVoiceConfig`, `validateContextConfig`, `validateApprovalRecords`) explicitly check for `__proto__`, `constructor`, and `prototype` keys before processing any object. If detected, a security error is thrown.

Tất cả các hàm xác thực cấu hình đều kiểm tra rõ ràng các khóa `__proto__`, `constructor`, và `prototype` trước khi xử lý bất kỳ đối tượng nào.

**Tests (Kiểm thử):**
- `test_v4_agent_conversation_context.ts` Section 31
- `test_v4_durable_memory_persistence.ts` Section 1

---

## 11. Secret Redaction / Xóa Bí Mật Khỏi Log

**Threat (Mối đe dọa):**
API keys or tokens appear in error messages, logs, or agent responses, leaking credentials.

API key hoặc token xuất hiện trong thông báo lỗi, log, hoặc phản hồi agent, làm rò rỉ thông tin xác thực.

**Defense (Phòng thủ):**
`scanSecurity()` and `redactPii()` in `src/core/security.ts` scan all error messages and responses for patterns matching API keys, tokens, and secrets. Detected values are replaced with `[REDACTED]`.

`scanSecurity()` và `redactPii()` trong `src/core/security.ts` quét tất cả thông báo lỗi và phản hồi để tìm các mẫu khớp với API key, token và bí mật. Các giá trị được phát hiện được thay thế bằng `[REDACTED]`.

**Tests (Kiểm thử):**
- `test_v4_agent_loop.ts` Section 11
- `test_v4_agent_voice_runtime.ts` Section 13

---

## 12. Fail-Closed Behavior / Hành Vi Từ Chối An Toàn Khi Lỗi

**Threat (Mối đe dọa):**
An error in a security check causes the check to be silently skipped, allowing unauthorized access.

Lỗi trong một kiểm tra bảo mật khiến kiểm tra bị bỏ qua âm thầm, cho phép truy cập trái phép.

**Defense (Phòng thủ):**
All security-critical paths (PDP evaluation, token consumption, partition resolution) are wrapped in try-catch that converts any unexpected error into a denial, not an allow. The default is always to deny.

Tất cả các đường dẫn quan trọng về bảo mật đều được bọc trong try-catch chuyển đổi bất kỳ lỗi không mong muốn nào thành từ chối, không phải cho phép.

---

## 13. Corruption Quarantine / Cách Ly Dữ Liệu Bị Hỏng

**Threat (Mối đe dọa):**
A crashed write leaves a half-written JSON file that silently returns garbage data when read.

Một lần ghi bị crash để lại file JSON được ghi nửa chừng, âm thầm trả về dữ liệu rác khi đọc.

**Defense (Phòng thủ):**
`DurableJsonStore` performs atomic writes (temp-file + rename). If the file is corrupt at load time, it is moved to a `.corrupted.<timestamp>` path (quarantine) before any recovery attempt. The original file is never silently overwritten.

`DurableJsonStore` thực hiện ghi nguyên tử (file tạm + đổi tên). Nếu file bị hỏng khi tải, nó được chuyển sang đường dẫn `.corrupted.<timestamp>` (cách ly) trước bất kỳ nỗ lực phục hồi nào.

**Tests (Kiểm thử):**
- `test_v4_durable_memory_persistence.ts` Section 3, 9
- `test_v4_agent_conversation_context.ts` Section 29

---

## 14. Provider Failure Isolation / Cô Lập Lỗi Provider

**Threat (Mối đe dọa):**
A TTS provider failure crashes the AgentLoop and the user loses their text response.

Lỗi provider TTS làm crash AgentLoop và người dùng mất phản hồi văn bản.

**Defense (Phòng thủ):**
Voice synthesis in Stage 7 of the AgentLoop is executed inside a try-catch. Any voice failure is logged but does not propagate to the caller. The text response is always returned regardless.

Tổng hợp giọng nói trong Stage 7 của AgentLoop được thực thi bên trong try-catch. Bất kỳ lỗi giọng nói nào đều được ghi lại nhưng không truyền cho người gọi. Phản hồi văn bản luôn được trả về bất kể điều gì.

**Tests (Kiểm thử):**
- `test_v4_agent_voice_quality.ts` Section 28
- `test_v4_agent_conversation_context.ts` Section 35

---

## 15. Text Immutability / Tính Bất Biến Của Văn Bản

**Threat (Mối đe dọa):**
The speech normalization pipeline modifies the original response text, causing the user to receive different information in audio vs. text.

Pipeline chuẩn hóa giọng nói sửa đổi văn bản phản hồi gốc, khiến người dùng nhận được thông tin khác nhau trong âm thanh so với văn bản.

**Defense (Phòng thủ):**
`SpeechTextProcessor` always works on a copy of the text. The `VoiceService.synthesize()` method does not modify `request.text`. The original agent response text is guaranteed to remain byte-for-byte identical.

`SpeechTextProcessor` luôn làm việc trên bản sao của văn bản. Phương thức `VoiceService.synthesize()` không sửa đổi `request.text`. Văn bản phản hồi agent gốc được đảm bảo vẫn giống hệt từng byte.

**Tests (Kiểm thử):**
- `test_v4_agent_voice_quality.ts` Section 26
- `test_v4_agent_voice_runtime.ts` Section 8

---

*BOWCON V4.0 Security Model — All 15 threat/defense pairs verified by automated test suite.*
*Mô hình bảo mật BOWCON V4.0 — Tất cả 15 cặp mối đe dọa/phòng thủ được xác minh bởi bộ kiểm thử tự động.*
