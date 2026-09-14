// src/core/deliberation/index.ts
// BOWCON V4.0 — MS-1.5.05: NATIVE NEURO-SYMBOLIC DELIBERATION ENGINE
// Component 1027 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// HYPOTHESIS != FACT
// EVIDENCE != PROOF
// VECTOR MATCH != TRUTH
// PRIORITY != AUTHORIZATION
// USER_STOP > ALL MUTATION
// LLM OUTPUT != AUTHORITATIVE STATE
// WORKING STATE != DURABLE TRUTH
// ZERO_DIRECT_TOOL_EXECUTION == TRUE

// 1018: Deliberation Types, Errors, Ontology, and Provenance Functions
export * from './deliberationTypes.js';

// 1019: Deliberation Validator (Fails-Closed, Prototype Pollution, CoT Prohibition)
export * from './deliberationValidator.js';

// 1020: Evidence Binding Engine (Source Types, Provenance, Advisory Semantic Memory)
export * from './evidenceBindingEngine.js';

// 1021: Hypothesis Engine (Proposal Validation, Lifecycle, Versioning)
export * from './hypothesisEngine.js';

// 1022: Symbolic Constraint Engine (Deterministic Evaluation, MUST/MUST_NOT/PREFER)
export * from './symbolicConstraintEngine.js';

// 1023: Bounded Deliberation Search Engine (Depth & Count Bounds, Deterministic Tie-Breaking)
export * from './deliberationSearchEngine.js';

// 1024: Contradiction Resolver (6 Categories, Fails-Closed, Human Review Flag)
export * from './contradictionResolver.js';

// 1025: Deliberation Lifecycle Manager (INITIALIZING -> DELIBERATING -> CONVERGED -> RESOLVED)
export * from './deliberationLifecycleManager.js';

// 1026: Deliberation Persistence & Recovery Engine (Crash-Safe, .bak Recovery, OCC)
export * from './deliberationPersistenceRecoveryEngine.js';
