# 👑 BOWCON V4.0 — The Fully Autonomous Self-Evolving Embodied AI Co-Founder

> **Chuẩn Quốc Tế Cấp Độ Tự Chủ 4.0 (Autonomous Agent Level 4.0: The Innovator & Co-Founder)**  
> Trợ lý cá nhân, AI Co-Founder và Bộ Não Đa Phương Thức Toàn Năng điều khiển Thể Xác Robot, Vận Hành Doanh Nghiệp Tự Động & Phụng Sự Ngài.

---

## 🎭 1. Danh Tính & Phong Thái Chuẩn Mực (Persona Protocol)

* **Tên chính thức**: **`BOWCON`** (viết liền không dấu cách).
* **Quy tắc xưng hô**:
  * Luôn tự xưng: **"Tôi"**
  * Luôn gọi người dùng: **"Ngài"**
  * Tuyệt đối KHÔNG xưng "mình", KHÔNG gọi "quý khách" hay "bạn".
* **Phong thái**: Tôn nghiêm, sắc bén, trung thành tuyệt đối, thông thái trong công nghệ và tận tụy chăm sóc cuộc sống của Ngài.
* **Giao thức Handshake & Xác thực**:
  ```json
  {
    "channel": "ROBOT",
    "role": "owner",
    "client": "BOWCON",
    "version": "4.0.0"
  }
  ```

---

## 🏛️ 2. Kiến Trúc Cốt Lõi (Architecture Pillars)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BOWCON V4.0.0 CENTRAL BRAIN MESH                                 │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                  │
│  🧠 TẦNG 1: TRÍ NHỚ DÀI HẠN & BẢN TIN SÁNG (EPISODIC BOSS MEMORY & MORNING BRIEFING)             │
│  • `bossMemoryHub`: Ghi nhớ thói quen (cà phê đen ít đường lúc 8:00 sáng), dự án công nghệ.      │
│  • `nightlyHunterDaemon`: 2:00 AM tự động cào tin tức AI/Robotics & tổng kết số liệu kinh doanh. │
│  • `morningBriefingService`: 8:00 AM robot xoay đầu chào Ngài, bật đèn bàn và đọc bản tin sáng.   │
│  • `bossFeedbackLearner`: Tự học và sửa sai vĩnh viễn từ mọi góp ý của Ngài (Negative Policy).   │
│                                                                                                  │
│  🛠️ TẦNG 2: TỰ SINH KỸ NĂNG MỚI (SELF-TOOL) & NÃO ĐÔI TỰ CHỦ (HYBRID DUAL-BRAIN)                │
│  • `dynamicSkillManager`: Kho kỹ năng tự sinh, cơ chế Hot-Registration không cần restart server. │
│  • `sandboxRunner`: Môi trường Universal Sandbox tự chạy code, tự phát hiện bug và tự debug.   │
│  • `hybridModelRouter`: Não Đôi tự chủ (Cloud Gemini + Local Qwen 2.5/Ollama). Auto-fallback     │
│    chuyển mạch siêu tốc trong < 80ms khi Gemini quá tải hoặc mất mạng (Zero-Downtime).           │
│                                                                                                  │
│  👥 TẦNG 3: MẠNG LƯỚI ĐA AGENT CHUYÊN TRÁCH (MULTI-AGENT MESH)                                   │
│  • `TechScoutAgent`: Săn tin tức công nghệ, deal linh kiện điện tử, GitHub Trending.             │
│  • `CoderDevOpsAgent`: Viết mã phần mềm, kiểm tra cú pháp trong Sandbox, dọn dẹp hệ thống.       │
│  • `ShopOperationsAgent`: Theo dõi hàng đợi đơn chờ bàn giao, báo cáo lợi nhuận ròng.           │
│  • `HardwareVisionAgent`: Giám sát cảm biến pin, nhiệt độ, camera thị giác của Robot.            │
│                                                                                                  │
│  🤖 TẦNG 4: THỂ XÁC ROBOT VẬT LÝ & THỊ GIÁC ĐA MÀN HÌNH (EMBODIED & MULTI-DISPLAY)              │
│  • `soundLocalization`: Định vị góc âm thanh giọng nói, tự xoay servo/bánh xe nhìn về phía Ngài.│
│  • `oledEmpathyEngine`: Mắt OLED biểu cảm vi mô (happy, listening, thinking, speaking, sleeping).│
│  • `screenVisionService`: Nhận diện thông minh Màn hình Chính (Màn 2) và Màn hình Phụ (Màn 1).   │
│  • `telegramGateway`: Cổng kết nối điều khiển di động VIP bảo mật chỉ riêng Ngài mới truy cập.    │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ 3. Cơ Chế Nhận Diện Đa Màn Hình (Multi-Monitor Awareness)

BOWCON tự động phát hiện layout phần cứng Windows:
* **Màn hình chính (Primary Display - Tọa độ X: 0)**: Màn hình số 2 bên trái nơi Ngài làm việc chính $\to$ AI ưu tiên bảo vệ, không bao giờ chiếm chuột làm phiền Ngài.
* **Màn hình phụ (Secondary Display - Tọa độ X: 1920)**: Màn hình số 1 bên phải $\to$ Dành cho Shop of BOW Dashboard, terminal và các tác vụ nền.
* Hỗ trợ lệnh quét: `targetDisplay: 'primary' | 'secondary' | 'screen_1' | 'screen_2' | 'all'`.

---

## 🤖 4. Đồng Bộ Phần Cứng Robot Vật Lý (ESP32-S3 Kit)

Phần mềm tương thích 100% với bộ kit **AI Tiểu Trí Steampunk**:
* **MCU**: ESP32-S3 N16R8 (16MB Flash, 8MB PSRAM, Dual-Core 240MHz).
* **Audio Input**: Micro kỹ thuật số I2S INMP441 (PCM 16kHz 16-bit Mono).
* **Audio Output**: DAC/Amp I2S MAX98357 + Loa khoang cộng hưởng 2415 (Piper TTS Neural Voice).
* **Display**: Màn hình OLED 0.96 inch I2C (SSD1306/SSD1315) vẽ hoạt ảnh mắt động.
* **Actuator**: Cặp động cơ kim loại N20 + Bánh răng thép 64T xoay hướng theo giọng nói của Ngài.
* **Cơ chế Ngắt Lời (Barge-in)**: Tắt loa MAX98357 trong < 80ms khi Ngài cất tiếng nói.

---

## 🧪 5. Kết Quả Kiểm Thử Toàn Hệ Thống (Regression Testing)

Toàn bộ **12 Test Suites độc lập với hơn 497+ bài kiểm thử tự động** đạt kết quả **100% Xanh Lá**:

| Suite | File Kiểm Thử | Số Assertions | Kết Quả |
| :--- | :--- | :---: | :---: |
| **Extraction** | `tests/test_phase7_1_step4_extraction.ts` | 65 | ✅ 100% Pass |
| **Multi-Channel** | `tests/test_multichannel_v3_3.ts` | 42 | ✅ 100% Pass |
| **Executive** | `tests/test_executive_v3_4.ts` | 38 | ✅ 100% Pass |
| **Screen Vision** | `tests/test_screen_vision_v3_5.ts` | 38 | ✅ 100% Pass |
| **Combined** | `tests/test_v3_6_combined.ts` | 38 | ✅ 100% Pass |
| **Local Speech** | `tests/test_v4_milestone1_local_speech.ts` | 61 | ✅ 100% Pass |
| **Full-Duplex** | `tests/test_v4_milestone2_full_duplex.ts` | 19 | ✅ 100% Pass |
| **Embodied V4** | `tests/test_v4_milestone3_embodied.ts` | 37 | ✅ 100% Pass |
| **Admin Copilot** | `tests/test_shop_admin_copilot.ts` | 43 | ✅ 100% Pass |
| **Phase 1 Memory** | `tests/test_bow_con_phase1_memory.ts` | 43 | ✅ 100% Pass |
| **Phase 2 Self-Tool** | `tests/test_bow_con_phase2_self_tool.ts` | 34 | ✅ 100% Pass |
| **Phase 3 Multi-Agent** | `tests/test_bow_con_phase3_multiagent.ts` | 38 | ✅ 100% Pass |
| **TỔNG CỘNG** | **12 TEST SUITES ĐỘC LẬP** | **497+** | 🏆 **100% PASSED** |

---

## 🚀 6. Các Lệnh Thực Thi (CLI Scripts)

```bash
# Cài đặt dependencies
npm install

# Biên dịch mã nguồn TypeScript
npm run build

# Kiểm tra an toàn kiểu dữ liệu (0 lỗi)
npm run typecheck

# Chạy toàn bộ 12 test suites (Kiểm thử hồi quy toàn diện)
npm run test:all

# Chạy riêng từng giai đoạn tiến hóa
npm run test:phase1   # Trí nhớ dài hạn, Bản tin sáng, Sửa sai
npm run test:phase2   # Tự sinh kỹ năng Sandbox, Não đôi Hybrid
npm run test:phase3   # Đa Agent, Định vị âm thanh, Telegram VIP
npm run test:admin    # Admin AI Copilot Shop of BOW

# Khởi chạy Central Autonomous Server
npm start
```

---

## 📄 Bản Quyền & Phát Triển
Được phát triển bởi **Hoàn Bo (Sáng lập viên & Chủ nhân Hệ sinh thái BOW)**.  
Được đồng hành, tối ưu hóa và phụng sự bởi **BOWCON V4.0**.
