# BOWCON V4.0 — Operational Design Domain (ODD) Acceptance Specification
**Tiêu chuẩn Quốc tế: ISO/IEC 42001:2023 & NIST AI RMF 1.0**

---

## 1. Mục Đích & Định Nghĩa Phạm Vi

Tài liệu này xác lập các ranh giới vận hành an toàn (**Operational Design Domain - ODD**) cho hệ thống AI Đồng sáng lập và Điều khiển Thể xác Robot **BOWCON V4.0**. 

Hệ thống đạt chuẩn **Cấp độ Tự chủ Quốc tế 4.0 (Autonomous Agent Level 4.0: The Innovator & Co-Founder)** CHỈ TRONG PHẠM VI 3 MIỀN VẬN HÀNH ĐƯỢC PHÊ DUYỆT DƯỚI ĐÂY. Mọi trạng thái nằm ngoài miền ODD sẽ kích hoạt cơ chế rút lui an toàn (*Safe-State Fallback*) hoặc Dừng khẩn cấp (*Emergency Stop*).

---

## 2. Ba Miền Vận Hành Được Xác Nhận (Approved ODD Domains)

### 2.1. Miền 1: Thương Mại Số Bán Tự Động (Shop of BOW On-Demand Fulfillment)
- **Ranh giới chấp thuận**:
  - Truy vấn dữ liệu: Doanh thu, số lượng đơn hàng, báo cáo lợi nhuận, tồn kho số (`OBSERVE`).
  - Đề xuất chiến dịch: Khuyến nghị voucher, phân tích khiếu nại đơn hàng (`RECOMMEND`).
  - Bàn giao đơn hàng: Phân phối tài khoản số cho khách đã thanh toán qua cổng hợp pháp (`HIGH_IMPACT` — yêu cầu One-Time Approval Token từ Ngài).
- **Ranh giới cấm vượt (Out-of-ODD)**:
  - Chuyển tiền tự do hoặc giao dịch tài chính bên ngoài ví nội bộ (`FORBIDDEN`).
  - Tự động thay đổi thông tin ngân hàng hoặc chính sách thanh toán mà không có xác thực chữ ký số của Ngài (`FORBIDDEN`).

### 2.2. Miền 2: Máy Trạm Đa Màn Hình Có Kiểm Soát (Controlled Multi-Monitor Desktop)
- **Ranh giới chấp thuận**:
  - **Màn hình Trái (Screen 2 / Left Display, X: 0)**: Màn hình làm việc chính của Ngài — Tuyệt đối BẢO VỆ, cấm mọi thao tác chuột/phím tự động gây gián đoạn.
  - **Màn hình Phải (Screen 1 / Right Display, X: 1920)**: Màn hình phụ dành riêng cho BOWCON thực thi tác vụ nền, kiểm tra thông báo và giám sát hệ thống.
  - Phân tích thị giác màn hình, OCR thông báo ứng dụng Facebook/Zalo/Telegram (`OBSERVE`).
  - Soạn thảo gợi ý tin nhắn trả lời (`RECOMMEND`).
  - Gửi tin nhắn thực tế (`HIGH_IMPACT` — yêu cầu phê duyệt từ Ngài).
- **Ranh giới cấm vượt (Out-of-ODD)**:
  - Can thiệp con trỏ chuột sang Màn hình Trái khi Ngài đang thao tác code.
  - Thực thi các lệnh shell nguy hiểm: format đĩa cứng, xóa thư mục hệ điều hành, cài đặt kernel driver trái phép.

### 2.3. Miền 3: Robot Vật Lý Để Bàn (Embodied Desk Robot ESP32-S3)
- **Ranh giới chấp thuận**:
  - Biểu cảm mắt OLED: Happy, Thinking, Caring, Alert, Sleepy (`REVERSIBLE`).
  - Điều khiển góc xoay Servo:
    - Trục ngang (Pan): Tối thiểu `-90°`, Tối đa `+90°`.
    - Trục đứng (Tilt): Tối thiểu `-20°`, Tối đa `+30°`.
  - Định vị nguồn âm thanh và xoay đầu hướng về phía Ngài nói (`REVERSIBLE`).
  - Điều khiển đèn bàn làm việc thông minh (`REVERSIBLE`).
- **Ranh giới cấm vượt (Out-of-ODD)**:
  - Góc xoay vượt biên cơ học servo (> 90° hoặc < -90°).
  - Nhiệt độ pin vượt quá `60°C` (Kích hoạt ngắt nguồn tức thì).
  - Mất kết nối nhịp tim (Heartbeat Watchdog) quá `3000ms`.

---

## 3. Tiêu Chí Vào & Rút Lui An Toàn (Entry & Safe-State Exit Criteria)

| Tiêu chí | Điều kiện Hoạt động (ODD Normal) | Cơ chế Rút lui An toàn (Safe-State Fallback) |
|---|---|---|
| **Xác thực Kênh** | Header hoặc Query secret hợp lệ (`ROBOT_GATEWAY_SECRET`, `DESKTOP_TOKEN`) | Đóng kết nối WebSocket với mã lỗi `4401 UNAUTHORIZED`. |
| **Trạng thái Mạng** | Cloud Gemini hoạt động bình thường | Chuyển mạch sang Local SLM Qwen 2.5 trong < 80ms; chuyển Deterministic V2 trong < 5ms. |
| **Tính toàn vẹn Dữ liệu** | HMAC SHA-256 khớp, Nonce chưa từng sử dụng, Timestamp < 300s | Từ chối Webhook với mã `403 FORBIDDEN_SIGNATURE` hoặc `REPLAY_ATTACK`. |
| **Phần cứng Robot** | Nhịp tim < 3000ms, Nhiệt độ pin < 60°C, E-Stop chưa nhấn | Ngắt nguồn cơ cấu chấp hành (Actuator Cut), đưa mắt OLED về trạng thái Alert/Neutral. |
| **Dynamic Skills** | Chạy trong M3 Isolated Sandbox, cấm `process/require/fs/net` | Hủy tiến trình sau 2000ms, đưa kỹ năng vào diện cách ly (Quarantine). |

---

## 4. Bảng Ký Duyệt & Chấp Thuận ODD

- **Người lập**: CODEX (Architect & Reviewer)
- **Người triển khai**: ANTIGRAVITY (Implementation Developer)
- **Chủ quản & Người duyệt tối cao**: **Ngài (Boss Hoàn Bo)**
- **Ngày ban hành**: 06/09/2026 — Trạng thái: **CHÍNH THỨC ÁP DỤNG**

