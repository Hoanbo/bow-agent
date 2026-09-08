import { PolicyDecision, ActionClassification } from './policyDecisionPoint.js';
import { BossProfile, BossProject } from '../embodied/bossMemoryHub.js';
import { BossRule } from '../embodied/bossFeedbackLearner.js';
import { ConversationTurn, MemoryScope } from './memory.js';
import type { AgentMessage } from './types.js';
import { VoiceService } from './voice/voiceService.js';
import type { VoiceConfig, VoiceResult } from './voice/voiceConfig.js';
import { IntentService } from './intent/intentService.js';
import type { SemanticIntent } from './intent/intentTypes.js';
import { PlanningService } from './planning/planningService.js';
import type { ContextAwarePlan } from './planning/planningTypes.js';
import { DecisionService } from './decision/decisionService.js';
import type { DecisionResult } from './decision/decisionTypes.js';
import { ActionOrchestrator } from './orchestration/actionOrchestrator.js';
import type { OrchestrationResult } from './orchestration/orchestrationTypes.js';
import { ExecutionService } from './execution/executionService.js';
import { LifecycleService } from './lifecycle/lifecycleService.js';
import { VerificationService } from './verification/verificationService.js';
import type { VerificationResult as GovernedVerificationResult } from './verification/verificationTypes.js';
import { CommitService } from './commit/commitService.js';
import type { CommitResult as DurableCommitResult } from './commit/commitTypes.js';
import { RecoveryService } from './recovery/recoveryService.js';
import type { RecoveryResult } from './recovery/recoveryTypes.js';
import { CoordinationService } from './coordination/coordinationService.js';
import type { ContinuityContext } from './coordination/coordinationTypes.js';
import { SynchronizationService } from './synchronization/syncService.js';
import type { SynchronizationState } from './synchronization/syncTypes.js';
import { TransportService } from './transport/transportService.js';
import type { TransportSessionSnapshot } from './transport/transportSession.js';
import { RemoteGateway } from './remote/remoteGateway.js';
import type { RemoteSessionSnapshot } from './remote/remoteSession.js';
import { NetworkRuntime } from './network/networkRuntime.js';
import type { NetworkConnectionSnapshot } from './network/networkConnection.js';
import { ConnectionRuntime } from './connection/connectionRuntime.js';
import type { ConnectionSessionSnapshot } from './connection/connectionSession.js';
import { PairingRuntime } from './pairing/pairingRuntime.js';
import type { PairingRecord } from './pairing/pairingTypes.js';
import { PersistentDeviceIdentityRuntime } from './deviceIdentity/persistentDeviceRuntime.js';
import type { PersistentDeviceTrustRecord } from './deviceIdentity/persistentDeviceTypes.js';
import { DeviceVaultRuntime } from './deviceVault/deviceVaultRuntime.js';
import type { DeviceVaultSnapshot } from './deviceVault/deviceVaultTypes.js';
import { ZeroTrustAdmissionRuntime } from './admission/admissionRuntime.js';
import type { ZeroTrustAdmissionSnapshot } from './admission/admissionTypes.js';
import { SecureBrainRelayRuntime } from './relay/relayRuntime.js';
import type { RelayRuntimeSnapshot } from './relay/relayTypes.js';
import { RelayGatewayRuntime } from './wire/relayGatewayRuntime.js';
import type { WireTransportSnapshot } from './wire/wireTypes.js';
import { InternetRuntime, type InternetRuntimeSnapshot } from './internet/internetRuntime.js';
import { BrainRuntime, type BrainRuntimeSnapshot } from './brain/brainRuntime.js';
export type AgentLoopState = 'RECEIVED' | 'INTENT_RESOLVED' | 'MEMORY_LOADED' | 'PLAN_CREATED' | 'POLICY_EVALUATED' | 'EXECUTING' | 'VERIFYING' | 'UPDATING' | 'COMPLETED' | 'INTENT_FAILED' | 'MEMORY_FAILED' | 'PLAN_FAILED' | 'POLICY_DENIED' | 'APPROVAL_REQUIRED' | 'EXECUTION_FAILED' | 'VERIFICATION_FAILED' | 'UPDATE_FAILED';
export type VerificationStatus = 'VERIFICATION_SUCCESS' | 'VERIFICATION_FAILURE' | 'PARTIAL_SUCCESS' | 'UNKNOWN';
export type VerificationStrategy = 'RETURN_VALUE_CHECK' | 'STATE_INSPECTION' | 'WINDOW_CONFIRMATION' | 'TELEMETRY_ACK' | 'SCHEMA_VALIDATION' | 'NONE';
export interface AgentActorIdentity {
    userId: string;
    role: 'owner' | 'admin' | 'customer' | 'desktop_agent' | 'anonymous' | string;
    channel: 'WEB' | 'ROBOT' | 'DESKTOP' | 'SYSTEM' | string;
    isOwner?: boolean;
    authToken?: string;
}
export interface AgentLoopRequest {
    requestId?: string;
    userText: string;
    sessionId: string;
    actor: AgentActorIdentity;
    correlationId?: string;
    idempotencyKey?: string;
    executionToken?: string;
    metadata?: Record<string, any>;
    voiceConfig?: VoiceConfig;
}
export interface LoopIntent {
    intentType: string;
    capability: string;
    actionName?: string;
    parameters: Record<string, any>;
    confidence: number;
    requiresClarification: boolean;
    clarificationPrompt?: string;
    entities: Record<string, any>;
    fastPathMatched: boolean;
}
export type AgentLoopIntent = LoopIntent;
import type { ConversationContextSnapshot } from './context/conversationContext.js';
import { ContextManager } from './context/contextManager.js';
export interface AgentMemoryContext {
    scope: MemoryScope;
    sessionId: string;
    userId: string;
    sessionTurns: ConversationTurn[];
    bossProfile?: BossProfile;
    learnedRules: BossRule[];
    activeProjects: BossProject[];
    contextSnapshot?: ConversationContextSnapshot;
    retrievedAt: string;
}
export interface AgentPlanStep {
    stepId: string;
    toolName: string;
    arguments: Record<string, any>;
    classification: ActionClassification;
    expectedOutcome: string;
    verificationStrategy: VerificationStrategy;
}
export interface AgentPlan {
    planId: string;
    goal: string;
    steps: AgentPlanStep[];
    estimatedRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    requiresApproval: boolean;
    approvalId?: string;
    createdAt: string;
}
export interface AgentPolicyEvaluation {
    stepId: string;
    toolName: string;
    decision: PolicyDecision;
    argumentsHash: string;
}
export interface AgentExecutionResult {
    stepId: string;
    toolName: string;
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    rawOutput?: any;
    error?: string;
    executionDurationMs: number;
}
export interface AgentVerificationResult {
    stepId: string;
    toolName: string;
    status: VerificationStatus;
    verifiedFact?: string;
    discrepancy?: string;
    realityLevel: 'REAL' | 'PARTIAL' | 'MOCK';
}
export interface AgentUpdateResult {
    sessionUpdated: boolean;
    memoryCandidateRecorded: boolean;
    auditRecorded: boolean;
    learnedRuleRecorded: boolean;
    updateTimestamp: string;
}
export interface AgentLoopResult {
    requestId: string;
    correlationId: string;
    sessionId: string;
    actor: AgentActorIdentity;
    state: AgentLoopState;
    intent?: LoopIntent;
    semanticIntent?: SemanticIntent;
    contextAwarePlan?: ContextAwarePlan;
    decisionResult?: DecisionResult;
    orchestrationResult?: OrchestrationResult;
    memoryContext?: AgentMemoryContext;
    plan?: AgentPlan;
    policyEvaluations: AgentPolicyEvaluation[];
    executionResults: AgentExecutionResult[];
    verificationResults: AgentVerificationResult[];
    governedVerificationResult?: GovernedVerificationResult;
    durableCommitResult?: DurableCommitResult;
    recoveryResult?: RecoveryResult;
    coordinationContext?: ContinuityContext;
    synchronizationContext?: SynchronizationState;
    transportContext?: TransportSessionSnapshot;
    remoteContext?: RemoteSessionSnapshot;
    networkContext?: NetworkConnectionSnapshot;
    connectionContext?: ConnectionSessionSnapshot;
    pairingContext?: PairingRecord;
    persistentDeviceContext?: PersistentDeviceTrustRecord;
    deviceVaultContext?: DeviceVaultSnapshot;
    admissionContext?: ZeroTrustAdmissionSnapshot;
    relayContext?: RelayRuntimeSnapshot;
    wireContext?: WireTransportSnapshot;
    internetContext?: InternetRuntimeSnapshot;
    brainContext?: BrainRuntimeSnapshot;
    updateResult?: AgentUpdateResult;
    response: AgentMessage;
    totalDurationMs: number;
    error?: string;
    voiceResult?: VoiceResult;
}
export declare class AgentLoop {
    private voiceService;
    private contextManager;
    private intentService;
    private planningService;
    private decisionService;
    private actionOrchestrator;
    private executionService;
    private lifecycleService;
    private verificationService;
    private commitService;
    private recoveryService;
    private coordinationService;
    private synchronizationService;
    private transportService;
    private remoteGateway;
    private networkRuntime;
    private connectionRuntime;
    private pairingRuntime;
    private persistentDeviceRuntime;
    private deviceVaultRuntime;
    private admissionRuntime;
    private relayRuntime;
    private relayGatewayRuntime;
    private internetRuntime;
    private brainRuntime;
    constructor(voiceService?: VoiceService, contextManager?: ContextManager, intentService?: IntentService, planningService?: PlanningService, decisionService?: DecisionService, actionOrchestrator?: ActionOrchestrator, executionService?: ExecutionService, lifecycleService?: LifecycleService, verificationService?: VerificationService, commitService?: CommitService, recoveryService?: RecoveryService, coordinationService?: CoordinationService, synchronizationService?: SynchronizationService, transportService?: TransportService, remoteGateway?: RemoteGateway, networkRuntime?: NetworkRuntime, connectionRuntime?: ConnectionRuntime, pairingRuntime?: PairingRuntime, persistentDeviceRuntime?: PersistentDeviceIdentityRuntime, deviceVaultRuntime?: DeviceVaultRuntime, admissionRuntime?: ZeroTrustAdmissionRuntime, relayRuntime?: SecureBrainRelayRuntime, relayGatewayRuntime?: RelayGatewayRuntime, internetRuntime?: InternetRuntime, brainRuntime?: BrainRuntime);
    getVoiceService(): VoiceService;
    getContextManager(): ContextManager;
    getIntentService(): IntentService;
    getPlanningService(): PlanningService;
    getDecisionService(): DecisionService;
    getActionOrchestrator(): ActionOrchestrator;
    getExecutionService(): ExecutionService;
    getLifecycleService(): LifecycleService;
    getVerificationService(): VerificationService;
    getCommitService(): CommitService;
    getRecoveryService(): RecoveryService;
    getCoordinationService(): CoordinationService;
    getSynchronizationService(): SynchronizationService;
    getTransportService(): TransportService;
    getRemoteGateway(): RemoteGateway;
    getNetworkRuntime(): NetworkRuntime;
    getConnectionRuntime(): ConnectionRuntime;
    getPairingRuntime(): PairingRuntime;
    getPersistentDeviceIdentityRuntime(): PersistentDeviceIdentityRuntime;
    getDeviceVaultRuntime(): DeviceVaultRuntime;
    getAdmissionRuntime(): ZeroTrustAdmissionRuntime;
    getRelayRuntime(): SecureBrainRelayRuntime;
    getRelayGatewayRuntime(): RelayGatewayRuntime;
    getWireTransportRuntime(): RelayGatewayRuntime;
    getInternetRuntime(): InternetRuntime;
    getBrainRuntime(): BrainRuntime;
    /**
     * Execute the authoritative 7-stage Agent Execution Loop
     */
    execute(req: AgentLoopRequest): Promise<AgentLoopResult>;
    private resolveIntent;
    private loadMemory;
    private createPlan;
    private verifyStep;
    private applyUpdate;
    private resolveVerificationStrategy;
    private formatResponseText;
    private buildFailureResult;
    private synthesizeVoiceIfNeeded;
}
export declare const globalAgentLoop: AgentLoop;
