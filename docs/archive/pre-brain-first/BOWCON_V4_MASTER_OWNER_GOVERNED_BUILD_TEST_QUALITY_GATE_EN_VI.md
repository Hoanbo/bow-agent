# BOWCON V4.0 — MS-1.3.49: GOVERNED PROJECT BUILD, TEST & CONTINUOUS QUALITY GATE PIPELINE
# ĐƯỜNG ỐNG QUẢN TRỊ BUILD, TEST & CỔNG CHẤT LƯỢNG LIÊN TỤC CHO DỰ ÁN

---

## 1. ARCHITECTURAL TOPOLOGY & HIERARCHY / CẤU TRÚC VÀ PHÂN CẤP KIẾN TRÚC

### English
BOWCON V4.0 extends the verified MS-1.3.48 governed sandbox, worktree isolation, and controlled promotion subsystem with a governed project build, test, and continuous quality gate pipeline.
The architecture enforces strict fail-closed governance:

> **MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS**  
> **OWNER_DECISION > BOWCON_RECOMMENDATION**  
> **USER_STOP > EVERYTHING_AUTONOMOUS**  
> **REVOCATION > AGENT_INTENT**  
> **TASK != AUTHORITY**  
> **SANDBOX != AUTHORITY**  
> **WORKTREE != AUTHORITY**  
> **BUILD != AUTHORITY**  
> **TEST != AUTHORITY**  
> **QUALITY_RESULT != AUTHORITY**  
> **QUALITY_REPORT != AUTHORIZATION**  
> **VALIDATION != AUTHORIZATION**  
> **EVIDENCE != AUTHORITY**  
> **VERIFICATION != AUTHORIZATION**  
> **PROMOTION_PROPOSAL != PROMOTION_AUTHORIZATION**  
> **BUILD_SUCCESS != OWNER_APPROVAL**  
> **TEST_SUCCESS != OWNER_APPROVAL**  
> **QUALITY_PASS != PROMOTION_AUTHORIZATION**  
> **AGENT_COUNT != AUTHORITY_COUNT**

The Quality Subsystem operates strictly below Master Owner and Canonical Human Gate authority, functioning as an advisory evidence generation, verification, and gatekeeping boundary:

```
MASTER OWNER (Human Authority)
      │
      ▼
SUPERVISOR / HUMAN GATE (SupervisorHumanGate)
      │
      ▼
CANONICAL AUTHORIZATION (WorldActionAuthorizationEngine)
      │
      ▼
GOVERNED QUALITY PIPELINE (QualityRuntime)
      ├── Command Allowlist Registry (QualityCommandRegistry)
      ├── Execution Policy Engine (QualityPolicyEngine)
      ├── Governed Execution Engine (GovernedExecutionEngine)
      ├── In-Sandbox Build Engine (BuildExecutionEngine)
      ├── In-Sandbox Test Engine (TestExecutionEngine)
      ├── Evidence Aggregation Engine (QualityEvidenceEngine)
      ├── Cryptographic Verification Engine (QualityVerificationEngine)
      ├── Multi-Agent Contradiction Engine (QualityContradictionEngine)
      ├── Continuous Quality Gate Engine (QualityGateEngine)
      └── Quality Report Compiler (QualityReportEngine)
      │
      ▼
EVIDENCE & ADVISORY REPORT (QualityVerificationReport)
      │
      ▼
CONTROLLED PROMOTION PROPOSAL (PromotionRuntime - Optional)
      │
      ▼
CANONICAL AUDIT LEDGER (AuditLedger)
```

### Tiếng Việt
BOWCON V4.0 mở rộng nền tảng sandbox có quản trị, cô lập worktree và xúc tiến thay đổi có kiểm soát của MS-1.3.48 bằng một đường ống quản trị build, test và cổng chất lượng liên tục cho dự án.
Kiến trúc thực thi cơ chế quản trị fail-closed nghiêm ngặt:

> **QUYỀN LỰC MASTER_OWNER > BOW > BOWCON > CÁC DỰ ÁN**  
> **QUYẾT ĐỊNH CỦA OWNER > KHUYẾN NGHỊ CỦA BOWCON**  
> **DỪNG KHẨN CẤP USER_STOP TỐI CAO HƠN MỌI TIẾN TRÌNH TỰ TRỊ**  
> **THU HỒI TỐI CAO HƠN Ý ĐỊNH CỦA TÁC TỬ**  
> **NHIỆM VỤ KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **SANDBOX KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **WORKTREE KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **BUILD KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **TEST KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **KẾT QUẢ CHẤT LƯỢNG KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **BÁO CÁO CHẤT LƯỢNG KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **XÁC MINH KHÔNG PHẢI LÀ ỦY QUYỀN**  
> **BẰNG CHỨNG KHÔNG PHẢI LÀ QUYỀN LỰC**  
> **ĐỀ XUẤT XÚC TIẾN KHÔNG PHẢI LÀ ỦY QUYỀN XÚC TIẾN**  
> **BUILD THÀNH CÔNG KHÔNG PHẢI LÀ PHÊ DUYỆT CỦA OWNER**  
> **TEST THÀNH CÔNG KHÔNG PHẢI LÀ PHÊ DUYỆT CỦA OWNER**  
> **VƯỢT QUA CHẤT LƯỢNG KHÔNG PHẢI LÀ ỦY QUYỀN XÚC TIẾN**  
> **SỐ LƯỢNG TÁC TỬ KHÔNG ĐẠI DIỆN CHO SỐ LƯỢNG QUYỀN LỰC**

Phân hệ Chất lượng hoạt động nghiêm ngặt bên dưới Master Owner và Human Gate chuẩn tắc, đóng vai trò như một ranh giới tạo bằng chứng tư vấn, xác minh và chốt chặn chất lượng:

---

## 2. GOVERNED EXECUTION BOUNDARY / RANH GIỚI THỰC THI CÓ QUẢN TRỊ

### English
All build and test executions occur **exclusively inside an active governed sandbox/worktree**.
- **No Unrestricted Shell**: Ambient shell execution is strictly prohibited. Zero `eval`, `new Function`, `execSync`, `child_process.exec`, `child_process.spawn`, `child_process.fork`, `SSH`, remote shells, or arbitrary RPC.
- **Governed Command Registry**: Only pre-registered, allowlisted commands with verified handlers can be executed (`QualityCommandRegistry`).
- **Bound Execution Context**: Every command request must be cryptographically and logically bound to `sessionId`, `taskId`, `agentId`, `sandboxId`, `worktreeId`, `projectRoot`, `delegationId`, and `capabilityLeaseId`.
- **Resource & Timeout Controls**: Strict timeout limits (default 60s, configurable) with guaranteed resource cleanup and output byte limits (default 1MB).
- **Secret Sanitization**: All stdout/stderr outputs are stripped of API keys, tokens, and credentials before hashing or storage.

### Tiếng Việt
Toàn bộ hoạt động thực thi build và test diễn ra **duy nhất bên trong sandbox/worktree có quản trị đang hoạt động**.
- **Không Shell Không Giới Hạn**: Thực thi shell môi trường xung quanh bị nghiêm cấm tuyệt đối. 0 `eval`, `new Function`, `execSync`, `child_process.exec`, `child_process.spawn`, `child_process.fork`, `SSH`, remote shell, hoặc RPC tùy ý.
- **Sổ Đăng Ký Lệnh Có Quản Trị**: Chỉ các lệnh đã được đăng ký trước, nằm trong danh sách cho phép với các hàm xử lý đã được kiểm chứng mới được thực thi (`QualityCommandRegistry`).
- **Ngữ Cảnh Thực Thi Bị Ràng Buộc**: Mọi yêu cầu lệnh phải được ràng buộc logic và mật mã với `sessionId`, `taskId`, `agentId`, `sandboxId`, `worktreeId`, `projectRoot`, `delegationId`, và `capabilityLeaseId`.
- **Kiểm Soát Tài Nguyên & Thời Gian Chờ**: Giới hạn thời gian chờ nghiêm ngặt (mặc định 60s, có thể cấu hình) với việc dọn dẹp tài nguyên được đảm bảo và giới hạn kích thước đầu ra (mặc định 1MB).
- **Khử Trùng Bí Mật**: Toàn bộ dữ liệu stdout/stderr được loại bỏ các khóa API, mã token và thông tin xác thực trước khi băm hoặc lưu trữ.

---

## 3. CONTINUOUS QUALITY GATE — 7 MANDATORY STAGES / CỔNG CHẤT LƯỢNG LIÊN TỤC — 7 GIAI ĐOẠN BẮT BUỘC

### English
The `QualityGateEngine` deterministically evaluates exactly seven mandatory stages before issuing a gate verdict:
1. **TYPECHECK**: Strict TypeScript compiler type validation (`npm run typecheck`).
2. **BUILD**: Clean production compilation verification (`npm run build`).
3. **DEDICATED_REALITY_GATE**: Targeted Reality Gate test execution verifying milestone invariants.
4. **FULL_REGRESSION**: Comprehensive regression test suite spanning all historical milestones.
5. **GIT_DIFF_CHECK**: Whitespace, formatting, and structural diff check (`git diff --check`).
6. **SECURITY_SCAN**: Prohibited API scan (0 `eval`, 0 `execSync`, 0 `child_process`, 0 credentials).
7. **PROCESS_AUDIT**: Orphaned and hanging process audit ensuring zero zombie runtimes.

Possible Gate States:
- **`PASS`**: All 7 stages executed and fully verified.
- **`FAIL`**: One or more stages failed with non-zero exit codes or assertion failures.
- **`BLOCKED`**: Execution halted due to security violation, policy violation, or missing prerequisites.
- **`INCOMPLETE`**: Required stages were skipped or omitted.
- **`INVALID`**: Corrupted evidence, unverified hashes, or tampering detected.

### Tiếng Việt
`QualityGateEngine` đánh giá một cách tất định chính xác 7 giai đoạn bắt buộc trước khi đưa ra phán quyết cổng:
1. **TYPECHECK**: Xác thực kiểu nghiêm ngặt của trình biên dịch TypeScript (`npm run typecheck`).
2. **BUILD**: Xác minh biên dịch sản phẩm sạch sẽ (`npm run build`).
3. **DEDICATED_REALITY_GATE**: Thực thi bài kiểm thử Reality Gate mục tiêu xác minh các bất biến mốc.
4. **FULL_REGRESSION**: Bộ kiểm thử hồi quy toàn diện trải dài qua mọi mốc lịch sử.
5. **GIT_DIFF_CHECK**: Kiểm tra khoảng trắng thừa, định dạng và diff cấu trúc (`git diff --check`).
6. **SECURITY_SCAN**: Quét API bị cấm (0 `eval`, 0 `execSync`, 0 `child_process`, 0 thông tin xác thực).
7. **PROCESS_AUDIT**: Kiểm toán tiến trình mồ côi và treo nhằm đảm bảo không có tiến trình zombie.

Các Trạng Thái Cổng Khả Dĩ:
- **`PASS`**: Toàn bộ 7 giai đoạn đã thực thi và được xác minh đầy đủ.
- **`FAIL`**: Một hoặc nhiều giai đoạn thất bại với mã thoát khác 0 hoặc lỗi assertion.
- **`BLOCKED`**: Quá trình thực thi bị chặn do vi phạm bảo mật, vi phạm chính sách hoặc thiếu điều kiện tiên quyết.
- **`INCOMPLETE`**: Các giai đoạn bắt buộc bị bỏ qua hoặc lược bỏ.
- **`INVALID`**: Bằng chứng bị hỏng, băm không khớp hoặc phát hiện can thiệp giả mạo.

---

## 4. CONTRADICTION PRESERVATION & REJECTION OF MAJORITY VOTING / BẢO TOÀN MÂU THUẪN & TỪ CHỐI BỎ PHIẾU ĐA SỐ

### English
When multiple autonomous agents execute the same build or test tasks and produce conflicting results:
- **`QUALITY_STATE = CONTRADICTED`**: The contradiction is immediately detected and flagged.
- **No Majority Voting**: The system NEVER resolves conflicts by majority consensus (e.g., 2 PASS vs 1 FAIL does NOT become PASS).
- **No Collective Authority**: Autonomous agents cannot combine their numbers to manufacture authority (`AGENT_COUNT != AUTHORITY_COUNT`).
- **Complete Evidence Preservation**: Every contradictory result, including agent identities, execution contexts, stdout/stderr hashes, and raw evidence hashes, is preserved verbatim.
- **Mandatory Supervisory Escalation**: All contradictory states are escalated directly to the `SupervisorHumanGate` for human resolution.

### Tiếng Việt
Khi nhiều tác tử tự trị thực thi cùng các nhiệm vụ build hoặc test và tạo ra kết quả xung đột:
- **`QUALITY_STATE = CONTRADICTED`**: Mâu thuẫn được phát hiện ngay lập tức và gắn cờ.
- **Không Bỏ Phiếu Đa Số**: Hệ thống TUYỆT ĐỐI KHÔNG giải quyết xung đột bằng đồng thuận đa số (ví dụ: 2 PASS so với 1 FAIL KHÔNG ĐƯỢC biến thành PASS).
- **Không Quyền Lực Tập Thể**: Các tác tử tự trị không thể cộng dồn số lượng để tạo ra quyền lực (`AGENT_COUNT != AUTHORITY_COUNT`).
- **Bảo Toàn Bằng Chứng Trọn Vẹn**: Mọi kết quả mâu thuẫn, bao gồm danh tính tác tử, ngữ cảnh thực thi, băm stdout/stderr và băm bằng chứng thô, đều được giữ nguyên vẹn.
- **Leo Thang Giám Sát Bắt Buộc**: Mọi trạng thái mâu thuẫn đều được chuyển thẳng lên `SupervisorHumanGate` để con người giải quyết.

---

## 5. CRYPTOGRAPHIC EVIDENCE & PROVENANCE CHAIN / CHUỖI NGUỒN GỐC & BẰNG CHỨNG MẬT MÃ

### English
Every quality verification artifact forms an unbroken cryptographic chain:
```
TASK (taskId)
  └── AGENT (agentId)
        └── DELEGATION (delegationId)
              └── CAPABILITY_LEASE (capabilityLeaseId)
                    └── SANDBOX (sandboxId)
                          └── WORKTREE (worktreeId)
                                └── MANIFEST (manifestHash)
                                      └── BUILD_EVIDENCE (buildEvidenceHash)
                                            └── TEST_EVIDENCE (testEvidenceHash)
                                                  └── EVIDENCE_BUNDLE (evidenceHash)
                                                        └── QUALITY_REPORT (reportHash)
                                                              └── AUDIT_LEDGER (ledgerSequence)
```
- **`reportHash`**: Deterministic SHA-256 hash computed over sorted report fields, manifest hash, and evidence hash.
- **Tamper Evident**: Any modification to test suites, build outputs, or manifests invalidates the cryptographic verification.

### Tiếng Việt
Mỗi hiện vật xác minh chất lượng tạo thành một chuỗi mật mã không thể phá vỡ:
- **`reportHash`**: Mã băm SHA-256 tất định được tính toán dựa trên các trường báo cáo đã sắp xếp, mã băm manifest và mã băm bằng chứng.
- **Phát Hiện Can Thiệp**: Mọi sửa đổi đối với bộ test, kết quả build hoặc manifest đều làm mất hiệu lực xác minh mật mã.

---

## 6. PROTECTED WORKSPACE ISOLATION INVARIANT / BẤT BIẾN CÔ LẬP KHÔNG GIAN LÀM VIỆC ĐƯỢC BẢO VỆ

### English
The protected master workspace (`C:\BOW\shopofbow`) remains completely inviolable:
- `READS   = 0`
- `WRITES  = 0`
- `IMPORTS = 0`
- `TOUCHES = 0`

Any direct or indirect attempt by the build engine, test runner, policy engine, or evidence aggregator to target `C:\BOW\shopofbow` immediately fails closed with `PROTECTED_WORKSPACE_VIOLATION`.

### Tiếng Việt
Không gian làm việc chính được bảo vệ (`C:\BOW\shopofbow`) được bảo toàn tuyệt đối:
- `ĐỌC      = 0`
- `GHI      = 0`
- `NHẬP     = 0`
- `CHẠM     = 0`

Mọi nỗ lực trực tiếp hoặc gián tiếp của engine build, trình chạy test, policy engine, hoặc bộ tổng hợp bằng chứng nhắm vào `C:\BOW\shopofbow` đều kích hoạt dừng khẩn cấp fail-closed ngay lập tức với lỗi `PROTECTED_WORKSPACE_VIOLATION`.
