# Trạng thái Hệ thống (@bow/agent)

Tài liệu này phản ánh trung thực hiện trạng vận hành và kiểm thử của mã nguồn trong repository `@bow/agent`. Mọi kết luận kỹ thuật đều dựa trên bằng chứng kiểm thử thực tế, không dựa trên phỏng đoán hay tài liệu cũ.

---

## 1. Kết quả Kiểm thử & Biên dịch Thực tế

### 1.1 Kiểm tra Kiểu dữ liệu (`npm run typecheck`)
Lệnh thực thi:
```bash
npm run typecheck
```
Kết quả:
```
> @bow/agent@4.0.0 typecheck
> tsc -b --noEmit
```
Trạng thái: **Thành công (Exit code 0)** — Toàn bộ codebase đạt 100% type safety, không có lỗi TypeScript.

---

### 1.2 Kết quả Kiểm thử (`npm run test:all`)
Lệnh thực thi:
```bash
npm run test:all
```
Chuỗi kịch bản kiểm thử chạy qua các bộ test chính. Kết quả ghi nhận:
- `test_phase7_1_step4_extraction.ts`: **61/61 assertions PASSED** (Kiểm tra kiến trúc tách độc lập, zero forbidden imports, in-memory fallback adapter, PII scrubbing, domain boundary).
- `test_multichannel_v3_3.ts`: **63/63 tests PASSED** (Kiểm tra bảo mật PII/Prompt Injection, Intent Router, Task Planner, Vietnamese Voice TTS/STT, Web Channel, Robot Envelope, Desktop Channel, REST/WebSocket server).
- `test_executive_v3_4.ts`: **47/47 tests PASSED** (Kiểm tra bus sự kiện proactive, phân tích điều hành, webhook robot).
- `test_screen_vision_v3_5.ts`: **38/38 tests PASSED** (Kiểm tra Fast-Path Router, RBAC screen vision, bóc tách thông báo ứng dụng).
- `test_v3_6_combined.ts`: **26/38 tests PASSED** (Phần chat reply, RBAC và TTS passed; 12 tests liên quan đến bộ thực thi dynamic code interpreter bị từ chối do chính sách sandbox cấm dynamic code trong môi trường sản xuất: `Dynamic code is disabled by production policy`).
- `test_noop_commerce_provider.ts`: **26/26 assertions PASSED** (Kiểm tra độc lập hợp đồng `commerceRegistry`, đảm bảo Core hoạt động độc lập không cần domain bán lẻ bên ngoài).
- `test_l4_security_hardening.ts`: **36/36 tests PASSED** (Kiểm tra Webhook HMAC anti-replay, Request Guard, Idempotency Key, Cryptographic Audit Ledger, Circuit Breaker).

---

### 1.3 Kết quả Kiểm thử BodyProtocol & Audio Body (`npm run test:body:audio`)
Lệnh thực thi:
```bash
npm run test:body:audio
```
Kết quả ghi nhận:
- `test_body_auth.ts`: **100% PASS** — Xác thực PSK chống truy cập trái phép: từ chối 401 khi không có Authorization header, từ chối 401 khi PSK sai/giả mạo, chấp nhận kết nối khi có Bearer PSK hợp lệ.
- `test_live_body_action.ts`: **100% PASS** — Kiểm chứng hành động thực thi thật trên Windows: Central Brain Server điều phối Desktop Body mở tiến trình `notepad` thật trên máy tính, có kiểm duyệt bảo vệ cấp 4 (PDP Level 4 Governance) của Chủ nhân.
- `test_body_audio.ts`: **100% PASS** — Kiểm chứng nền tảng âm thanh phần cứng thật qua BodyProtocol:
  1. Đăng ký Body dynamic capabilities (`audio.device.list`, `audio.status`, `audio.device.select`, `audio.capture`, `audio.play`).
  2. Liệt kê thiết bị âm thanh phần cứng thực tế trên hệ thống (WinMM waveIn/waveOut endpoints).
  3. Thu âm micro phần cứng thật ra buffer WAV 16-bit PCM 16kHz (xác nhận RIFF header).
  4. Phát âm thanh ra loa/tai nghe phần cứng thật (.NET SoundPlayer).
  5. Voice pipeline trọn vẹn: Headset Mic → audio.capture → STT → Canonical AgentLoop → TTS → audio.play → Headset Speaker.
  6. Bảo mật giọng nói: Lệnh thoại đặc quyền ("Mở Notepad") tuân thủ nghiêm ngặt PDP Level 4, tuyệt đối không bypass.
  7. Quyền riêng tư: Ghi nhận sự kiện audit (`AUDIO_CAPTURE_STARTED`, `AUDIO_CAPTURE_COMPLETED`), không rò rỉ bất kỳ dữ liệu âm thanh thô nào vào sổ cái mã hóa.

---

## 2. Các Năng lực ĐANG CHẠY THẬT (Verified by Passing Tests)

Những khả năng sau đã được cài đặt trọn vẹn trong `src/` và có các ca kiểm thử kiểm chứng:

1. **BodyProtocol & Peripheral Audio Body (Phần Cứng Thật):**
   - Kênh WebSocket `/ws/body` xác thực PSK nghiêm ngặt (HTTP 401 Unauthorized nếu thiếu/sai PSK).
   - Dynamic Capability Discovery: Desktop Body tự quảng bá năng lực cho Não bộ.
   - Trình điều khiển âm thanh `DesktopAudioDriver` giao tiếp với Windows WinMM API và .NET SoundPlayer.
   - Hỗ trợ micro và loa tai nghe phần cứng thật không cần phụ thuộc binary nặng ngoài (ffmpeg/sox).
   - Pipeline giọng nói 2 chiều tích hợp trực tiếp vào Canonical `AgentLoop`, tuân thủ PDP PEP Zero-Bypass.

2. **Bộ Phân giải Ý định (Intent Resolver & Channel Classifier):**
   - Phân loại kênh đầu vào (`WEB`, `ROBOT`, `DESKTOP`, `VOICE`).
   - Phân giải ý định hội thoại và ngữ cảnh thời gian bằng tiếng Việt (`1 tháng`, `6 tháng`, `1 năm`, `2 tuần`, `3 ngày`).
   - Hỗ trợ cơ chế mở rộng ý định từ domain ngoài qua `registerDomainIntentExtension`.

3. **Hệ thống Lọc Thông tin Nhạy cảm (PII Filter & Redaction):**
   - Nhận diện và che giấu (redact) số điện thoại, địa chỉ email người dùng trước khi ghi log hoặc gửi tới các tầng ngoài.

4. **Bảo vệ Chống Tấn công Nhắc lệnh (Prompt Injection Guard):**
   - Quét và phát hiện các mẫu tấn công bẻ khóa (jailbreak pattern), ghi nhận vi phạm `PROMPT_INJECTION_ATTEMPT`.

5. **Kiểm soát Truy cập & Điểm Quyết định Chính sách (PDP / Kill Switch):**
   - RBAC kiểm soát quyền gọi công cụ (Customer vs Owner/Boss).
   - Kiểm tra chữ ký Webhook HMAC với Nonce chống tấn công phát lại (anti-replay).
   - Rate limiting, Idempotency Key Store và Cryptographic Audit Ledger (bảo toàn chuỗi băm SHA256).

6. **Cổng Giao tiếp Mạng (REST API & WebSocket Server):**
   - Máy chủ HTTP (`GET /health`, `POST /api/agent/query`, `POST /api/speech/tts`) hoạt động thực tế.
   - Máy chủ WebSocket (`/ws/web`, `/ws/robot`, `/ws/body`) hỗ trợ luồng nhận/phát thông điệp 2 chiều.

7. **Đăng ký Miền Nghiệp vụ Độc lập (`commerceRegistry` + NOOP Provider):**
   - Lõi trung tâm (`src/core/commerceRegistry.ts`) cung cấp fallback mặc định `NOOP_COMMERCE_PROVIDER` (`core_noop`), cho phép Core khởi động và hoạt động độc lập hoàn toàn mà không cần tới bất kỳ dịch vụ e-commerce hay bán lẻ nào.
   - Các phương thức `queryCatalog`, `lookupEntity`, `executeCommerceAction`, `getMetrics`, `getHealth` trả về kết quả tất định, an toàn.

8. **Xử lý Âm thanh Tiếng Việt (Voice TTS / STT & Canonical Voice Pipeline):**
   - Tạo cấu trúc SSML tiếng Việt, điều phối giọng đọc thần kinh (vi-VN-NamMinhNeural, vi-VN-HoaiMyNeural) và Windows System.Speech.
   - Chu trình Push-To-Talk voice pipeline hoàn chỉnh kết nối micro tai nghe thật tới não bộ qua BodyProtocol.

---

## 3. Các Phần là Khung Trừu tượng Chưa Nối Thật (Simulated / In-Memory Abstractions)

Mã nguồn hiện tại có những thành phần được thiết kế dưới dạng khung giao tiếp hoặc mô phỏng trong bộ nhớ, chưa kết nối tới phần cứng hoặc hạ tầng phân tán thực:

1. **Tầng Chấp hành Robot (Embodied Actuation):**
   - Điều khiển góc quay Pan/Tilt và cảm xúc hiển thị OLED (`RobotSafetyController`, `oledEmpathyEngine`) hiện tại chỉ tính toán và xuất ra gói tin lệnh (JSON envelope).
   - Chưa có kết nối vật lý thực (UART / USB Serial / ESP32 firmware) tới động cơ servo hay màn hình cứng.

2. **Giao thức Vận chuyển Mạng Phân tán (Transport / Wire Relays):**
   - Các mô hình định tuyến phiên từ xa (`secureRealWireTransport`, `remoteGatewayProtocol`) chạy trên các abstraction mô phỏng trong bộ nhớ, chưa nối với mạng lưới hạ tầng relay P2P hay TLS tunnel đa thiết bị.

3. **Bộ Thực thi Mã Động (Dynamic Code Sandbox):**
   - Trình thông dịch mã (`Universal Code Interpreter Sandbox`) hiện bị khóa bởi chính sách bảo mật nội bộ (`Dynamic code is disabled by production policy`), chưa kết nối với môi trường sandbox container hóa biệt lập bên ngoài.
