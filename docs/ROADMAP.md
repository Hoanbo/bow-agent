# Kế Hoạch Phát Triển Hệ Thống (@bow/agent)

Tài liệu này xác lập lộ trình thực tế cho `@bow/agent`. Quy ước quản lý roadmap tuân thủ nguyên tắc: **tập trung vào tên tính năng và giá trị thực tế**, không sử dụng hệ thống số hiệu milestone phức tạp (không dùng định dạng `MS-x.x.x`).

---

## 1. Các Giai Đoạn Phát Triển

### Giai đoạn 0: Tách Lõi Khỏi Domain Cụ Thể (ĐÃ HOÀN THÀNH)
- **Mục tiêu:** Giải phóng Core (`@bow/agent`) khỏi sự phụ thuộc trực tiếp vào domain bán lẻ `shopofbow`.
- **Kết quả đạt được:**
  - Thiết lập ranh giới giao diện trừu tượng `CommerceProvider` tại `src/contracts/commerceProvider.ts`.
  - Triển khai `src/core/commerceRegistry.ts` với cơ chế đăng ký linh hoạt và `NOOP_COMMERCE_PROVIDER` (`core_noop`) mặc định cho chế độ chạy độc lập.
  - Chuyển toàn bộ logic đặc thù của ShopOfBow (catalog, đơn hàng, bảng giá, thời hạn bảo hành) sang `src/adapters/shopofbow/`.
  - Mở rộng bộ nhận diện ngôn ngữ bằng hook `registerDomainIntentExtension`.
  - Đảm bảo 100% typecheck và test suite độc lập kiểm chứng không có rò rỉ phụ thuộc.

---

### Giai đoạn 1: BodyProtocol & Audio Body Foundation (ĐÃ HOÀN THÀNH)
- **Mục tiêu:** Xây dựng giao thức chuẩn hóa BodyProtocol và biến kiến trúc Body hiện tại thành một Audio Body có thể sử dụng microphone và speaker của tai nghe thật để kiểm thử BOWCON end-to-end, chuẩn bị nền tảng đa máy/đa thể xác.
- **Kết quả đạt được:**
  - **BodyProtocol V4.0:** Giao thức WebSocket chuẩn hóa (`/ws/body`) với xác thực Bearer PSK bắt buộc (HTTP 401 Unauthorized nếu thiếu/sai PSK).
  - **Dynamic Capability Discovery:** Body tự động quảng bá danh mục năng lực tới Não bộ.
  - **Desktop Audio Driver:** Tương tác trực tiếp API âm thanh Windows gốc (WinMM waveIn/waveOut) và .NET SoundPlayer, không phụ thuộc binary ngoài (ffmpeg/sox).
  - **5 Audio Capabilities:** `audio.device.list`, `audio.status`, `audio.device.select`, `audio.capture`, `audio.play` — hỗ trợ kiểm tra thiết bị phần cứng thật.
  - **Canonical AgentLoop Voice Pipeline:** Chu trình thoại hoàn chỉnh: Headset Mic → audio.capture → STT → Canonical AgentLoop → TTS → audio.play → Headset Speaker.
  - **Audio Security & PDP Zero-Bypass:** Mọi lệnh thoại tuân thủ nghiêm ngặt chính sách kiểm soát quyền (PDP Level 1-4). Lệnh đặc quyền ("Mở Notepad") bắt buộc có phê duyệt từ Chủ nhân.
  - **Audit Ledger Privacy:** Tuyệt đối không lưu dữ liệu âm thanh thô vào sổ cái kiểm toán mã hóa (chỉ lưu mã băm siêu dữ liệu).
  - **107 Subsystem Audit:** Kiểm kê và phân loại toàn bộ 108 thư mục `src/core/` trong `docs/SUBSYSTEM_INVENTORY.md`.

---

### Giai đoạn 2: Streaming Audio & Multi-PC Body Network (KẾ HOẠCH TỚI)
Thứ tự ưu tiên phát triển trong các chu kỳ tiếp theo:

1. **Streaming Audio Chunks & VAD:**
   - Hỗ trợ truyền gói tin âm thanh liên tục (streaming chunks với sequence/timestamp) qua BodyProtocol.
   - Tích hợp Voice Activity Detection (VAD) và Wake Word nhẹ để chuyển từ Push-To-Talk sang hands-free.

2. **Mạng Lưới Đa Thể Xác (Multi-PC Body Network):**
   - Hỗ trợ kết nối đồng thời nhiều Body ngoại vi (`body-dual-xeon`, `body-xeon-secondary`, `body-laptop`).
   - Router tự động điều phối năng lực tới Body phù hợp (ví dụ: phát âm thanh ở tai nghe người dùng đang đeo, mở ứng dụng trên màn hình đang làm việc).

3. **Mobile Body:**
   - Triển khai adapter BodyProtocol cho môi trường di động (Android / iOS).
   - Tiếp nhận thông báo, phản hồi giọng nói nhanh, và nhận diện ngữ cảnh từ xa.

4. **Robot Body (Khi có Phần cứng Thực tế):**
   - Chuyển đổi khung tính toán phong bì JSON hiện tại (`RobotSafetyController`, servo pan/tilt, OLED) sang giao tiếp phần cứng thực qua UART / USB / Wi-Fi với mạch vi điều khiển (ESP32).
   - Kiểm thử thực tế các chốt an toàn cơ điện (Hardware E-Stop, ngưỡng nhiệt độ pin, watchdog heartbeat).

5. **Tái Kết Nối ShopOfBow:**
   - Khi năng lực của BowCon đạt mức độ hoàn thiện vững chắc, tái kích hoạt và cắm lại adapter `shopofbow` thông qua `commerceRegistry`.
   - Vận hành như một module kinh doanh thương mại tự động độc lập phục vụ khách hàng trên nền tảng Core đa kênh.
