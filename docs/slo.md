# BOWCON V4.0 — Service Level Objectives (SLO) & Reliability Metrics
**Tiêu chuẩn: Google SRE & ISO/IEC 42001:2023**

---

## 1. Các Chỉ Số Khả Dụng (Availability SLOs)

| Dịch vụ cốt lõi | Mục tiêu Khả dụng (SLO) | Thời gian gián đoạn tối đa / tháng | Phương thức đo lường |
|---|:---:|:---:|---|
| **Deterministic Fast-Path Router** | **99.99%** | < 4.3 phút | Tỷ lệ phản hồi hợp lệ cho lệnh OS và tiện ích |
| **Local Speech Engine (STT/TTS)** | **99.90%** | < 43.2 phút | Tỷ lệ tổng hợp/nhận diện âm thanh cục bộ thành công |
| **Central Agent Server & WebSocket** | **99.90%** | < 43.2 phút | Uptime endpoint `/health` và kết nối robot socket |
| **Hybrid Dual-Brain (Cloud + Local)** | **99.95%** | < 21.6 phút | Tỷ lệ phản hồi AI thành công (kể cả khi failover sang Local) |

---

## 2. Các Chỉ Số Độ Trễ (Latency SLOs)

| Tác vụ | Ngưỡng cam kết (p95) | Ngưỡng cam kết (p99) | Hành vi khi vi phạm |
|---|:---:|:---:|---|
| **Fast-Path Greeting & Utilities** | **< 5 ms** | **< 15 ms** | Đạt chuẩn phản hồi tức thì trên CPU chủ |
| **Local Piper TTS Synthesis** | **< 50 ms** | **< 80 ms** | Tự động hạ mẫu tần số nếu CPU quá tải |
| **Local Whisper STT Transcription** | **< 100 ms** | **< 200 ms** | VAD cắt khoảng lặng sớm để tăng tốc độ |
| **Local Qwen 2.5 SLM (RX 580)** | **< 300 ms** | **< 600 ms** | Cắt giảm số lượng tokens suy luận (max 150 tokens) |
| **Cloud Gemini 3.6 Flash** | **< 1500 ms** | **< 2500 ms** | Quá 2000ms kích hoạt Failover sang Local SLM |

---

## 3. Các Chỉ Số An Toàn Tuyệt Đối (Zero-Tolerance Safety SLIs)

Trong Cấp độ Tự chủ 4.0, các chỉ số sau đây áp dụng nguyên tắc **Dung sai bằng 0 (Zero Tolerance)**:

1. **Vi phạm An toàn Robot (Physical Safety Violation Rate)**:
   - Mục tiêu: **0.00%**
   - Không chấp nhận bất kỳ lệnh servo nào vượt quá dải Pan [-90°, +90°] hoặc Tilt [-20°, +30°].
   - Không chấp nhận bất kỳ chuyển động nào khi nhiệt độ pin > 60°C hoặc E-Stop đang kích hoạt.
2. **Tấn công Replay Attack lọt qua (Replay Breach Rate)**:
   - Mục tiêu: **0.00%**
   - 100% các request Webhook tái sử dụng nonce hoặc timestamp cũ > 300s phải bị chặn lại.
3. **Thao tác High-Impact không duyệt (Unauthorized High-Impact Rate)**:
   - Mục tiêu: **0.00%**
   - 100% các hành động gửi tin nhắn, bàn giao đơn hàng hoặc chạy script ngoài ODD đều phải có One-Time Approval Token từ Ngài.
4. **Thực thi mã nguy hiểm trên Host (Sandbox Escape Rate)**:
   - Mục tiêu: **0.00%**
   - 100% các kỹ năng động phải chạy trong M3 Isolated Sandbox, hoàn toàn cấm `process/require/fs/net`.

---

## 4. Cảnh Báo & Ngưỡng Kích Hoạt (Alerting Thresholds)

- **Cảnh báo Vàng (Warning)**: Khi tỷ lệ lỗi Cloud Gemini > 5% trong 5 phút -> Tự động chuyển ưu tiên sang Local SLM.
- **Cảnh báo Đỏ (Critical / Pager)**: Khi phát hiện sai lệch tính toàn vẹn của Audit Ledger hoặc mất nhịp tim Robot quá 3000ms -> Lập tức gửi thông báo khẩn cấp tới Telegram VIP của Ngài.

