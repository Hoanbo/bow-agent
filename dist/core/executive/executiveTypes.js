// src/core/executive/executiveTypes.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Canonical type definitions for the Executive Subsystem.
//
// Invariants:
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// DETECTION != DIAGNOSIS
// DIAGNOSIS != AUTHORIZATION
// AUTHORIZATION != SUCCESS
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH
// TASK_COMPLETION != GOAL_COMPLETION
// USER_STOP > AUTONOMOUS_EXECUTION
// USER_CANCEL > AUTONOMOUS_EXECUTION
// USER_PAUSE > AUTONOMOUS_EXECUTION
// HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// GOVERNANCE > COGNITIVE_RECOMMENDATION
// USER_CONTROL > EXECUTIVE_RUNTIME > AUTONOMOUS_EXECUTION
/**
 * Authority levels in the BOWCON hierarchy. Lower numbers denote higher authority.
 * LEVEL 0: System safety (global emergency stops, host integrity)
 * LEVEL 1: Human operator (explicit STOP, CANCEL, PAUSE, token approval)
 * LEVEL 2: Governance / PDP (policy decision point, risk gating)
 * LEVEL 3: Supervisor runtime (autonomous anomaly detection, remediation)
 * LEVEL 4: Executive task orchestrator (DAG scheduler, progress engine)
 * LEVEL 5: Cognitive reasoning (advisory proposals, planning suggestions)
 * LEVEL 6: Capability & world action execution (actual tool execution)
 */
export var AuthorityLevel;
(function (AuthorityLevel) {
    AuthorityLevel[AuthorityLevel["LEVEL_0_SYSTEM_SAFETY"] = 0] = "LEVEL_0_SYSTEM_SAFETY";
    AuthorityLevel[AuthorityLevel["LEVEL_1_HUMAN_OPERATOR"] = 1] = "LEVEL_1_HUMAN_OPERATOR";
    AuthorityLevel[AuthorityLevel["LEVEL_2_GOVERNANCE_PDP"] = 2] = "LEVEL_2_GOVERNANCE_PDP";
    AuthorityLevel[AuthorityLevel["LEVEL_3_SUPERVISOR"] = 3] = "LEVEL_3_SUPERVISOR";
    AuthorityLevel[AuthorityLevel["LEVEL_4_EXECUTIVE_ORCHESTRATOR"] = 4] = "LEVEL_4_EXECUTIVE_ORCHESTRATOR";
    AuthorityLevel[AuthorityLevel["LEVEL_5_COGNITIVE_REASONING"] = 5] = "LEVEL_5_COGNITIVE_REASONING";
    AuthorityLevel[AuthorityLevel["LEVEL_6_CAPABILITY_EXECUTION"] = 6] = "LEVEL_6_CAPABILITY_EXECUTION";
})(AuthorityLevel || (AuthorityLevel = {}));
