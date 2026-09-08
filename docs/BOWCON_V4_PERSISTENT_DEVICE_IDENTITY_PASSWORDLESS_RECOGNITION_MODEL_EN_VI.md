# BOWCON V4.0 — PERSISTENT DEVICE IDENTITY & PASSWORDLESS RECOGNITION ARCHITECTURAL RUNTIME MODEL (EN / VI)
# MÔ HÌNH KIẾN TRÚC ĐỊNH DANH THIẾT BỊ BỀN VỮNG & NHẬN DIỆN KHÔNG CẦN MẬT KHẨU (EN / VI)

**Milestone ID:** MS-1.3.24  
**Package:** `@bow/agent` (`4.0.0`)  
**Subsystem:** `src/core/deviceIdentity/`  
**Classification:** ARCHITECTURAL RUNTIME FOUNDATION (REAL)

---

## TABLE OF CONTENTS / MỤC LỤC

1. [Executive Summary & Architectural Rationale / Tóm tắt Điều hành & Cơ sở Kiến trúc](#1-executive-summary--architectural-rationale)
2. [Zero Password Login Philosophy / Triết lý Đăng nhập Không Mật khẩu](#2-zero-password-login-philosophy)
3. [Strict Invariant Boundaries / Các Ranh giới Bất biến Nghiêm ngặt](#3-strict-invariant-boundaries)
4. [Recognition vs Execution Authority / Nhận diện so với Quyền Thực thi](#4-recognition-vs-execution-authority)
5. [Device Trust vs Brain Cognitive Authority / Độ tin cậy Thiết bị so với Quyền Nhận thức Brain](#5-device-trust-vs-brain-cognitive-authority)
6. [Identifier Separation / Phân tách Định danh (Device, Session, Pairing, Trust IDs)](#6-identifier-separation)
7. [Persistence vs Brain Memory / Tính Bền vững so với Bộ nhớ Brain](#7-persistence-vs-brain-memory)
8. [Rehydration vs Authorization / Tái nạp Bản ghi so with Cấp phép](#8-rehydration-vs-authorization)
9. [Recognition vs Tool Execution / Nhận diện so với Thực thi Công cụ](#9-recognition-vs-tool-execution)
10. [Fail-Closed Revocation Semantics / Ngữ nghĩa Thu hồi Đóng-khi-Lỗi](#10-fail-closed-revocation-semantics)
11. [Clone Device Defense Model / Mô hình Phòng thủ Thiết bị Nhân bản](#11-clone-device-defense-model)
12. [Stale Proof & Replay Defense / Phòng thủ Bằng chứng Cũ & Phát lại](#12-stale-proof--replay-defense)
13. [Monotonic Key Versioning / Đánh số Phiên bản Khóa Đơn điệu](#13-monotonic-key-versioning)
14. [Multi-Device Per User Architecture / Kiến trúc Nhiều Thiết bị Mỗi Người dùng](#14-multi-device-per-user-architecture)
15. [Multi-Session Per Device Architecture / Kiến trúc Nhiều Phiên Mỗi Thiết bị](#15-multi-session-per-device-architecture)
16. [16 Canonical Persistent Device States / 16 Trạng thái Thiết bị Bền vững](#16-16-canonical-persistent-device-states)
17. [5 Device Key States / 5 Trạng thái Khóa Thiết bị](#17-5-device-key-states)
18. [Device Key Material Abstraction (`privateKeyRef`) / Trừu tượng hóa Vật liệu Khóa](#18-device-key-material-abstraction)
19. [Cryptographic Challenge-Response Protocol / Giao thức Thách đố - Phản hồi](#19-cryptographic-challenge-response-protocol)
20. [Proof-of-Possession Verification / Xác minh Bằng chứng Sở hữu Khóa](#20-proof-of-possession-verification)
21. [Persistent Device Trust Record Schema & Fingerprinting / Cấu trúc Bản ghi & Băm Định danh](#21-persistent-device-trust-record-schema--fingerprinting)
22. [Copy-on-Write Storage Abstraction / Trừu tượng hóa Lưu trữ Copy-on-Write](#22-copy-on-write-storage-abstraction)
23. [9-Tuple Scope Isolation / Cô lập Phạm vi 9 Thành phần](#23-9-tuple-scope-isolation)
24. [Device Rehydration Workflow / Quy trình Tái nạp Bản ghi Thiết bị](#24-device-rehydration-workflow)
25. [Authoritative Revocation & Key Destruction / Thu hồi Có Thẩm quyền & Hủy Khóa](#25-authoritative-revocation--key-destruction)
26. [Key Rotation Protocol / Giao thức Luân chuyển Khóa](#26-key-rotation-protocol)
27. [In-Memory Registry Architecture / Kiến trúc Sổ đăng ký Bộ nhớ](#27-in-memory-registry-architecture)
28. [17 Audit Event Types & Secret Scrubbing / 17 Loại Nhật ký & Tẩy sạch Bí mật](#28-17-audit-event-types--secret-scrubbing)
29. [Typed Error Hierarchy (18 Error Codes) / Hệ thống Lỗi Phân loại (18 Mã Lỗi)](#29-typed-error-hierarchy)
30. [AgentLoop Integration & Zero Cognitive Interference / Tích hợp AgentLoop & Không Can thiệp Lõi Nhận thức](#30-agentloop-integration)

---

### 1. EXECUTIVE SUMMARY & ARCHITECTURAL RATIONALE
**EN:**  
Milestone MS-1.3.24 introduces the persistent device identity and passwordless recognition foundation for BOWCON V4.0. In autonomous multi-surface systems, devices reconnect repeatedly across changing networks. Requiring human users to repeatedly enter passwords is friction-heavy and insecure. MS-1.3.24 establishes cryptographic device recognition: once paired, a device presents proof-of-possession of private key material to be recognized, establishing session eligibility without traditional password mechanisms.

**VI:**  
Milestone MS-1.3.24 thiết lập nền tảng định danh thiết bị bền vững và nhận diện không cần mật khẩu cho BOWCON V4.0. Trong hệ thống tự hành đa bề mặt, thiết bị kết nối lại liên tục qua các mạng thay đổi. Bắt người dùng nhập mật khẩu thủ công lặp đi lặp lại tạo ra ma sát lớn và tiềm ẩn rủi ro an ninh. MS-1.3.24 thiết lập khả năng nhận diện mật mã học: sau khi ghép nối thành công, thiết bị chứng minh quyền sở hữu khóa bí mật để được nhận diện và đủ điều kiện mở phiên mà không cần mật khẩu truyền thống.

---

### 2. ZERO PASSWORD LOGIN PHILOSOPHY
**EN:**  
BOWCON V4.0 completely eliminates traditional username and password prompts for device recognition. Passwordless recognition is accomplished via asymmetric cryptographic challenge-response: the Brain issues an ephemeral nonced challenge, and the device signs it using its local key material (referenced via opaque `privateKeyRef`). Password databases, plaintext hashes, and credential stuffing vectors are entirely avoided.

**VI:**  
BOWCON V4.0 loại bỏ hoàn toàn biểu mẫu đăng nhập bằng tên người dùng và mật khẩu truyền thống. Nhận diện không mật khẩu được thực hiện qua giao thức thách đố - phản hồi bất đối xứng: Brain phát hành một thách đố tạm thời kèm nonce, và thiết bị ký thách đố bằng vật liệu khóa cục bộ (được tham chiếu qua `privateKeyRef` mờ đục). Không tồn tại cơ sở dữ liệu mật khẩu, mã băm mật khẩu hay nguy cơ tấn công credential stuffing.

---

### 3. STRICT INVARIANT BOUNDARIES
**EN:**  
The runtime enforces the absolute security inequality:
`DEVICE_IDENTITY ≠ DEVICE_AUTHENTICATION ≠ AUTHORIZATION ≠ EXECUTION`
Recognizing that a specific device hardware is presenting a valid signature proves identity and session eligibility ONLY. It never authorizes privileged tool actions or robot actuator commands.

**VI:**  
Runtime thực thi bất đẳng thức an ninh tuyệt đối:
`DEVICE_IDENTITY ≠ DEVICE_AUTHENTICATION ≠ AUTHORIZATION ≠ EXECUTION`
Việc nhận diện một phần cứng thiết bị gửi chữ ký hợp lệ CHỈ chứng minh danh tính và tính đủ điều kiện mở phiên. Nó tuyệt đối không cấp quyền thực thi công cụ đặc quyền hay điều khiển bộ truyền động robot.

---

### 4. RECOGNITION VS EXECUTION AUTHORITY
**EN:**  
`DEVICE_RECOGNITION ≠ EXECUTION_AUTHORITY`. A recognized device enters `SESSION_ELIGIBLE`. To execute tools, every subsequent request must traverse Stage 4 (PolicyDecisionPoint / PDP), verification postconditions, and explicit human approval where required.

**VI:**  
`DEVICE_RECOGNITION ≠ EXECUTION_AUTHORITY`. Một thiết bị được nhận diện sẽ bước vào trạng thái `SESSION_ELIGIBLE`. Để thực thi công cụ, mọi yêu cầu tiếp theo bắt buộc phải đi qua Giai đoạn 4 (PDP), xác minh hậu điều kiện và phê duyệt rõ ràng của con người khi cần thiết.

---

### 5. DEVICE TRUST VS BRAIN COGNITIVE AUTHORITY
**EN:**  
`DEVICE_TRUST ≠ BRAIN_AUTHORITY`. Device identity belongs strictly to the edge and transport periphery. It cannot mutate Brain system prompts, cognitive rules, memory models, or decision rationale.

**VI:**  
`DEVICE_TRUST ≠ BRAIN_AUTHORITY`. Định danh thiết bị hoàn toàn thuộc về ngoại vi kết nối và biên mạng. Nó không thể biến đổi system prompt, quy tắc nhận thức, mô hình bộ nhớ hay lý luận quyết định của Brain.

---

### 6. IDENTIFIER SEPARATION
**EN:**  
- `deviceId`: Deterministic identifier for hardware surface (`device_<fp>`).
- `sessionId`: Ephemeral conversation lifecycle identifier (`sess_<uuid>`).
- `pairingId`: Canonical identifier for the pairing relationship (`pair_<fp>`).
- `trustId`: Identifier for the persistent trust grant (`ptrust_<fp>`).
`DEVICE_ID ≠ SESSION_ID`, `PAIRING_ID ≠ SESSION_ID`, and `TRUST_ID ≠ SESSION_ID`.

**VI:**  
- `deviceId`: Định danh tất định của bề mặt phần cứng (`device_<fp>`).
- `sessionId`: Định danh vòng đời phiên hội thoại tạm thời (`sess_<uuid>`).
- `pairingId`: Định danh mối quan hệ ghép nối (`pair_<fp>`).
- `trustId`: Định danh chứng nhận ủy thác bền vững (`ptrust_<fp>`).
Các định danh này hoàn toàn độc lập và không thể thay thế cho nhau.

---

### 7. PERSISTENCE VS BRAIN MEMORY
**EN:**  
`PERSISTENCE ≠ BRAIN_MEMORY`. Persistent device records are saved in the logical device store (`PersistentDeviceStore`), completely isolated from conversation memory, Boss profile memory, and learned cognitive rules.

**VI:**  
`PERSISTENCE ≠ BRAIN_MEMORY`. Các bản ghi thiết bị bền vững được lưu trong kho lưu trữ thiết bị (`PersistentDeviceStore`), hoàn toàn cách ly khỏi bộ nhớ hội thoại, hồ sơ Boss và các quy tắc học được của Brain.

---

### 8. REHYDRATION VS AUTHORIZATION
**EN:**  
`REHYDRATION ≠ AUTHORIZATION`. Loading a stored trust record from disk into memory simply restores knowledge of previous enrollment. It does NOT authorize session commands until a fresh challenge-response proof is verified.

**VI:**  
`REHYDRATION ≠ AUTHORIZATION`. Việc nạp bản ghi ủy thác từ đĩa vào bộ nhớ chỉ khôi phục thông tin về việc thiết bị đã từng được đăng ký. Nó KHÔNG cấp quyền thực thi phiên cho đến khi một bằng chứng thách đố mới được xác minh thành công.

---

### 9. RECOGNITION VS TOOL EXECUTION
**EN:**  
`RECOGNITION ≠ TOOL_EXECUTION`. The persistent device identity subsystem contains 0 tool execution primitives. Tool execution remains exclusively gated by `ToolRegistry` and `ExecutionService`.

**VI:**  
`RECOGNITION ≠ TOOL_EXECUTION`. Phân hệ định danh thiết bị chứa 0 cơ chế thực thi công cụ. Việc thực thi công cụ vẫn do `ToolRegistry` và `ExecutionService` độc quyền quản lý.

---

### 10. FAIL-CLOSED REVOCATION SEMANTICS
**EN:**  
When a device is revoked (`lifecycleState = 'REVOKED'`), all associated cryptographic keys are invalidated. Future challenge generation, proof verification, rehydration, and session eligibility immediately fail closed. Revocation cannot be undone without fresh physical pairing.

**VI:**  
Khi thiết bị bị thu hồi (`lifecycleState = 'REVOKED'`), toàn bộ khóa mật mã liên quan đều bị vô hiệu hóa. Mọi nỗ lực tạo thách đố, xác minh bằng chứng, tái nạp và mở phiên sau đó đều lập tức thất bại theo cơ chế đóng (fail closed). Việc thu hồi là vĩnh viễn và chỉ có thể phục hồi qua quy trình ghép nối vật lý mới.

---

### 11. CLONE DEVICE DEFENSE MODEL
**EN:**  
An attacker cannot gain recognition simply by presenting a stolen `deviceId`. Proof generation requires signing challenge payloads with private key material bound to `privateKeyRef`. Any discrepancy between the challenge `deviceId` and key `deviceId` triggers `DEVICE_CLONE_DETECTED`.

**VI:**  
Kẻ tấn công không thể đạt được nhận diện chỉ bằng việc sao chép `deviceId`. Việc tạo bằng chứng đòi hỏi phải ký nội dung thách đố bằng vật liệu khóa bí mật liên kết với `privateKeyRef`. Bất kỳ sự sai lệch nào giữa `deviceId` trong thách đố và khóa sẽ kích hoạt lỗi `DEVICE_CLONE_DETECTED`.

---

### 12. STALE PROOF & REPLAY DEFENSE
**EN:**  
Every challenge contains a unique cryptographic `nonce` and short TTL (default 60 seconds). Once a challenge is consumed, it is purged. Proof nonces are stored in the registry's anti-replay cache; re-submitting an identical proof triggers `DEVICE_PROOF_REPLAY`.

**VI:**  
Mỗi thách đố chứa một `nonce` mật mã duy nhất và thời gian sống ngắn (mặc định 60 giây). Khi đã được sử dụng, thách đố sẽ bị xóa ngay lập tức. Nonce của bằng chứng được ghi nhận trong bộ đệm chống phát lại; việc gửi lại bằng chứng cũ sẽ kích hoạt lỗi `DEVICE_PROOF_REPLAY`.

---

### 13. MONOTONIC KEY VERSIONING
**EN:**  
Device keys have strictly monotonic versions (v1, v2, v3...). When keys rotate, previous versions are marked `ROTATED` and permanently refused for new challenge proofs. Stale proofs presenting old key versions trigger `DEVICE_KEY_INVALID`.

**VI:**  
Khóa thiết bị có số phiên bản tăng đơn điệu nghiêm ngặt (v1, v2, v3...). Khi luân chuyển khóa, phiên bản cũ được đánh dấu `ROTATED` và bị từ chối vĩnh viễn đối với các thách đố mới. Bằng chứng sử dụng khóa cũ sẽ kích hoạt lỗi `DEVICE_KEY_INVALID`.

---

### 14. MULTI-DEVICE PER USER ARCHITECTURE
**EN:**  
`ONE_USER ≠ ONE_DEVICE`. A single user identity can enroll and operate multiple distinct devices (e.g. workstation, phone, tablet, robot surface). Revoking or rotating keys on one device has zero side effects on the user's other devices.

**VI:**  
`ONE_USER ≠ ONE_DEVICE`. Một người dùng có thể đăng ký và vận hành nhiều thiết bị độc lập (máy trạm, điện thoại, máy tính bảng, bề mặt robot). Việc thu hồi hoặc luân chuyển khóa trên một thiết bị không gây ảnh hưởng đến các thiết bị khác của cùng người dùng.

---

### 15. MULTI-SESSION PER DEVICE ARCHITECTURE
**EN:**  
`ONE_DEVICE ≠ ONE_SESSION`. A single trusted device can connect to multiple independent sessions over its lifetime. Each session maintains distinct memory, continuity context, and transport snapshots.

**VI:**  
`ONE_DEVICE ≠ ONE_SESSION`. Một thiết bị đáng tin cậy có thể kết nối với nhiều phiên độc lập trong suốt vòng đời của nó. Mỗi phiên duy trì bộ nhớ, ngữ cảnh liên tục và ảnh chụp truyền tải hoàn toàn riêng biệt.

---

### 16. 16 CANONICAL PERSISTENT DEVICE STATES
**EN:**  
1. `UNSEEN`: Device unknown to system.
2. `IDENTITY_PRESENT`: Device metadata detected.
3. `PAIRING_REQUIRED`: Device must perform physical pairing.
4. `PAIRING_PENDING`: Pairing confirmation awaiting operator approval.
5. `PAIRED`: Pairing completed.
6. `TRUST_PENDING`: Trust record being evaluated.
7. `TRUSTED`: Trust actively granted.
8. `RECOGNITION_CHALLENGE`: Active challenge issued.
9. `PROOF_RECEIVED`: Device submitted cryptographic proof.
10. `PROOF_VERIFIED`: Proof verified cryptographically.
11. `RECOGNIZED`: Device identity recognized.
12. `SESSION_ELIGIBLE`: Device is eligible to open a governed session.
13. `REVOKED`: Trust permanently revoked (terminal).
14. `ROTATION_REQUIRED`: Key rotation mandatory before next session.
15. `EXPIRED`: Trust grant expired past max age (terminal).
16. `FAILED`: Proof verification or recognition failed (terminal).

**VI:**  
16 trạng thái thiết bị chuẩn hóa bao quát toàn bộ vòng đời: từ phát hiện ban đầu, yêu cầu ghép nối, ủy thác, thách đố nhận diện, nộp bằng chứng, xác minh, đến đủ điều kiện phiên, hoặc rơi vào các trạng thái kết thúc như thu hồi, hết hạn và thất bại.

---

### 17. 5 DEVICE KEY STATES
**EN:**  
`ACTIVE` (usable for signatures), `ROTATION_REQUIRED` (must rotate), `ROTATED` (obsolete, replaced), `REVOKED` (invalidated), `EXPIRED` (past validity lifetime). Transitions are strictly unidirectional.

**VI:**  
5 trạng thái khóa: `ACTIVE` (đang hoạt động), `ROTATION_REQUIRED` (cần luân chuyển), `ROTATED` (đã thay thế), `REVOKED` (đã thu hồi), `EXPIRED` (hết hạn). Quá trình chuyển đổi là một chiều và không thể đảo ngược.

---

### 18. DEVICE KEY MATERIAL ABSTRACTION
**EN:**  
Raw private keys are NEVER stored in memory, serialized in JSON, or persisted in storage. Instead, key metadata contains an opaque `privateKeyRef` (e.g. `ref://keystore/${deviceId}/${keyId}`). Key operations (signing and verification) are dispatched through `DeviceKeyStore`.

**VI:**  
Khóa bí mật thô TUYỆT ĐỐI KHÔNG được lưu trong bộ nhớ, serialize ra JSON hay ghi xuống ổ đĩa. Thay vào đó, siêu dữ liệu khóa chứa tham chiếu mờ đục `privateKeyRef`. Mọi thao tác ký và xác minh đều được điều phối qua giao diện `DeviceKeyStore`.

---

### 19. CRYPTOGRAPHIC CHALLENGE-RESPONSE PROTOCOL
**EN:**  
1. Client/Device requests recognition in target 9-tuple scope.
2. Runtime verifies device record and issues `DeviceChallenge` with random nonce and 60s TTL.
3. Device signs challenge binding `${challengeId}::${deviceId}::${nonce}::${scopeString}::${keyVersion}`.
4. Device returns `DeviceProof`.

**VI:**  
1. Thiết bị yêu cầu nhận diện trong phạm vi 9 thành phần.
2. Runtime kiểm tra bản ghi và phát hành `DeviceChallenge` kèm nonce và thời hạn 60 giây.
3. Thiết bị ký nội dung ràng buộc đầy đủ các trường nhận dạng và phạm vi.
4. Thiết bị gửi lại `DeviceProof`.

---

### 20. PROOF-OF-POSSESSION VERIFICATION
**EN:**  
The runtime performs a 5-step verification:
1. Expiration check: Current time ≤ challenge `expiresAt`.
2. Integrity check: Proof `challengeId` and `nonce` match challenge.
3. Identity check: Proof `deviceId` matches challenge `deviceId` (clone defense).
4. Version check: Proof `keyVersion` matches active record `keyVersion`.
5. Cryptographic signature check: Signature validates via public key material.

**VI:**  
Runtime thực hiện xác minh 5 bước: kiểm tra thời hạn, tính toàn vẹn challengeId/nonce, trùng khớp deviceId, đúng phiên bản khóa, và xác minh chữ ký mật mã bằng khóa công khai.

---

### 21. PERSISTENT DEVICE TRUST RECORD SCHEMA & FINGERPRINTING
**EN:**  
Each record maintains an immutable cryptographic fingerprint computed via 32-bit FNV-1a over canonicalized record attributes including device ID, scope, public key ID, key version, and order-independent capability envelope. Any unauthorized mutation invalidates the fingerprint.

**VI:**  
Mỗi bản ghi duy trì một chữ ký băm mật mã bất biến tính toán qua thuật toán FNV-1a 32-bit trên toàn bộ thuộc tính chuẩn hóa. Mọi sửa đổi trái phép trên dữ liệu đều làm sai lệch mã băm và khiến bản ghi bị từ chối ngay lập tức.

---

### 22. COPY-ON-WRITE STORAGE ABSTRACTION
**EN:**  
`PersistentDeviceStore` abstracts physical persistence. For MS-1.3.24, `InMemoryPersistentDeviceStore` implements copy-on-write semantics by serializing records as JSON strings and returning deeply frozen objects on retrieval, preventing reference mutation leaks.

**VI:**  
`PersistentDeviceStore` trừu tượng hóa việc lưu trữ bền vững. Trong MS-1.3.24, `InMemoryPersistentDeviceStore` thực thi cơ chế copy-on-write bằng cách lưu trữ dưới dạng chuỗi JSON và trả về đối tượng đóng băng sâu (`deepFreezeDevice`), ngăn ngừa rò rỉ đột biến tham chiếu.

---

### 23. 9-TUPLE SCOPE ISOLATION
**EN:**  
Every device operation is strictly isolated by the 9-tuple:
`userId::sessionId::brainId::surfaceId::transportId::gatewayId::adapterId::connectionId::deviceId`
Cross-tenant or cross-surface recognition attempts are rejected with `DEVICE_SCOPE_MISMATCH`.

**VI:**  
Mọi thao tác thiết bị đều bị cô lập nghiêm ngặt bởi bộ 9 thành phần. Mọi nỗ lực nhận diện chéo tenant hoặc chéo bề mặt đều bị chặn với mã lỗi `DEVICE_SCOPE_MISMATCH`.

---

### 24. DEVICE REHYDRATION WORKFLOW
**EN:**  
Upon Brain restart or reconnect, `rehydratePersistentDevice` reads serialized data, validates schema, verifies deterministic fingerprint, checks revocation and expiration, and registers the verified device into the active registry.

**VI:**  
Khi Brain khởi động lại hoặc thiết bị kết nối, quy trình tái nạp đọc dữ liệu từ kho lưu trữ, kiểm tra schema, xác minh mã băm fingerprint, rà soát trạng thái thu hồi/hết hạn và đăng ký thiết bị vào sổ bộ nhớ.

---

### 25. AUTHORITATIVE REVOCATION & KEY DESTRUCTION
**EN:**  
Revoking a device authoritatively sets `lifecycleState = 'REVOKED'`, `revoked = true`, timestamps the event, destroys or revokes all cryptographic key material in `DeviceKeyStore`, and records a permanent audit entry.

**VI:**  
Thu hồi thiết bị sẽ chuyển trạng thái sang `REVOKED`, đánh dấu thu hồi, ghi nhận thời gian, vô hiệu hóa toàn bộ khóa trong `DeviceKeyStore` và ghi nhật ký kiểm toán vĩnh viễn.

---

### 26. KEY ROTATION PROTOCOL
**EN:**  
Key rotation generates a fresh key pair, increments `keyVersion` monotonically, marks the old key `ROTATED`, recomputes the record's deterministic fingerprint, updates storage and registry, and emits `DEVICE_KEY_ROTATED` audit.

**VI:**  
Luân chuyển khóa tạo cặp khóa mới, tăng đơn điệu `keyVersion`, đánh dấu khóa cũ là `ROTATED`, tính toán lại mã băm fingerprint, cập nhật lưu trữ và ghi nhận nhật ký kiểm toán.

---

### 27. IN-MEMORY REGISTRY ARCHITECTURE
**EN:**  
`PersistentDeviceRegistry` indexes records across four lookup dimensions:
1. By `deviceId`
2. By `${scopeString}::${deviceId}`
3. By `userId` (supporting multi-device per user)
4. By `deterministicFingerprint`
Additionally tracks active challenges and consumed proof nonces.

**VI:**  
`PersistentDeviceRegistry` lập chỉ mục bản ghi theo 4 chiều tra cứu: theo deviceId, theo khóa phạm vi kết hợp, theo userId (hỗ trợ đa thiết bị), và theo mã băm fingerprint. Sổ đăng ký cũng quản lý thách đố đang chờ và nonce đã tiêu thụ.

---

### 28. 17 AUDIT EVENT TYPES & SECRET SCRUBBING
**EN:**  
All device lifecycle events emit immutable audit records with deterministic `pdaudit_<fp>` identifiers. Automated recursive scrubber `scrubDeviceSecrets` redacts any field matching `/private|secret|token|password|credential|bearer|authorization|signature/i`.

**VI:**  
Mọi sự kiện vòng đời thiết bị đều phát hành bản ghi kiểm toán bất biến. Bộ lọc tự động đệ quy `scrubDeviceSecrets` kiểm duyệt và ẩn đi mọi trường nhạy cảm trước khi ghi nhận vào sổ nhật ký.

---

### 29. TYPED ERROR HIERARCHY
**EN:**  
18 Authoritative fail-closed error codes:
`DEVICE_INVALID_REQUEST`, `DEVICE_IDENTITY_MISMATCH`, `DEVICE_SCOPE_MISMATCH`, `DEVICE_KEY_INVALID`, `DEVICE_KEY_ROTATION_REQUIRED`, `DEVICE_KEY_EXPIRED`, `DEVICE_KEY_REVOKED`, `DEVICE_CHALLENGE_EXPIRED`, `DEVICE_CHALLENGE_MISMATCH`, `DEVICE_PROOF_INVALID`, `DEVICE_PROOF_REPLAY`, `DEVICE_PROOF_EXPIRED`, `DEVICE_NOT_FOUND`, `DEVICE_NOT_TRUSTED`, `DEVICE_REVOKED`, `DEVICE_CLONE_DETECTED`, `DEVICE_REHYDRATION_FAILED`, `DEVICE_INVALID_TRANSITION`.

**VI:**  
18 mã lỗi có cấu trúc chặt chẽ, kế thừa từ `PersistentDeviceError`, tự động kiểm duyệt thông tin nhạy cảm trong thuộc tính chi tiết và luôn tuân thủ nguyên tắc đóng-khi-lỗi.

---

### 30. AGENTLOOP INTEGRATION
**EN:**  
`PersistentDeviceIdentityRuntime` is wired into `AgentLoop` via dependency injection and accessor `getPersistentDeviceIdentityRuntime()`. Every loop execution populates optional `persistentDeviceContext` in `AgentLoopResult`. Zero interference with Stage 4 Policy Decision Point (PDP), verification, commit, or recovery services.

**VI:**  
`PersistentDeviceIdentityRuntime` được tích hợp vào `AgentLoop` thông qua tiêm phụ thuộc và hàm getter `getPersistentDeviceIdentityRuntime()`. Mỗi lượt thực thi trả về `persistentDeviceContext` trong `AgentLoopResult`. Quá trình này hoàn toàn không can thiệp hay làm gián đoạn PDP, bộ xác minh, dịch vụ commit hay phục hồi của Brain.
