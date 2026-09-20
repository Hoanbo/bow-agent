# BOWCON V4.0 — BẢO MẬT HỆ THỐNG VOICE PIPELINE & BODY PROTOCOL
## Toàn cảnh Kiến trúc Phòng thủ Đa tầng (Defense-in-Depth Security Architecture)

> **Mục đích tài liệu:** Tài liệu này tổng hợp toàn bộ các lớp phòng thủ, cơ chế an toàn và quyết định kiến trúc đã được thiết kế và kiểm chứng qua các vòng audit độc lập (Body Protocol V1, Voice Pipeline V1 & V2) của hệ thống BOWCON (Machine A ↔ Machine B). Bất kỳ kỹ sư mới nào tham gia dự án có thể đọc tài liệu này để nắm bắt toàn diện mô hình an ninh mà không cần đọc lại từng biên bản vá lỗi riêng lẻ.

---

## 1. TRIẾT LÝ VÀ NGUYÊN TẮC THIẾT KẾ AN NINH

Hệ thống BowCon vận hành theo mô hình phân tán giữa **Machine A (Universal Brain / Central Agent Server)** và **Machine B (Desktop / Voice / Hardware Body)**. Khi hệ thống tích hợp microphone và loa phần cứng luôn sẵn sàng (Always-On Audio), bề mặt rủi ro mở rộng sang không gian sống cá nhân. Các nguyên tắc an ninh cốt lõi bao gồm:

1. **Zero-Trust Network & Untrusted Body Principle:** Central Brain không bao giờ tin cậy mặc định kết nối mạng cục bộ LAN, và không tin cậy các thông số do Body tự khai báo (ví dụ: cấp độ rủi ro `riskLevel`).
2. **Physical Presence First (Xác nhận vật lý là tối thượng):** Mọi hành động kích hoạt microphone hoặc tác động vật lý đều phải có sự xác nhận trực tiếp của người dùng tại thiết bị ngoại vi (Push-to-Talk) và kèm theo tín hiệu âm thanh / thị giác không thể bị bypass từ xa.
3. **Defense-in-Depth (Phòng thủ đa tầng):** Nếu một tầng phòng thủ thất bại (ví dụ: chứng chỉ bị lộ), các tầng phòng thủ tiếp theo (PSK, PDP Governance, PTT, PII Redaction) vẫn chặn đứng nguy cơ xâm nhập và rò rỉ dữ liệu.
4. **Fail-Closed by Default (Mặc định khóa an toàn):** Nếu bất kỳ điều kiện tiên quyết nào không thể xác minh (mất chứng chỉ, sai vân tay, chỉ báo LED/tray lỗi, timeout), hệ thống lập tức từ chối thực thi và hủy lệnh.

---

## 2. KIẾN TRÚC PHÒNG THỦ 7 TẦNG (7-LAYER DEFENSE IN DEPTH)

```
       [ MACHINE A: Central Brain ]                       [ MACHINE B: Desktop Body ]
 +-------------------------------------+             +-------------------------------------+
 | Layer 7: E2E Timeout & Cleanup      |             | Layer 3: Acoustic Beep Generator    |
 | Layer 6: PII Redactor & Data Hygiene|             | Layer 3: Physical Push-to-Talk (PTT)|
 | Layer 5: Brain PDP Risk Override    |             | Layer 4: Visual Privacy Indicator   |
 | Layer 2: Constant-Time PSK Auth     | <=========  | Layer 2: Handshake Bearer PSK Token |
 | Layer 1: TLS 1.3 / WSS (Self CA)    |  WSS / TLS  | Layer 1: CA Pinning & Cert Match    |
 +-------------------------------------+             +-------------------------------------+
```

---

### TẦNG 1 — MÃ HÓA KÊNH TRUYỀN DẪN & CERTIFICATE PINNING (TLS 1.3 / WSS)

- **Cơ chế:** Toàn bộ giao tiếp giữa Central Brain và các Body bắt buộc phải sử dụng giao thức `wss://` (cho WebSocket) và `https://` (cho REST API).
- **Chứng thực nội bộ (Internal CA):** Machine A tự động quản lý một Certificate Authority riêng (`ensureTlsCertificates()`), cấp chứng chỉ RSA 2048-bit / SHA-256 cho Brain Server.
- **Certificate Pinning chống Man-in-the-Middle (MITM):**
  - Machine B khi khởi động nạp trực tiếp chứng chỉ CA nội bộ (`ca.crt`) và tính toán vân tay SHA-256 (`getCaFingerprint()`).
  - Trong quá trình bắt tay TLS, nếu server trả về chứng chỉ không bắt nguồn từ Internal CA hoặc vân tay không khớp, Desktop Body lập tức hủy kết nối với mã lỗi `CERTIFICATE_MISMATCH`, không bao giờ gửi token xác thực hay nhận lệnh.
- **Loại bỏ hoàn toàn Plaintext Fallback:** Cờ `rejectUnauthorized: false` hoặc `NODE_TLS_REJECT_UNAUTHORIZED = '0'` bị cấm hoàn toàn trong toàn bộ mã nguồn production. Mọi kết nối plaintext `ws://` đều bị server reject ở tầng socket.

---

### TẦNG 2 — XÁC THỰC KẾT NỐI (PRE-SHARED KEY & TIMING-SAFE VERIFICATION)

- **Cơ chế:** Mỗi Body muốn gia nhập BodyRegistry phải cung cấp Pre-Shared Key (PSK) 256-bit qua HTTP Header `Authorization: Bearer <PSK>`.
- **Chống tấn công đo thời gian (Timing Attack Prevention):** Central Brain sử dụng `crypto.timingSafeEqual` để so sánh chuỗi PSK nhận được với biến môi trường `BOW_BODY_PSK`. Quá trình so sánh có thời gian thực thi độc lập với vị trí ký tự sai.
- **Fail-Closed Admission:**
  - Nếu thiếu header hoặc PSK không hợp lệ, Brain phản hồi ngay lập tức HTTP `401 Unauthorized`.
  - Kết nối trái phép bị đóng socket ngay và **tuyệt đối không bao giờ được cấp phát entry trong `BodyRegistry`**.
- **Debug Endpoints Lock:** Endpoint thực thi trực tiếp `/api/body/command` mặc định bị vô hiệu hóa (`BOW_ALLOW_DEBUG_ENDPOINTS`). Nếu bật, endpoint vẫn yêu cầu cả PSK hợp lệ lẫn Approval Token từ Policy Decision Point.

---

### TẦNG 3 — QUẢN TRỊ QUYỀN RIÊNG TƯ VẬT LÝ (PUSH-TO-TALK & ACOUSTIC CUES)

- **Push-to-Talk (PTT) mặc định luôn BẬT:**
  - `REQUIRE_PUSH_TO_TALK` mặc định là `true`.
  - Khi Brain yêu cầu thu âm (`audio.capture`), Desktop Body không bật microphone ngay mà chuyển sang trạng thái chờ xác nhận vật lý từ người dùng tại Machine B (bấm tổ hợp phím `Ctrl+Alt+Space` hoặc xác nhận console).
  - Nếu sau khoảng thời gian `BOW_PTT_TIMEOUT_MS` (mặc định 5000ms) không có xác nhận, lệnh bị hủy với mã lỗi `USER_DID_NOT_CONFIRM`.
- **Khóa hàm giả lập trong môi trường Production:**
  - Hàm giả lập bấm phím vật lý được đổi tên thành `__testOnly_simulatePhysicalPress()` và bọc guard cứng: ném ngoại lệ `TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV` nếu `NODE_ENV !== 'test'`. Không ai có thể gọi hàm giả lập để mở mic từ xa.
- **Tín hiệu âm thanh cảnh báo vật lý (Non-Bypassable Acoustic Cues):**
  - **Bắt đầu thu âm:** Phát tiếng Beep tần số 1200Hz (150ms).
  - **Kết thúc thu âm:** Phát tiếng Beep tần số 600Hz (150ms).
  - **Timeout PTT:** Phát 3 tiếng Beep ngắn tần số 400Hz (100ms mỗi nhịp).
  - **Miễn nhiễm với tham số từ xa:** Brain gửi cờ `quiet: true`, `silent: true`, hoặc `noBeep: true` đều bị driver phần cứng bỏ qua. Tín hiệu Beep luôn phát để người trong phòng nhận biết trạng thái mic.
- **Phát hiện bất thường (Anomaly Detection):** Nếu xảy ra 3 lần PTT timeout liên tiếp trong vòng 60 giây (`pttAnomalyThreshold` & `pttAnomalyWindowMs`), hệ thống ghi log an ninh mức cao `ANOMALY_DETECTED` để cảnh báo hành vi dò quét mic trái phép.

---

### TẦNG 4 — ĐIỀU KIỆN TIÊN QUYẾT CHỈ BÁO THỊ GIÁC (VISUAL PRIVACY INDICATOR)

- **Cơ chế:** Desktop Body khởi chạy tiến trình chỉ báo khay hệ thống `scripts/privacy_tray_indicator.ps1` (`VisualPrivacyIndicator`), hiển thị icon nhấp nháy màu đỏ khi mic hoạt động.
- **Hard Prerequisite Guard (Chặn thu âm khi indicator hỏng):**
  - Trước khi thu âm, driver kiểm tra `privacyIndicator.isReady()`.
  - Nếu script không tồn tại, tiến trình bị kill/crash đột ngột, hoặc hệ thống không hỗ trợ GUI, lệnh `audio.capture` bị CHẶN ĐỨNG với mã lỗi `PRIVACY_INDICATOR_UNAVAILABLE`.
  - Chỉ khi người dùng cấu hình rõ ràng `BOW_ALLOW_CAPTURE_WITHOUT_INDICATOR=true` thì việc thu âm không indicator mới được phép, và hệ thống sẽ in log CẢNH BÁO AN NINH ở mỗi lần capture.

---

### TẦNG 5 — PHÂN LOẠI CHÍNH SÁCH PDP & BRAIN CAPABILITY OVERRIDE

- **Không tin cậy self-declared risk của Body:** Dù Body tự khai báo `audio.capture` hay `audio.play` có cấp độ rủi ro là `low` hay `medium`, `BodyRegistry.registerBody()` tại Brain tự động override bắt buộc thành `high`.
- **Policy Decision Point (PDP) Dynamic Classification:**
  - Khi PTT BẬT: Xác nhận vật lý tại máy đích đã chứng minh ý chí của người dùng -> Phân loại là `REVERSIBLE`, cho phép thực thi sau khi bấm phím.
  - Khi PTT TẮT: Thu âm tự động không có bấm phím -> Phân loại là `HIGH_IMPACT`, bắt buộc phải có `ExecutionToken` do Quản trị viên phê duyệt trước khi mic được phép mở.

---

### TẦNG 6 — VỆ SINH DỮ LIỆU & BỘ LỌC PII (DATA HYGIENE & TWO-STREAM SEPARATION)

- **Bộ lọc PII trước khi lưu trữ (`redactPii()`):**
  - Quét văn bản nhận dạng giọng nói (STT transcript) bằng các biểu thức chính quy (Regex) tối ưu, phát hiện:
    1. Số thẻ thanh toán / thẻ tín dụng (`[REDACTED_CREDIT_CARD]`).
    2. Cụm từ mật khẩu tiếng Việt và tiếng Anh (`[REDACTED_PASSWORD]`).
    3. Số điện thoại di động Việt Nam và quốc tế (`[REDACTED_PHONE]`).
    4. Địa chỉ thư điện tử (`[REDACTED_EMAIL]`).
    5. Khóa bí mật, API Token, Bearer tokens (`[REDACTED_API_TOKEN]`).
- **Phân tách 2 luồng dữ liệu (Two-Stream Data Architecture):**
  - **Luồng Realtime Execution:** AgentLoop nhận `userText` gốc trong bộ nhớ tạm (in-memory) để hiểu trọn vẹn ngữ cảnh và thực thi ý định của người dùng trong phiên hội thoại hiện tại.
  - **Luồng Persistent Storage & Audit:** Toàn bộ lịch sử hội thoại dài hạn, vector memory, và audit log chỉ được lưu trữ `redactedUserText`. Dữ liệu nhạy cảm không bao giờ tồn tại vĩnh viễn trên đĩa.
- **Bảo vệ Audit Ledger:** Toàn bộ sự kiện `audio.audio_capture_started` và `audio.audio_capture_completed` chỉ ghi metadata (`durationMs`, `byteLength`, `status`). Dữ liệu nhị phân âm thanh thô (`audioBase64`) bị nghiêm cấm ghi vào audit trail.

---

### TẦNG 7 — VÒNG ĐỜI TÀI NGUYÊN, TIMEOUT TỔNG & GIẢI PHÓNG TREO LỆNH

- **Timeout tổng thể E2E Voice Roundtrip (`MAX_E2E_TIMEOUT_MS` = 30000ms):**
  - Toàn bộ quy trình Capture -> STT -> AgentLoop -> TTS -> Playback được giám sát bởi một bộ đếm thời gian E2E duy nhất.
  - Nếu tổng thời gian vượt quá 30 giây (kể cả khi các bước con chưa chạm timeout riêng), pipeline kích hoạt `AbortController`, hủy ngay các tiến trình con đang chạy dở và trả về phản hồi lịch sự cho người dùng, tránh tình trạng treo im lặng.
- **Dọn dẹp file tạm WAV fail-safe (`safeUnlink()`):**
  - Tệp WAV do Piper TTS sinh ra và tệp thu âm micro được đảm bảo xóa trong khối `finally`.
  - File tạm được dọn sạch trong MỌI trường hợp: playback thành công, lỗi mạng, thiết bị loa bận, hoặc pipeline bị timeout.
  - Hàm `safeUnlink()` hoạt động theo cơ chế idempotent, không bao giờ ném lỗi `ENOENT` hay làm crash tiến trình khi xảy ra race condition.
- **Quét dọn tự động sau sự cố (Crash Recovery Sweeper):**
  - Khi Desktop Body khởi động, constructor tự động quét thư mục tạm (`.tmp/audio/`) và xóa toàn bộ file `.wav` tồn đọng cũ hơn 5 phút (`staleAudioMaxAgeMs` = 300000ms).
- **Triệt tiêu Hanging Pending Command (`failPendingCommandsForBody()`):**
  - Khi WebSocket giữa Brain và Body bị ngắt đột ngột (`ws.on('close')`) hoặc heartbeat sweep phát hiện Body mất kết nối, `BodyRegistry` ngay lập tức duyệt qua danh sách các lệnh đang chờ phản hồi (`pendingCommands`) và reject promise trong < 100ms với mã lỗi `BODY_DISCONNECTED`. Hệ thống không bao giờ bị treo 10 giây chờ timeout vô ích.

---

## 3. CÁC HẰNG SỐ CẤU HÌNH TẬP TRUNG (CONSOLIDATED CONFIGURATION)

Mọi hằng số bảo mật và vận hành được tập trung hóa tại `src/speech/voicePipelineConfig.ts` và `src/core/bodyProtocol/bodyProtocolConfig.ts`, cho phép ghi đè linh hoạt qua biến môi trường mà không cần sửa code:

| Hằng số | Giá trị mặc định | Biến môi trường Override | Ý nghĩa bảo mật & vận hành |
| :--- | :--- | :--- | :--- |
| `maxE2eTimeoutMs` | 30000 ms | `BOW_VOICE_MAX_E2E_TIMEOUT_MS` | Giới hạn thời gian tối đa cho toàn bộ lượt thoại, chống treo vô hạn. |
| `sttTimeoutMs` | 20000 ms | `BOW_STT_TIMEOUT_MS` | Giới hạn thời gian xử lý của mô hình nhận dạng giọng nói Whisper. |
| `ttsTimeoutMs` | 15000 ms | `BOW_TTS_TIMEOUT_MS` | Giới hạn thời gian tổng hợp giọng nói của Piper TTS. |
| `commandTimeoutMs` | 10000 ms | `BOW_BODY_CMD_TIMEOUT_MS` | Thời gian chờ tối đa cho 1 lệnh BodyProtocol trước khi hủy. |
| `heartbeatTimeoutMs`| 15000 ms | `BOW_BODY_HEARTBEAT_TIMEOUT_MS` | Ngưỡng xác định Body bị mất kết nối nếu không có ping/pong. |
| `sweepIntervalMs` | 5000 ms | `BOW_BODY_SWEEP_INTERVAL_MS` | Chu kỳ quét định kỳ phát hiện các Body chết trong registry. |
| `pttConfirmationTimeoutMs`| 5000 ms | `BOW_PTT_TIMEOUT_MS` | Thời gian chờ người dùng xác nhận bấm phím PTT vật lý. |
| `pttAnomalyThreshold`| 3 lần | `BOW_PTT_ANOMALY_THRESHOLD` | Số lần timeout liên tiếp để kích hoạt cảnh báo an ninh `ANOMALY_DETECTED`. |
| `pttAnomalyWindowMs`| 60000 ms | `BOW_PTT_ANOMALY_WINDOW_MS` | Cửa sổ thời gian theo dõi các lần PTT timeout bất thường. |
| `staleAudioMaxAgeMs`| 300000 ms | `BOW_STALE_AUDIO_MAX_AGE_MS` | Tuổi tối đa của file tạm trước khi bị dọn dẹp (5 phút). |

---

## 4. BẢNG TRA CỨU MÃ LỖI BẢO MẬT CHUẨN HÓA (STANDARDIZED ERROR CODES)

Hệ thống gom toàn bộ mã lỗi vào 2 enum tập trung: `BodyProtocolErrorCode` và `VoicePipelineErrorCode`. Giá trị chuỗi được giữ nguyên bản để đảm bảo tương thích ngược:

### Body Protocol Error Codes (`src/core/bodyProtocol/errorCodes.ts`)
- `BODY_DISCONNECTED`: Body bị mất kết nối WebSocket đột ngột giữa chừng.
- `HEARTBEAT_TIMEOUT`: Body không phản hồi heartbeat trong thời gian quy định.
- `COMMAND_TIMEOUT`: Lệnh BodyProtocol vượt quá thời gian chờ xử lý.
- `COMMAND_ABORTED`: Lệnh bị hủy chủ động bởi AbortSignal hoặc E2E timeout.
- `CERTIFICATE_MISMATCH`: Phát hiện sai lệch chứng chỉ TLS hoặc vân tay CA (nghi vấn tấn công MITM).
- `INVALID_PSK` / `MISSING_PSK`: Xác thực thất bại do sai hoặc thiếu Bearer Token.
- `USER_DID_NOT_CONFIRM`: Người dùng không bấm phím xác nhận PTT vật lý trong thời hạn quy định.
- `PRIVACY_INDICATOR_UNAVAILABLE`: Không thể khởi động hoặc xác nhận chỉ báo thị giác (system tray) đang hoạt động.
- `TEST_ONLY_METHOD_CALLED_OUTSIDE_TEST_ENV`: Phát hiện hành vi gọi hàm giả lập test trong môi trường production/dev.

### Voice Pipeline Error Codes (`src/speech/errorCodes.ts`)
- `VOICE_ROUNDTRIP_TIMEOUT`: Toàn bộ lượt tương tác thoại vượt quá ngưỡng E2E timeout tối đa (30s).
- `VOICE_ROUNDTRIP_ABORTED`: Lượt tương tác bị hủy bởi tín hiệu AbortSignal.
- `AUDIO_CAPTURE_FAILED`: Thu âm từ microphone phần cứng thất bại.
- `STT_TIMEOUT` / `STT_ABORTED` / `STT_FAILED`: Lỗi trong quá trình nhận dạng giọng nói.
- `TTS_SYNTHESIS_FAILED`: Lỗi trong quá trình tổng hợp âm thanh Piper TTS.
- `AUDIO_PLAY_FAILED`: Không thể phát âm thanh ra loa phần cứng của Body.
- `NO_ACTIVE_BODY`: Không tìm thấy Body nào có năng lực âm thanh đang kết nối.

---

## 5. CÁC HẠN CHẾ ĐÃ BIẾT & LỘ TRÌNH PHÁT TRIỂN (KNOWN LIMITATIONS & FUTURE ROADMAP)

Mặc dù hệ thống bảo mật hiện tại đạt mức độ toàn vẹn cao cho môi trường 2 máy tính cố định qua LAN, các hạn chế sau đây được ghi nhận rõ ràng cùng lý do kỹ thuật:

1. **Chưa có Công tắc Ngắt Microphone Vật lý (No Physical Hardware Mute Switch):**
   - *Thực trạng:* BowCon kiểm soát việc mở mic thông qua driver phần cứng (WinMM), Push-to-Talk và chỉ báo phần mềm (visual tray + acoustic beeps).
   - *Lý do:* Để ngắt mic ở mức điện tử (hardware-level cut), cần có thiết bị phần cứng chuyên dụng (USB mic có công tắc vật lý ngắt nguồn mic hoặc module relay ngắt đường tín hiệu âm thanh).
   - *Khuyến nghị:* Trang bị microphone rời có nút Mute vật lý cho các trạm vận hành Machine B trong môi trường bảo mật cao.

2. **Chưa có Bộ đệm Khử Biến thiên Độ trễ (No Jitter Buffer):**
   - *Thực trạng:* Quá trình truyền audio hiện tại dựa trên buffer hoàn chỉnh (WAV chunks) qua WebSocket nội bộ mạng LAN ổn định với độ trễ thấp (< 5ms).
   - *Lý do:* Hệ thống chưa áp dụng cơ chế streaming từng gói nhỏ kèm adaptive jitter buffer vì độ ổn định của mạng có dây Gigabit nội bộ không yêu cầu.
   - *Khuyến nghị:* Khi mở rộng sang **Mobile Body (điện thoại)** hoặc **Robot Body (WiFi di động)** trong tương lai, cần bổ sung WebRTC audio streaming hoặc adaptive jitter buffer để xử lý tình trạng rớt gói và jitter mạng không dây.

3. **Chưa mã hóa Audio ở tầng ứng dụng (Application-Layer Audio Encryption):**
   - *Thực trạng:* Toàn bộ payload âm thanh được mã hóa an toàn ở tầng vận chuyển (TLS 1.3 / WSS).
   - *Lý do:* Đã có TLS 1.3 với Certificate Pinning bảo vệ toàn diện chống nghe lén và làm giả dữ liệu trên đường truyền LAN. Mã hóa kép ở tầng ứng dụng (Application-layer AES-GCM) ở giai đoạn này gây tiêu tốn CPU không cần thiết trên CPU Xeon.
   - *Khuyến nghị:* Xem xét mã hóa tầng ứng dụng khi kết nối qua các relay công cộng bên ngoài Internet (Zero-Trust Mesh WAN).

4. **Quyền riêng tư tệp tin trên hệ điều hành Windows (POSIX Permissions Advisory):**
   - *Thực trạng:* Lệnh `chmodSync(file, 0o600)` trên Windows là advisory và không ngăn chặn hoàn toàn các user khác trên cùng máy Windows đọc file nếu có quyền truy cập NTFS.
   - *Khuyến nghị tương lai:* Bổ sung PowerShell helper cấu hình Windows Access Control Lists (ACLs) riêng cho thư mục `certs/` và file `.env` để chỉ cho phép tài khoản người dùng hiện tại có quyền Read/Write.

---

## 6. HƯỚNG DẪN KIỂM CHỨNG HỒI QUY AN NINH (REGRESSION VERIFICATION RUNBOOK)

Bất kỳ thay đổi nào liên quan tới Voice Pipeline và Body Protocol phải chạy toàn bộ regression suite gồm 12 bài kiểm tra tự động trước khi merge:

```bash
# Chạy toàn bộ 12 test suites theo domain với báo cáo tổng hợp:
npm run test:voice-body

# Hoặc chạy kiểm tra kiểu dữ liệu TypeScript:
npm run typecheck
```

Toàn bộ 12 test suite phải hiển thị trạng thái `✅ PASS` với exit code 0.
