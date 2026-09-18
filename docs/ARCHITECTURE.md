# Kiến Trúc Hệ Thống Hiện Tại (@bow/agent)

Tài liệu này mô tả cấu trúc kiến trúc trung tâm của `@bow/agent` sau giai đoạn tách lõi (decoupling), xác lập ranh giới rõ ràng giữa **Core (Bộ não phổ quát)** và các **Domain Adapters (Miền ứng dụng cụ thể)**, đồng thời làm rõ trạng thái của các phân hệ phụ trợ.

---

## 1. Sơ Đồ Khối Tổng Quan

```
+-------------------------------------------------------------------------+
|                                CORE (NÃO)                                |
|                                                                         |
|   +-------------------+  +-------------------+  +-------------------+   |
|   |  Intent Resolver  |  |   Action Planner  |  |  Security / PII   |   |
|   +-------------------+  +-------------------+  +-------------------+   |
|   +-------------------+  +-------------------+  +-------------------+   |
|   |    REST / WS      |  |  Vietnamese Voice |  |   Event Bus       |   |
|   |    Gateways       |  |     STT / TTS     |  |   (Proactive)     |   |
|   +-------------------+  +-------------------+  +-------------------+   |
|                                                                         |
|                 +-----------------------------------+                   |
|                 |       commerceRegistry.ts         |                   |
|                 |  (Điểm cắm Provider & Fallback)   |                   |
|                 |  - NOOP_COMMERCE_PROVIDER         |                   |
|                 |  - registerCommerceProvider()     |                   |
|                 |  - registerDomainIntentExtension()|                   |
|                 +-----------------+-----------------+                   |
+-----------------------------------|-------------------------------------+
                                    | Cắm qua Contract / Registry
                                    v
+-------------------------------------------------------------------------+
|                            DOMAIN ADAPTERS                              |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |                   adapters/shopofbow                            |   |
|   |   (Một trong các domain có thể cắm vào Core)                     |   |
|   |   - ShopOfBowCommerceProvider (triển khai CommerceProvider)     |   |
|   |   - shopIntentResolver (mở rộng ý định mua gói bán lẻ)         |   |
|   |   - shopTools, pricing & warranty invariants                    |   |
|   +-----------------------------------------------------------------+   |
|                                                                         |
|   +-----------------------------------------------------------------+   |
|   |           Các Domain Tương Lai (SaaS / CRM / IoT / ...)         |   |
|   |   Triển khai hợp đồng CommerceProvider & cắm vào Core độc lập    |   |
|   +-----------------------------------------------------------------+   |
+-------------------------------------------------------------------------+
```

---

## 2. Cơ Chế Tách Rời (Decoupling Mechanism)

Trước đây, mã nguồn nghiệp vụ của `shopofbow` bị ràng buộc trực tiếp trong lõi điều hành. Hiện tại, ranh giới đã được chuẩn hóa thông qua hợp đồng trừu tượng:

### 2.1 Điểm Đăng Ký Nghiệp Vụ (`registerCommerceProvider`)
- Tệp định nghĩa: `src/core/commerceRegistry.ts`
- Hợp đồng: `src/contracts/commerceProvider.ts`
- Hoạt động:
  - Khi không có adapter bên ngoài nào đăng ký, Core tự động sử dụng `NOOP_COMMERCE_PROVIDER` (id: `'core_noop'`). Tất cả các truy vấn (`queryCatalog`, `lookupEntity`, `executeCommerceAction`) đều trả về kết quả an toàn, không ném ngoại lệ và không yêu cầu cơ sở dữ liệu bán lẻ.
  - Khi ứng dụng khởi chạy cùng một domain cụ thể (ví dụ: `adapters/shopofbow/index.ts`), adapter gọi:
    ```typescript
    registerCommerceProvider(shopOfBowProvider);
    ```
  - Core gọi các hành vi nghiệp vụ độc quyền qua giao diện chuẩn `CommerceProvider` mà không cần biết chi tiết sản phẩm bán lẻ, bảng giá hay cấu trúc database của bên thứ ba.

### 2.2 Mở Rộng Ý Định Ngôn Ngữ (`registerDomainIntentExtension`)
- Tệp định nghĩa: `src/core/intentResolver.ts`
- Hoạt động:
  - Bộ phân giải ý định của Core (`intentResolver.ts`) xử lý các cấu trúc ngôn ngữ phổ quát, câu chào, hỏi đáp trợ lý, điều phối công cụ.
  - Domain adapter đăng ký bổ sung các hàm xử lý chuyên biệt theo nghiệp vụ của mình:
    ```typescript
    registerDomainIntentExtension({
      matchPlanByDuration,
      extractDeferredBuyContext,
      extractDomainDuration: extractShopDuration,
    });
    ```
  - Cơ chế này cho phép Core linh hoạt nhận diện các yêu cầu mua hàng hoặc dịch vụ đặc thù mà vẫn giữ bộ não sạch sẽ và độc lập.

---

## 3. Trạng Thái Các Phân Hệ Phụ Trợ (Subsystem Status)

Trong quá trình tiến hóa từ các phiên bản nghiên cứu trước, nhiều phân hệ đã được xây dựng nhưng hiện tại định hướng phát triển của dự án đã thay đổi:

| Phân hệ / Khối chức năng | Mô tả chức năng gốc | Trạng thái Hiện tại | Ghi chú kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Core Brain & Canonical AgentLoop** | Điều phối hội thoại, PII guard, prompt injection, PDP governance, memory | **HOẠT ĐỘNG CHÍNH (Active Core)** | Trọng tâm phát triển hàng đầu của repo (`src/core/agentLoop.ts`) |
| **BodyProtocol & BodyRegistry** | Giao thức kết nối, xác thực PSK và điều phối năng lực Thể xác ngoại vi | **HOẠT ĐỘNG CHÍNH (Active Core)** | Chuẩn hóa qua WebSocket `/ws/body`, Dynamic Capability Discovery (`src/core/bodyProtocol/`) |
| **Desktop Audio Body & Voice Pipeline** | Thu âm micro tai nghe thật, phát loa thật, chu trình PTT voice end-to-end | **HOẠT ĐỘNG CHÍNH (Active Body)** | Giao tiếp phần cứng Windows WinMM, .NET SoundPlayer, bảo toàn PDP không bypass (`bodies/desktop/`, `src/speech/`) |
| **Commerce Registry** | Điểm cắm mở rộng domain nghiệp vụ | **HOẠT ĐỘNG CHÍNH (Active Core)** | Chuẩn hóa ranh giới giữa Core và domain |
| **ShopOfBow Adapter** | Domain bán lẻ tài khoản, bảo hành, bảng giá | **TÁCH BIỆT (Decoupled Adapter)** | Nằm độc lập trong `src/adapters/shopofbow/`, không còn gắn chết vào Core |
| **Subsystem `governed*`** | Cơ chế kiểm soát canary release, distributed policy evolution, automated baseline reconciliation | **ĐÓNG BĂNG (Frozen / Deprecated)** | Đã được đóng băng, không còn là hướng phát triển chính; tài liệu đặc tả cũ đã chuyển vào archive |
| **Subsystem `federation`** | Node attestation, epoch cutover, cross-tenant policy distribution, multi-agent mesh federation | **ĐÓNG BĂNG (Frozen / Deprecated)** | Không tiếp tục mở rộng; cấu trúc cụm liên đoàn phân tán không còn là mục tiêu cốt lõi |
| **Embodied Actuation (Robot)** | Điều khiển góc Pan/Tilt, an toàn cơ khí, OLED | **KHUNG TRỪU TƯỢNG (Simulation Envelope)** | Hiện là mô hình tính toán phong bì JSON, chờ kết nối phần cứng thực tế |

---

## 4. Kiến Trúc BodyProtocol & Audio Body Foundation

```
[ ULTIMATE OPERATOR ]
       │  ▲
       │  │ (Headset Microphone & Speaker)
       ▼  │
+─────────────────────────────────────────────────────────+
|                  PERIPHERAL DESKTOP BODY                |
|                    (bodies/desktop/)                    |
|                                                         |
|  - DesktopAudioDriver (WinMM waveIn/waveOut)            |
|  - .NET SoundPlayer Audio Playback Engine               |
|  - Capabilities Advertised:                             |
|      * audio.device.list                                |
|      * audio.status                                     |
|      * audio.device.select                              |
|      * audio.capture                                    |
|      * audio.play                                       |
|      * system.open_app, fs.search, fs.read, run_script  |
+──────────────────────────┬──────────────────────────────+
                           │
                           │  WebSocket (/ws/body)
                           │  Authorization: Bearer <PSK>
                           ▼
+─────────────────────────────────────────────────────────+
|               BOWCON CENTRAL AUTONOMOUS BRAIN           |
|                       (src/server.ts)                   |
|                                                         |
|  +--------------------+      +-----------------------+  |
|  |    BodyRegistry    |◄────►|     VoicePipeline     |  |
|  +---------┬----------+      +-----------┬-----------+  |
|            │                             │              |
|            ▼                             ▼              |
|  +───────────────────────────────────────────────────+  |
|  |               CANONICAL AGENTLOOP                 |  |
|  |                                                   |  |
|  |   1. INTENT RESOLUTION (IntentResolver)           |  |
|  |   2. WORKING MEMORY (MemoryContext)               |  |
|  |   3. ACTION PLANNING (ActionPlanner)              |  |
|  |   4. PDP GOVERNANCE (PolicyDecisionPoint L1-L4)   |  |
|  |   5. EXECUTION VIA BODYPROTOCOL / TOOLREGISTRY    |  |
|  |   6. REALITY OBSERVATION & VERIFICATION           |  |
|  |   7. CRYPTOGRAPHIC AUDIT LOGGING (Zero Raw Audio) |  |
|  +───────────────────────────────────────────────────+  |
+─────────────────────────────────────────────────────────+
```

### Nguyên Tắc Bất Biến Của Voice Pipeline:
1. **Zero-Bypass Policy:** Mọi yêu cầu giọng nói sau khi STT chuyển thành văn bản đều phải đi qua `AgentLoop` và `PolicyDecisionPoint`. Các thao tác đặc quyền (mở ứng dụng, chạy script, thay đổi hệ thống) bắt buộc phải có Approval Token từ Ultimate Operator, tuyệt đối không tạo ngoại lệ ngầm qua voice.
2. **Privacy Audit Ledger:** Dữ liệu âm thanh thô (PCM / WAV bytes) tuyệt đối không được ghi vào sổ cái kiểm toán mã hóa (`globalAuditLedger`). Sổ cái chỉ ghi nhận hàm băm SHA256 và thông số siêu dữ liệu kiểm toán.
3. **Decoupled Hardware Driver:** Driver âm thanh tự động nhận dạng thiết bị thực tế của hệ điều hành thông qua API gốc (WinMM), cho phép chỉ định thiết bị qua biến môi trường `BOW_AUDIO_INPUT_DEVICE` và `BOW_AUDIO_OUTPUT_DEVICE` hoặc tự động chọn thiết bị mặc định của hệ thống.
