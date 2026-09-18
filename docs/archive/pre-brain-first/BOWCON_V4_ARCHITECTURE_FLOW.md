# BOWCON V4.0 — ARCHITECTURE FLOW DIAGRAM (BILINGUAL)
# Sơ Đồ Luồng Kiến Trúc (Song Ngữ)

---

## 1. REQUEST LIFECYCLE / VÒNG ĐỜI YÊU CẦU

```mermaid
flowchart TD
    A["🌐 User Request\n(Yêu cầu người dùng)\nWEB / ROBOT / DESKTOP / SPEECH"] --> B

    B["Stage 1: Intent Resolution\n(Giai đoạn 1: Xác định ý định)\nFastPathRouter → IntentResolver"] --> C

    C["Stage 2: Memory Retrieval READ-ONLY\n(Giai đoạn 2: Đọc bộ nhớ — chỉ đọc)\nWorking Memory + Boss Memory + Context Snapshot"] --> D

    D["Stage 3: Bounded Planning\n(Giai đoạn 3: Lập kế hoạch có giới hạn)\nActionPlanner → ExecutionPlan"] --> E

    E{"Stage 4: PDP Governance\n(Giai đoạn 4: Kiểm tra chính sách)\nPolicyDecisionPoint — Default Deny"}

    E -->|"PERMIT\n(Cho phép)"| F
    E -->|"DENY\n(Từ chối)"| Z1["❌ POLICY_DENIED\nTừ chối bởi chính sách"]
    E -->|"APPROVAL_REQUIRED\n(Cần phê duyệt)"| Z2["⏳ APPROVAL_REQUIRED\nĐợi con người phê duyệt"]

    F["Stage 5: Tool Execution\n(Giai đoạn 5: Thực thi công cụ)\nToolRegistry → Tool Handler"] --> G

    G{"Stage 6: Verification\n(Giai đoạn 6: Xác minh kết quả)"}
    G -->|"PASS (Đạt)"| H
    G -->|"FAIL (Thất bại)"| Z3["⚠️ VERIFICATION_FAILED\nXác minh thất bại"]

    H["Stage 7: State Update\n(Giai đoạn 7: Cập nhật trạng thái)\nWorking Memory + Context + Voice"] --> I

    I["✅ COMPLETED\n(Hoàn thành)\nFinal Response + Audio"]
```

---

## 2. MEMORY ARCHITECTURE / KIẾN TRÚC BỘ NHỚ

```mermaid
flowchart LR
    subgraph WM["Working Memory (Bộ nhớ làm việc)"]
        WM1["MemoryStore\nIn-process Map\nKey: userId::sessionId"]
        WM2["ConversationContext\nContextManager\nTopic + References + Items"]
    end

    subgraph DM["Durable Memory (Bộ nhớ bền vững)"]
        DM1["BossMemoryHub\nBossProfile per user\nAtomic JSON"]
        DM2["BossFeedbackLearner\nCustom rules per user\nAtomic JSON"]
        DM3["ApprovalService\nApproval records per user\nAtomic JSON"]
        DM4["IdempotencyStore\nIdempotency entries per user\nAtomic JSON"]
    end

    subgraph PE["Persistence Engine (Động cơ lưu trữ)"]
        PE1["DurableJsonStore\nAtomic write + rename\nSchema validation\nQuarantine on corruption"]
        PE2["UserPartitionResolver\nuserId → safe file path\nPath traversal defense"]
    end

    WM --> PE
    DM --> PE
    PE --> PE1
    PE --> PE2
```

---

## 3. GOVERNANCE / PDP FLOW / LUỒNG PDP

```mermaid
flowchart TD
    R["Requested Tool + Args\n(Công cụ được yêu cầu + đối số)"] --> CLS

    CLS{"Classify Action\n(Phân loại hành động)"}
    CLS --> OB["OBSERVE\nRead-only, no side effects\n(Chỉ đọc, không tác dụng phụ)"]
    CLS --> RE["RECOMMEND\nInference only\n(Chỉ suy luận)"]
    CLS --> RV["REVERSIBLE\nLight write, undoable\n(Ghi nhẹ, có thể đảo ngược)"]
    CLS --> HI["HIGH_IMPACT\nRequires human approval\n(Cần phê duyệt con người)"]
    CLS --> FB["FORBIDDEN\nAlways denied, no exceptions\n(Luôn từ chối, không ngoại lệ)"]

    HI --> TOK{"Has valid execution token?\n(Có token thực thi hợp lệ?)"}
    TOK -->|"YES (Có)"| EXEC["✅ Execute\n(Thực thi)"]
    TOK -->|"NO (Không)"| APPROVAL["⏳ Request Approval\n(Yêu cầu phê duyệt)"]

    OB --> EXEC
    RE --> EXEC
    RV --> IDMP

    IDMP{"Check Idempotency\n(Kiểm tra Idempotency)"}
    IDMP -->|"NEW (Mới)"| EXEC
    IDMP -->|"IN_PROGRESS\n(Đang xử lý)"| BLOCK["⛔ Duplicate Blocked\n(Chặn trùng lặp)"]
    IDMP -->|"DONE (Hoàn thành)"| CACHE["✅ Return Cached Result\n(Trả về kết quả cache)"]
```

---

## 4. VOICE PIPELINE / LUỒNG XỬ LÝ GIỌNG NÓI

```mermaid
flowchart LR
    TR["Text Response\n(Văn bản phản hồi)"] --> PP

    PP["SpeechTextProcessor\nRemove markdown/emoji\n(Xóa markdown/emoji)\nConvert numbers/currency\n(Chuyển đổi số/tiền tệ)"] --> SEG

    SEG["SpeechSegmenter\nSplit into sentences\n(Chia thành câu)\nProtect URLs/decimals\n(Bảo vệ URL/số thập phân)"] --> PROS

    PROS["VoiceProsodyPlanner\nPlan pauses + speed + emphasis\n(Lập kế hoạch dừng + tốc độ + nhấn mạnh)"] --> PROV

    PROV{"VoiceService\nSelect Provider\n(Chọn Provider)"}
    PROV -->|"Primary (Chính)"| P1["OpenAI TTS Provider"]
    PROV -->|"Fallback (Dự phòng)"| P2["ElevenLabs Provider"]
    PROV -->|"Test (Kiểm thử)"| P3["Mock TTS Provider"]

    P1 --> ASM
    P2 --> ASM
    P3 --> ASM

    ASM["AudioAssembler\nCombine chunks\n(Kết hợp đoạn âm thanh)\nWrite WAV headers\n(Ghi tiêu đề WAV)"] --> OUT

    OUT["🔊 VoiceResult\naudio + format + speechText"]
```

---

## 5. CONTEXT SUBSYSTEM / HỆ THỐNG NGỮ CẢNH

```mermaid
flowchart TD
    TURN["New User Turn\n(Lượt người dùng mới)"] --> CM

    CM["ContextManager\nOrchestrates all subsystems\n(Điều phối tất cả các hệ thống con)"]

    CM --> CC["ContextClassifier\nEPHEMERAL / SESSION / USER / DURABLE\n(Phân loại mức độ quan trọng)"]
    CM --> TT["TopicTracker\nDetect topic + transition\n(Phát hiện chủ đề + chuyển đổi)"]
    CM --> RR["ReferenceResolver\nResolve 'cái đó' / 'bước trên'\n(Giải quyết tham chiếu ngôn ngữ)"]
    CM --> CR["ContextRanker\nCRITICAL > HIGH > MEDIUM > LOW > TRIVIAL\n(Xếp hạng theo độ quan trọng)"]
    CM --> COMP["ContextCompactor\nCompress when > threshold turns\n(Nén khi vượt ngưỡng số lượt)"]
    CM --> STORE["ContextStore\nPartitioned Map userId::sessionId\n(Map phân vùng theo userId::sessionId)"]

    CC --> SNAP
    TT --> SNAP
    RR --> SNAP
    CR --> SNAP
    COMP --> SNAP
    STORE --> SNAP

    SNAP["ConversationContextSnapshot\nImmutable point-in-time view\n(Chụp ảnh bất biến tại một thời điểm)"]
    SNAP --> AL2["AgentLoop Stage 2\nInject into MemoryContext\n(Tiêm vào MemoryContext)"]
```

---

## 6. DATA ISOLATION BOUNDARIES / RANH GIỚI CÔ LẬP DỮ LIỆU

```
┌─────────────────────────────────────────────────────────────────┐
│  User A                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Session A-1                    Session A-2              │   │
│  │  WorkingMemory[A::A-1]          WorkingMemory[A::A-2]   │   │
│  │  ContextStore[A::A-1]           ContextStore[A::A-2]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│  DurableMemory[A] → data/users/A/bossMemory.json               │
│  Approvals[A]    → data/approvals/A/approvals.json             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  User B  ← COMPLETELY ISOLATED FROM User A                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Session B-1                                             │   │
│  │  WorkingMemory[B::B-1]                                  │   │
│  │  ContextStore[B::B-1]                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│  DurableMemory[B] → data/users/B/bossMemory.json               │
│  Approvals[B]    → data/approvals/B/approvals.json             │
└─────────────────────────────────────────────────────────────────┘
```

---

*Generated as part of BOWCON V4.0 Bilingual Documentation Pass*
*Được tạo như một phần của Tài liệu Song Ngữ BOWCON V4.0*
