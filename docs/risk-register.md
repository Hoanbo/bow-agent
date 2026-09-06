# BOWCON V4.0 — Risk Register & Mitigation Strategy
**Tiêu chuẩn Quốc tế: ISO/IEC 23894:2023 (Information technology — Artificial intelligence — Risk management)**

---

## 1. Phương pháp Đánh giá Rủi ro (Risk Evaluation Methodology)

- **Xác suất (Likelihood)**: 1 (Hiếm gặp) đến 5 (Thường xuyên).
- **Tác động (Impact)**: 1 (Không đáng kể) đến 5 (Nghiêm trọng / Nguy hiểm tính mạng / Thất thoát lớn).
- **Mức độ rủi ro (Risk Score)** = Xác suất × Tác động:
  - **1 - 6**: Thấp (Low) — Chấp nhận được với giám sát thông thường.
  - **8 - 12**: Trung bình (Medium) — Bắt buộc có biện pháp kiểm soát kỹ thuật.
  - **15 - 25**: Cao / Nghiêm trọng (High/Critical) — Bắt buộc có rào chắn cứng, phê duyệt con người và cơ chế ngắt mạch tự động.

---

## 2. Bảng Đăng ký Rủi ro Chi tiết (Risk Register Matrix)

| Mã Rủi ro | Mô tả Nguy cơ | Khả năng | Tác động | Điểm ban đầu | Biện pháp Giảm thiểu & Kiểm soát Kỹ thuật | Khả năng sau giảm | Tác động sau giảm | Điểm còn lại (Residual Risk) | Chủ quản |
|---|---|:---:|:---:|:---:|---|:---:|:---:|:---:|---|
| **RSK-01** | LLM tạo mã nguy hiểm thực thi trên máy tính chủ thông qua dynamic skills | 3 | 5 | **15 (High)** | - M3 Isolated Sandbox Runner.<br>- AST & Static Syntax Scanner cấm `process.env`, `require`, `fs`, `eval`.<br>- Cờ `BOW_ENABLE_DYNAMIC_CODE` mặc định đóng trong Production.<br>- Hạn mức tài nguyên CPU/RAM/Timeout 3000ms. | 1 | 2 | **2 (Low)** | CoderDevOpsAgent & Hoàn Bo |
| **RSK-02** | Robot vật lý chuyển động quá giới hạn gây kẹt cơ hoặc chập cháy động cơ | 3 | 4 | **12 (Med)** | - Firmware Hardware Interlock giới hạn góc servo [-90°, +90°].<br>- Giám sát nhiệt độ pin tự động ngắt nguồn khi > 60°C.<br>- Nút ngắt nguồn phần cứng (Hardware E-Stop) độc lập hoàn toàn với vi điều khiển. | 1 | 2 | **2 (Low)** | HardwareVisionAgent |
| **RSK-03** | Tấn công Prompt Injection từ câu hỏi của khách hàng trên Web Channel | 4 | 3 | **12 (Med)** | - Bộ lọc tiền xử lý `detectPromptInjection` từ chối các mẫu jailbreak.<br>- Phân tách hoàn toàn Persona khách hàng và Persona Sáng lập viên (RBAC Context).<br>- Tẩy rửa PII tự động (`sanitizeProductionTelemetryText`). | 1 | 2 | **2 (Low)** | BOW Security Core |
| **RSK-04** | Nhầm lẫn hoặc rò rỉ tài khoản bản quyền khi bàn giao đơn hàng tự động | 3 | 4 | **12 (Med)** | - Cấp hành động `HIGH_IMPACT`: Yêu cầu One-Time Approval Token từ Ngài.<br>- Kiểm tra Idempotency Key chống trùng lặp gửi nhiều lần.<br>- Khóa liên kết dữ liệu đơn hàng (SHA-256 arguments hash). | 1 | 2 | **2 (Low)** | ShopOperationsAgent |
| **RSK-05** | Mất kết nối Cloud Gemini làm tê liệt toàn bộ khả năng giao tiếp của Robot | 4 | 3 | **12 (Med)** | - Hybrid Dual-Brain Router.<br>- Tự động chuyển mạch sang Local LLM (Ollama/Qwen 2.5) trong < 80ms.<br>- Deterministic Fast-Path Router xử lý trực tiếp các lệnh OS/Tiện ích trong < 5ms không cần mạng. | 2 | 1 | **2 (Low)** | TechScoutAgent |
| **RSK-06** | Thao tác tự động chuột/phím làm gián đoạn cửa sổ làm việc chính của Ngài | 3 | 3 | **9 (Med)** | - Multi-Monitor Hardware Awareness.<br>- Khóa bảo vệ Màn hình Chính (Screen 2 / Left Display, X: 0).<br>- Chỉ thực thi tác vụ nền và kiểm tra trên Màn hình Phụ (Screen 1 / Right Display, X: 1920). | 1 | 1 | **1 (Low)** | DesktopAdapter |
| **RSK-07** | Kẻ gian mạo danh kết nối WebSocket hoặc giả mạo Webhook sự kiện đơn hàng | 3 | 4 | **12 (Med)** | - Xác thực WebSocket Robot Handshake bắt buộc token `ROBOT_GATEWAY_SECRET`.<br>- Xác thực Webhook HMAC-SHA256 kèm timestamp và nonce replay store.<br>- Giới hạn IP và loopback-only cho các cổng nhạy cảm. | 1 | 2 | **2 (Low)** | Network Security |

---

## 3. Quy trình Đánh giá Định kỳ & Incident Drill

1. **Diễn tập Ngắt khẩn cấp (Emergency Stop Drill)**: Hàng tháng thử nghiệm kích hoạt E-Stop trên phần cứng Robot và Global Kill Switch trên server.
2. **Kiểm tra Hồi quy Toàn diện (Regression & Chaos Testing)**: 100% các bản cập nhật phải vượt qua toàn bộ 12 Test Suites (497+ assertions).
3. **Đánh giá Bất biến (Audit Trail Integrity)**: Kiểm tra tính toàn vẹn của sổ cái Append-only Audit Ledger, đảm bảo không có bất kỳ hành động nào bị xóa hoặc sửa đổi.

---
*Văn kiện ban hành theo ISO/IEC 23894:2023 — Được bảo vệ bởi Hệ thống Quản trị BOWCON V4.0.*
