// src/core/cognitive/index.ts
// BOWCON V4.0 — MS-1.3.32 & MS-1.4.02: COGNITIVE PROVIDER RUNTIME
//
// Barrel exports for the Cognitive Provider Subsystem.

export * from './cognitiveTypes.js';
export * from './cognitiveFailure.js';
export * from './promptBuilder.js';
export * from './contextReconstructor.js';
export * from './intentClassifier.js';
export * from './cognitiveProvider.js';
export * from './ollamaProvider.js';
export * from './deterministicFallbackProvider.js';
export * from './cognitiveRegistry.js';
export * from './cognitivePipeline.js';

// MS-1.4.02 Additions
export * from './cognitiveProviders.js';
export * from './cognitiveCircuitBreaker.js';
export * from './cognitiveProviderRuntime.js';

// MS-1.5.01 Local-First Cognition Additions
export * from './providerNeutralContracts.js';
export * from './modelCapabilityRegistry.js';
export * from './structuredCognitiveValidator.js';
export * from './cloudEscalationSanitizer.js';
export * from './localFirstOllamaRuntime.js';
export * from './localFirstRouterEngine.js';
export * from './localCognitiveRuntimeFacade.js';
