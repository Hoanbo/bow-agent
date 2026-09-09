# BOWCON V4.0 — MS-1.3.40: MASTER OWNER PERSONAL OPERATING SYSTEM & PROACTIVE COGNITIVE AGENCY RUNTIME
# HỆ ĐIỀU HÀNH NHẬN THỨC CÁ NHÂN VÀ RUNTIME ĐẠI LÝ NHẬN THỨC CHỦ ĐỘNG CHO MASTER OWNER

**Package:** `@bow/agent@4.0.0`  
**Milestone:** `MS-1.3.40`  
**Baseline:** `MS-1.3.35` → `MS-1.3.39`  
**Protected Workspace:** `C:\BOW\shopofbow` (`READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0`)  
**Scope:** CORE PERSONAL COGNITIVE OPERATING SYSTEM ONLY — NO SURFACE INTEGRATION

---

## 1. PRIMARY OBJECTIVE / MỤC TIÊU CỐT LÕI

### English
MS-1.3.40 elevates BOWCON from a personal cognitive partner into a **Personal Cognitive Operating System for its single Master Owner**.
The purpose of this milestone is:
> **Make BOWCON increasingly capable of understanding, assisting, challenging, organizing, remembering, planning, monitoring, and learning for its Master Owner.**

BOWCON moves toward the architectural behavior of a personal AI operating system similar in concept to JARVIS serving Tony Stark, grounded strictly in real executable software without pretending to possess capabilities that have not been implemented.

### Tiếng Việt
MS-1.3.40 nâng cấp BOWCON từ một đối tác nhận thức cá nhân thành một **Hệ Điều Hành Nhận Thức Cá Nhân cho duy nhất Master Owner**.
Mục đích của cột mốc này là:
> **Làm cho BOWCON ngày càng có khả năng thấu hiểu, hỗ trợ, phản biện, tổ chức, ghi nhớ, lập kế hoạch, giám sát và học hỏi phục vụ Master Owner.**

BOWCON tiến tới mô hình kiến trúc của một hệ điều hành AI cá nhân tương tự như hình tượng JARVIS phục vụ Tony Stark, nhưng được xây dựng hoàn toàn dựa trên mã nguồn thực tế có thể thực thi và kiểm chứng, không giả định hay phóng đại các năng lực chưa được triển khai.

---

## 2. THE PERMANENT INVARIANT / BẤT BIẾN QUYỀN LỰC TUYỆT ĐỐI

```text
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

## 3. PROACTIVE ACTION CLASSIFICATION / PHÂN LOẠI HÀNH ĐỘNG CHỦ ĐỘNG

BOWCON enforces four distinct proactive action classes:

| Class | Name | Auto-Executable | Governance Check | Owner Approval | Token Required | Scope & Description |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Class A** | `CLASS_A_INFORMATIONAL` | **YES** | No | No | No | Read-only telemetry, state inspection, metrics, summaries, memory retrieval, contradiction detection. |
| **Class B** | `CLASS_B_REVERSIBLE_INTERNAL` | **YES** | **YES** | No | No | Internal metadata re-indexing, derived context refresh, priority recomputation, plan proposals, internal cache rebuilds. |
| **Class C** | `CLASS_C_OWNER_DECISION` | **NO** | **YES** | **YES** | No | Strategic priority shifts, goal abandonment, selecting between competing strategic trade-offs, constraint alterations. |
| **Class D** | `CLASS_D_EXTERNAL_HIGH_RISK` | **NO** | **YES** | **YES** | **YES** | Modifying host resources, external network calls, destructive operations. Strictly requires canonical `HumanGate` / `WorldActionAuthorization` single-use token. |

---

## 4. ARCHITECTURAL CONTINUOUS COGNITIVE LOOP / VÒNG LẶP NHẬN THỨC 16 GIAI ĐOẠN

```text
MASTER OWNER
      │
      ▼
MASTER HUMAN AUTHORITY
      │
      ├─────────────────────────────────────────────┐
      ▼                                             ▼
BOWCON COGNITION                                USER_STOP
      │                                    (Instant Preemption)
      ├─ 1. OBSERVE (Real Host Telemetry)
      ├─ 2. RECONSTRUCT PERSONAL STATE (PersonalOperatingModel)
      ├─ 3. RECALL RELEVANT MEMORY (9-Vector Provenance Recall)
      ├─ 4. UNDERSTAND OWNER INTENT (OwnerConversationState)
      ├─ 5. ANALYZE (PersonalPatternEngine)
      ├─ 6. CHALLENGE (CognitiveChallenge2Engine: 14 Vectors)
      ├─ 7. GENERATE RECOMMENDATIONS (ProactiveRecommendationEngine: Class A..D)
      ├─ 8. UPDATE EXECUTIVE PLAN (GoalIntelligenceEngine)
      ├─ 9. GOVERN (Pre-execution Policy Gate)
      ├─ 10. REQUEST AUTHORIZATION (HumanGate for Class C/D)
      ├─ 11. EXECUTE AUTHORIZED ACTION (CapabilityRuntime)
      ├─ 12. VERIFY (Independent Outcome Verifier)
      ├─ 13. EVALUATE (Expected vs Actual Outcome)
      ├─ 14. LEARN (OutcomeLearningEngine)
      ├─ 15. UPDATE MEMORY (PersonalMemoryStore)
      ├─ 16. UPDATE PERSONAL OPERATING MODEL (OperatingModelManager)
      │
      └────────────────────────────► (Repeat Bounded Loop)
```

---

## 5. OWNER BRIEFING ENGINE (10 CORE QUESTIONS) / BỘ TỔNG HỢP BÁO CÁO 10 CÂU HỎI CỐT LÕI

The `OwnerBriefingEngine` answers 10 core operational questions grounded strictly in evidence:

1. **What am I currently working on?** — Current active task and immediate objective.
2. **What is most important?** — Primary active milestones and strategic goals.
3. **What is blocked?** — Active dependencies, file lockouts, or unresolved problems.
4. **What changed?** — Recent verified decisions and runtime status transitions.
5. **What failed recently?** — Verified execution outcome failures from the outcome ledger.
6. **What requires my decision?** — Class C proactive proposals awaiting Master Owner choice.
7. **What risks exist?** — Contradictions, elevated load, or dependency bottlenecks.
8. **What should I consider next?** — Inferred proactive suggestions from the recommendation engine.
9. **What information is missing?** — Explicit uncertainties or unresolved contradiction records.
10. **What long-term goals are currently progressing?** — Active long-horizon projects in the knowledge graph.

### Epistemic Labeling / Nhãn Nhận Thức Luận
All briefing items are explicitly tagged with one of:
* `KNOWN`
* `LIKELY`
* `CONFIRMED`
* `OBSERVED`
* `INFERRED`
* `UNCERTAIN`
* `UNKNOWN`
* `CONTRADICTED`
* `REQUIRES_OWNER_CONFIRMATION`

**Rule:** Never fabricate missing information. Unknowns are reported as `UNKNOWN` or `REQUIRES_OWNER_CONFIRMATION`.

---

## 6. DECISION HISTORY & PATTERN INTELLIGENCE / LỊCH SỬ QUYẾT ĐỊNH VÀ PHÁT HIỆN HÌNH MẪU

### Decision History Engine
Records for every decision:
* `decision`: Target decision statement
* `context`: Environmental and project context
* `alternatives`: Considered alternative options
* `ownerDecision`: The choice selected by the Master Owner
* `bowconRecommendation`: What BOWCON originally proposed (if any)
* `reasoning`: The rationale for the choice
* `evidence`: Facts and telemetry available at decision time
* `expectedOutcome` vs `actualOutcome`: Independent post-execution evaluation
* `lessons`: Extracted lessons learned

Answers: *"Why did we choose this?", "What did BOWCON recommend?", "What did the Owner decide?", "What happened afterward?"*

### Personal Pattern Engine
Synthesizes verified recurring patterns from discrete observations:
* `REPEATED_FAILURE`
* `REPEATED_SUCCESS`
* `REPEATED_BOTTLENECK`
* `REPEATED_DELAY`
* `REPEATED_TECHNICAL_PROBLEM`
* `REPEATED_DECISION_REVERSAL`
* `REPEATED_ASSUMPTION_FAILURE`
* `REPEATED_RESOURCE_CONSTRAINT`

**Invariant:** Patterns require a minimum threshold of verified observations (>= 2). No speculative psychological generalizations without evidence.

---

## 7. COGNITIVE CHALLENGE 2.0 / PHẢN BIỆN NHẬN THỨC 2.0

Evaluates Master Owner proposals across 14 multi-dimensional vectors:
1. `logical_consistency`
2. `technical_feasibility`
3. `resource_requirements`
4. `time_constraints`
5. `dependencies`
6. `security`
7. `reliability`
8. `maintainability`
9. `scalability`
10. `cost`
11. `risk`
12. `evidence_quality`
13. `assumption_quality`
14. `historical_outcome_similarity`

Generates counterarguments, alternative plans, and confidence bounds.  
**Critical rule:** `CHALLENGE != AUTHORITY`. A challenge is not an order. BOWCON may disagree, but the Master Owner holds the final decision.

---

## 8. REAL HOST TELEMETRY & PROTECTED WORKSPACE ISOLATION

### Real Host Telemetry
* CPU load, Total RAM, Free RAM, and Process RSS are sampled from real Node.js and OS APIs (`node:os`, `process.memoryUsage()`).
* If any metric is unmeasurable, it is reported honestly as `'UNKNOWN'`. No simulated numbers are presented as live data.

### Protected Workspace Invariant
```text
C:\BOW\shopofbow
READS   = 0
WRITES  = 0
IMPORTS = 0
TOUCHES = 0
```
Every component in `personal-os` actively blocks access to `shopofbow` and flags any reference as a non-overridable `CRITICAL` mandatory safety block.

---

## 9. REALITY GATE VERIFICATION SUMMARY

* **Dedicated Reality Gate:** `tests/test_v4_agent_proactive_personal_operating_system.ts`
* **Test Categories:** 41 categories (A through AO)
* **Assertions:** 102 passed assertions (0 failures, 0 regressions)
* **Full Regression Suite:** 43 passed suites (100% PASS, 0 failures)
* **Status:** VERIFIED & LOCKED
