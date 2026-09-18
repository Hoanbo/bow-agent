# BOWCON V4.0 — MASTER ARCHITECTURE IDENTITY, HOST ABSTRACTION & CAPABILITY-AWARE CORE
# Định Danh Kiến Trúc Master, Trừu Tượng Hóa Host & Core Nhận Thức Năng Lực

**Package:** `@bow/agent@4.0.0`  
**Milestone:** `MS-1.3.41`  
**Status:** VERIFIED & LOCKED  
**Language:** English + Vietnamese (Tiếng Anh + Tiếng Việt)  

---

## 1. Executive Summary / Tóm Tắt Điều Hành

### EN
Milestone **MS-1.3.41** corrects and permanently locks the canonical architectural identity of BOWCON V4.0. BOWCON is formally defined as:

> **BOWCON V4.0 is the personal AI cognitive and autonomous operating runtime created to serve its single Master Owner within the broader BOW personal ecosystem.**

BOWCON is **not** an AI runtime owned by or subordinate to ShopOfBow. ShopOfBow is an independent project within the BOW ecosystem that may eventually integrate with BOWCON as an optional surface. The dependency direction is strictly:
`BOWCON CORE -> optional adapter -> ShopOfBow`  
and never:
`ShopOfBow -> BOWCON CORE`.

Furthermore, MS-1.3.41 removes the assumption that BOWCON universally requires Windows 11 x64. BOWCON is architecturally host-independent, observing its actual operating system, CPU architecture, memory, storage, and runtime dynamically through a canonical `HostEnvironment` abstraction, distinguishing real observations from `UNKNOWN` or `UNAVAILABLE` metrics with zero fabrication.

### VI
Cột mốc **MS-1.3.41** hiệu chỉnh và khóa vĩnh viễn định danh kiến trúc chuẩn tắc của BOWCON V4.0. BOWCON được định nghĩa chính thức là:

> **BOWCON V4.0 là runtime điều hành nhận thức và tự chủ AI cá nhân được xây dựng để phục vụ một Master Owner duy nhất bên trong hệ sinh thái cá nhân rộng hơn là BOW.**

BOWCON **không** phải là runtime AI bị sở hữu hoặc trực thuộc ShopOfBow. ShopOfBow là một dự án độc lập trong hệ sinh thái BOW và có thể tích hợp với BOWCON như một bề mặt (surface) tùy chọn trong tương lai. Chiều phụ thuộc hoàn toàn là:
`BOWCON CORE -> optional adapter -> ShopOfBow`  
và không bao giờ là:
`ShopOfBow -> BOWCON CORE`.

Hơn nữa, MS-1.3.41 loại bỏ giả định rằng BOWCON bắt buộc phải chạy trên Windows 11 x64 một cách phổ quát. BOWCON độc lập về mặt kiến trúc với host, tự động quan sát hệ điều hành thực tế, kiến trúc CPU, bộ nhớ, lưu trữ và runtime thông qua lớp trừu tượng `HostEnvironment`, phân biệt các quan sát thực tế với trạng thái `UNKNOWN` hoặc `UNAVAILABLE` mà không bao giờ ngụy tạo số liệu.

---

## 2. Canonical Hierarchy / Phân Cấp Kiến Trúc Chuẩn Tắc

```text
MASTER OWNER
       │
       ▼
      BOW
       │
       ├─────────────────────────────────┐
       │                                 │
       ▼                                 ▼
    BOWCON                          PROJECTS
       │                                 │
       │                                 ├── ShopOfBow
       │                                 ├── Future Projects
       │                                 ├── Future Applications
       │                                 └── Future Devices
       │
       ├── Personal Cognition
       ├── Personal Memory
       ├── Personal Knowledge
       ├── Decision Support
       ├── Executive Runtime
       ├── Continuous Agent Loop
       ├── Supervisor Runtime
       ├── Governance
       ├── Human Authorization
       ├── Capability Runtime
       ├── Verification
       ├── Outcome Learning
       └── Future Capabilities
```

### Invariants:
```text
MASTER_OWNER > BOW > BOWCON > OPTIONAL PROJECT INTEGRATIONS

BOWCON != BOW
BOWCON != MASTER_OWNER
BOWCON != SHOPofBOW

MASTER_OWNER_AUTHORITY > BOWCON_INTELLIGENCE > BOWCON_AUTONOMY

BOWCON_OPINION       != AUTHORITY
BOWCON_CONFIDENCE    != AUTHORITY
BOWCON_INTELLIGENCE  != AUTHORITY
BOWCON_REASONING     != AUTHORITY
BOWCON_AUTONOMY      != OWNERSHIP

CHALLENGE            != AUTHORITY
RECOMMENDATION       != EXECUTION
LEARNING             != AUTHORIZATION
PREDICTION           != FACT
INFERENCE            != MEMORY
MEMORY               != TRUTH

OWNER_DECISION       > BOWCON_RECOMMENDATION
OWNER_OVERRIDE       != BOWCON_FAILURE
USER_STOP            > EVERYTHING_AUTONOMOUS
```

---

## 3. ShopOfBow Classification / Định Vị ShopOfBow

### EN
- **Status:** Independent project within the BOW ecosystem.
- **Architectural Role:** Optional future surface / client integration.
- **Core Decoupling:** BOWCON core initializes, plans, reasons, and executes with 0 dependency on ShopOfBow.
- **Protected Workspace Policy:** `C:\BOW\shopofbow` remains strictly isolated:
  `READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0`.
  Decoupling ShopOfBow from core does NOT remove this security boundary.

### VI
- **Trạng thái:** Dự án độc lập bên trong hệ sinh thái BOW.
- **Vai trò kiến trúc:** Bề mặt (surface) / client tích hợp tùy chọn trong tương lai.
- **Tách rời Core:** BOWCON core khởi tạo, lập kế hoạch, suy luận và thực thi với 0 phụ thuộc vào ShopOfBow.
- **Chính sách Không gian làm việc Được bảo vệ:** `C:\BOW\shopofbow` vẫn bị cô lập nghiêm ngặt:
  `READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0`.
  Việc tách ShopOfBow khỏi core KHÔNG đồng nghĩa với việc gỡ bỏ ranh giới bảo mật này.

---

## 4. Host Environment Abstraction / Trừu Tượng Hóa Môi Trường Host

### EN
The runtime interacts with the host through `HostEnvironment`, eliminating hardcoded platform assumptions:
- **Operating System:** Dynamically queried (`win32`, `linux`, `darwin`).
- **Architecture:** Dynamically queried (`x64`, `arm64`).
- **Telemetry Policy:** Real measurements only. If unmeasurable, values evaluate to `UNKNOWN` or status `UNAVAILABLE`.
  Never fabricate metrics (no fake RX580, no fake 56 cores, no fake 96 GB RAM).
- **Epistemic Statuses:** `KNOWN`, `UNAVAILABLE`, `UNKNOWN`, `NOT_SUPPORTED`, `NOT_MEASURED`.

### VI
Runtime tương tác với host thông qua `HostEnvironment`, loại bỏ các giả định nền tảng cố định:
- **Hệ điều hành:** Truy vấn động (`win32`, `linux`, `darwin`).
- **Kiến trúc:** Truy vấn động (`x64`, `arm64`).
- **Chính sách Telemetry:** Chỉ đo lường thực tế. Nếu không đo lường được, giá trị chuyển về `UNKNOWN` hoặc trạng thái `UNAVAILABLE`.
  Tuyệt đối không bịa đặt số liệu (không GPU ảo, không 56 cores ảo, không 96 GB RAM ảo).
- **Trạng thái nhận thức:** `KNOWN`, `UNAVAILABLE`, `UNKNOWN`, `NOT_SUPPORTED`, `NOT_MEASURED`.

---

## 5. Capability Discovery & Capability-Aware Planning / Khám Phá Năng Lực & Lập Kế Hoạch Nhận Thức Năng Lực

```text
HOST EXISTS
    ↓
CAPABILITY DISCOVERY
    ↓
CAPABILITY MODEL (AVAILABLE | UNAVAILABLE | DEGRADED | RESTRICTED | UNKNOWN)
    ↓
CAPABILITY-AWARE REASONING
    ↓
PLAN FEASIBILITY (PLAN_POSSIBLE | PLAN_CONDITIONALLY_POSSIBLE | PLAN_BLOCKED | PLAN_UNKNOWN)
    ↓
GOVERNED EXECUTION PIPELINE
```

### Invariants:
1. `HOST_EXISTS != CAPABILITY_EXISTS`
2. `CAPABILITY_EXISTS != AUTHORIZED`
3. A plan requiring an unavailable capability is classified as `PLAN_BLOCKED` and never presented as executable fact.
4. Execution remains strictly subordinated to canonical `HumanGate` and `WorldActionAuthorization`.

---

## 6. Zero Duplicate Runtimes / Không Nhân Bản Runtime

MS-1.3.41 integrates directly into the existing baseline:
- Reuses `CapabilityRuntime` and `GovernedCapabilityRegistry`
- Reuses `ExecutiveRuntime` and `ContinuousAgentLoop`
- Reuses `SupervisorRuntime`
- Reuses `MasterHumanAuthority`, `HumanGate`, and `WorldActionAuthorization`
- Reuses `PersonalOperatingSystemRuntime` and `CognitivePartnershipRuntime`
