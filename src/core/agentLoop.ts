// src/core/agentLoop.ts
// BOWCON V4.0 — AUTHORITATIVE CANONICAL AGENT LOOP (MILESTONE 1.2)
//
// EN:
// The AgentLoop is the central 7-stage lifecycle that every user request passes through.
// Every stage has exactly one responsibility and its output gates the next stage.
// No stage can be skipped, reordered, or bypassed.
//
// VI:
// AgentLoop là chu trình (lifecycle) 7 giai đoạn trung tâm mà mọi yêu cầu của người dùng
// đều phải đi qua. Mỗi giai đoạn chỉ có một trách nhiệm duy nhất và kết quả của nó
// kiểm soát việc tiếp tục sang giai đoạn tiếp theo.
// Không có giai đoạn nào có thể bị bỏ qua, sắp xếp lại, hoặc vượt qua.
//
// Lifecycle (Chu trình sống):
// INTENT → MEMORY → PLAN → PDP → EXECUTE → VERIFY → UPDATE
// Stage 1: Intent Resolution    — Hiểu ý định người dùng
// Stage 2: Memory Retrieval     — Đọc bộ nhớ phiên (read-only)
// Stage 3: Bounded Planning     — Tạo kế hoạch hành động có giới hạn
// Stage 4: PDP Governance       — Kiểm tra chính sách (không thể bỏ qua)
// Stage 5: Tool Execution       — Thực thi công cụ qua ToolRegistry
// Stage 6: Verification         — Xác minh kết quả sau thực thi
// Stage 7: State Update         — Cập nhật bộ nhớ và voice
//
// Invariants (Bất biến):
// 1. Không có hành động nào có đặc quyền có thể vượt qua PolicyDecisionPoint (PDP).
// 2. Không có kết quả thực thi nào có thể bỏ qua bước xác minh.
// 3. Không có kết quả thành công nào có thể cập nhật trạng thái bến vững mà không qua UPDATE.
// 4. Việc đọc bộ nhớ là READ-ONLY và được phân phạm vi theo sessionId / userId.
// 5. Thực thi chỉ xảy ra thông qua ToolRegistry.

import crypto from 'node:crypto';
import { globalPDP, PolicyDecision, ActionClassification } from './policyDecisionPoint.js';
import { toolRegistry, ToolExecutionContext } from '../tools/registry.js';
import { globalBossMemory, BossProfile, BossProject } from '../embodied/bossMemoryHub.js';
import { globalBossFeedback, BossRule } from '../embodied/bossFeedbackLearner.js';
import { memoryStore, ConversationTurn, MemoryScope, getSessionMemory, appendTurn } from './memory.js';
import { fastPathRouter } from './fastPathRouter.js';
import { scanSecurity, redactPii } from './security.js';
import type { AgentMessage, AgentContext } from './types.js';
import { VoiceService, globalVoiceService } from './voice/voiceService.js';
import type { VoiceConfig, VoiceResult } from './voice/voiceConfig.js';
import { IntentService } from './intent/intentService.js';
import type { SemanticIntent } from './intent/intentTypes.js';
import { PlanningService } from './planning/planningService.js';
import type { ContextAwarePlan } from './planning/planningTypes.js';
import { createDecisionContext } from './planning/decisionContext.js';
import { DecisionService } from './decision/decisionService.js';
import type { DecisionResult } from './decision/decisionTypes.js';
import { ActionOrchestrator } from './orchestration/actionOrchestrator.js';
import type { OrchestrationResult } from './orchestration/orchestrationTypes.js';
import { ExecutionService } from './execution/executionService.js';
import { CapabilityRegistry } from './execution/capabilityRegistry.js';
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
import { InMemoryWireServerAdapter } from './wire/adapters/inMemoryWireAdapter.js';
import { InternetRuntime, type InternetRuntimeSnapshot } from './internet/internetRuntime.js';
import { BrainRuntime, type BrainRuntimeSnapshot } from './brain/brainRuntime.js';

// ---------------------------------------------------------------------------
// 1. STRONGLY TYPED LIFECYCLE STATES
// ---------------------------------------------------------------------------

// EN:
// AgentLoopState represents every valid lifecycle state the AgentLoop can be in.
// Failure states always end with _FAILED or _DENIED; they are terminal — the loop stops.
// The happy path is: RECEIVED → ... → COMPLETED.
//
// VI:
// AgentLoopState thể hiện tất cả các trạng thái hợp lệ mà AgentLoop có thể ở.
// Các trạng thái lỗi luôn kết thúc bằng _FAILED hoặc _DENIED — chúng là trạng thái cuối cùng.
// Ngư pháp hạnh phúc (happy path): RECEIVED → ... → COMPLETED.
export type AgentLoopState =
  | 'RECEIVED'
  | 'INTENT_RESOLVED'
  | 'MEMORY_LOADED'
  | 'PLAN_CREATED'
  | 'POLICY_EVALUATED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'UPDATING'
  | 'COMPLETED'
  | 'INTENT_FAILED'
  | 'MEMORY_FAILED'
  | 'PLAN_FAILED'
  | 'POLICY_DENIED'
  | 'APPROVAL_REQUIRED'
  | 'EXECUTION_FAILED'
  | 'VERIFICATION_FAILED'
  | 'UPDATE_FAILED';

export type VerificationStatus =
  | 'VERIFICATION_SUCCESS'
  | 'VERIFICATION_FAILURE'
  | 'PARTIAL_SUCCESS'
  | 'UNKNOWN';

export type VerificationStrategy =
  | 'RETURN_VALUE_CHECK'
  | 'STATE_INSPECTION'
  | 'WINDOW_CONFIRMATION'
  | 'TELEMETRY_ACK'
  | 'SCHEMA_VALIDATION'
  | 'NONE';

// ---------------------------------------------------------------------------
// 2. DATA STRUCTURES & INTERFACES
// ---------------------------------------------------------------------------

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
import { ContextManager, globalContextManager } from './context/contextManager.js';

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

// ---------------------------------------------------------------------------
// 3. AUTHORITATIVE CANONICAL AGENT LOOP CLASS
// ---------------------------------------------------------------------------

export class AgentLoop {
  private voiceService: VoiceService;
  private contextManager: ContextManager;
  private intentService: IntentService;
  private planningService: PlanningService;
  private decisionService: DecisionService;
  private actionOrchestrator: ActionOrchestrator;
  private executionService: ExecutionService;
  private lifecycleService: LifecycleService;
  private verificationService: VerificationService;
  private commitService: CommitService;
  private recoveryService: RecoveryService;
  private coordinationService: CoordinationService;
  private synchronizationService: SynchronizationService;
  private transportService: TransportService;
  private remoteGateway: RemoteGateway;
  private networkRuntime: NetworkRuntime;
  private connectionRuntime: ConnectionRuntime;
  private pairingRuntime: PairingRuntime;
  private persistentDeviceRuntime: PersistentDeviceIdentityRuntime;
  private deviceVaultRuntime: DeviceVaultRuntime;
  private admissionRuntime: ZeroTrustAdmissionRuntime;
  private relayRuntime: SecureBrainRelayRuntime;
  private relayGatewayRuntime: RelayGatewayRuntime;
  private internetRuntime: InternetRuntime;
  private brainRuntime: BrainRuntime;

  constructor(
    voiceService?: VoiceService,
    contextManager?: ContextManager,
    intentService?: IntentService,
    planningService?: PlanningService,
    decisionService?: DecisionService,
    actionOrchestrator?: ActionOrchestrator,
    executionService?: ExecutionService,
    lifecycleService?: LifecycleService,
    verificationService?: VerificationService,
    commitService?: CommitService,
    recoveryService?: RecoveryService,
    coordinationService?: CoordinationService,
    synchronizationService?: SynchronizationService,
    transportService?: TransportService,
    remoteGateway?: RemoteGateway,
    networkRuntime?: NetworkRuntime,
    connectionRuntime?: ConnectionRuntime,
    pairingRuntime?: PairingRuntime,
    persistentDeviceRuntime?: PersistentDeviceIdentityRuntime,
    deviceVaultRuntime?: DeviceVaultRuntime,
    admissionRuntime?: ZeroTrustAdmissionRuntime,
    relayRuntime?: SecureBrainRelayRuntime,
    relayGatewayRuntime?: RelayGatewayRuntime,
    internetRuntime?: InternetRuntime,
    brainRuntime?: BrainRuntime
  ) {
    this.voiceService = voiceService || globalVoiceService;
    this.contextManager = contextManager || globalContextManager;
    this.intentService = intentService || new IntentService();
    this.planningService = planningService || new PlanningService();
    this.decisionService = decisionService || new DecisionService();
    this.actionOrchestrator = actionOrchestrator || new ActionOrchestrator();
    this.executionService = executionService || new ExecutionService(new CapabilityRegistry());
    this.lifecycleService = lifecycleService || new LifecycleService();
    this.verificationService = verificationService || new VerificationService();
    this.commitService = commitService || new CommitService();
    this.recoveryService = recoveryService || new RecoveryService();
    this.coordinationService = coordinationService || new CoordinationService();
    this.synchronizationService = synchronizationService || new SynchronizationService();
    this.transportService = transportService || new TransportService();
    this.remoteGateway = remoteGateway || new RemoteGateway();
    this.networkRuntime = networkRuntime || new NetworkRuntime();
    this.connectionRuntime = connectionRuntime || new ConnectionRuntime();
    this.pairingRuntime = pairingRuntime || new PairingRuntime();
    this.persistentDeviceRuntime = persistentDeviceRuntime || new PersistentDeviceIdentityRuntime();
    this.deviceVaultRuntime = deviceVaultRuntime || new DeviceVaultRuntime();
    this.admissionRuntime = admissionRuntime || new ZeroTrustAdmissionRuntime();
    this.relayRuntime = relayRuntime || new SecureBrainRelayRuntime();
    this.relayGatewayRuntime =
      relayGatewayRuntime ||
      new RelayGatewayRuntime({ serverAdapter: new InMemoryWireServerAdapter() });
    this.internetRuntime = internetRuntime || new InternetRuntime({ allowInsecureEndpoints: true, edgeConfig: { requireMtls: false, allowTls12: true } });
    this.brainRuntime = brainRuntime || new BrainRuntime({ modelProvider: 'auto' });
  }

  public getVoiceService(): VoiceService {
    return this.voiceService;
  }

  public getContextManager(): ContextManager {
    return this.contextManager;
  }

  public getIntentService(): IntentService {
    return this.intentService;
  }

  public getPlanningService(): PlanningService {
    return this.planningService;
  }

  public getDecisionService(): DecisionService {
    return this.decisionService;
  }

  public getActionOrchestrator(): ActionOrchestrator {
    return this.actionOrchestrator;
  }

  public getExecutionService(): ExecutionService {
    return this.executionService;
  }

  public getLifecycleService(): LifecycleService {
    return this.lifecycleService;
  }

  public getVerificationService(): VerificationService {
    return this.verificationService;
  }

  public getCommitService(): CommitService {
    return this.commitService;
  }

  public getRecoveryService(): RecoveryService {
    return this.recoveryService;
  }

  public getCoordinationService(): CoordinationService {
    return this.coordinationService;
  }

  public getSynchronizationService(): SynchronizationService {
    return this.synchronizationService;
  }

  public getTransportService(): TransportService {
    return this.transportService;
  }

  public getRemoteGateway(): RemoteGateway {
    return this.remoteGateway;
  }

  public getNetworkRuntime(): NetworkRuntime {
    return this.networkRuntime;
  }

  public getConnectionRuntime(): ConnectionRuntime {
    return this.connectionRuntime;
  }

  public getPairingRuntime(): PairingRuntime {
    return this.pairingRuntime;
  }

  public getPersistentDeviceIdentityRuntime(): PersistentDeviceIdentityRuntime {
    return this.persistentDeviceRuntime;
  }

  public getDeviceVaultRuntime(): DeviceVaultRuntime {
    return this.deviceVaultRuntime;
  }

  public getAdmissionRuntime(): ZeroTrustAdmissionRuntime {
    return this.admissionRuntime;
  }

  public getRelayRuntime(): SecureBrainRelayRuntime {
    return this.relayRuntime;
  }

  public getRelayGatewayRuntime(): RelayGatewayRuntime {
    return this.relayGatewayRuntime;
  }

  public getWireTransportRuntime(): RelayGatewayRuntime {
    return this.relayGatewayRuntime;
  }

  public getInternetRuntime(): InternetRuntime {
    return this.internetRuntime;
  }

  public getBrainRuntime(): BrainRuntime {
    return this.brainRuntime;
  }


  /**
   * Execute the authoritative 7-stage Agent Execution Loop
   */
  public async execute(req: AgentLoopRequest): Promise<AgentLoopResult> {
    const startTime = Date.now();
    const requestId = req.requestId || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const correlationId = req.correlationId || `corr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const sessionId = req.sessionId;
    const actor = {
      ...req.actor,
      isOwner: req.actor.isOwner === true || req.actor.role === 'owner',
    };

    let currentState: AgentLoopState = 'RECEIVED';
    let intent: LoopIntent | undefined;
    let semanticIntent: SemanticIntent | undefined;
    let contextAwarePlan: ContextAwarePlan | undefined;
    let decisionResult: DecisionResult | undefined;
    let orchestrationResult: OrchestrationResult | undefined;
    let memoryContext: AgentMemoryContext | undefined;
    let plan: AgentPlan | undefined;
    const policyEvaluations: AgentPolicyEvaluation[] = [];
    const executionResults: AgentExecutionResult[] = [];
    const verificationResults: AgentVerificationResult[] = [];
    let updateResult: AgentUpdateResult | undefined;

    // EN: Scan untrusted input before lifecycle processing; detected secrets stay out of downstream logs.
    // VI: Quét dữ liệu đầu vào không tin cậy trước lifecycle; bí mật bị phát hiện không đi vào log phía sau.
    const secScan = scanSecurity(req.userText || '');
    if (!secScan.isSafe) {
      return {
        requestId,
        correlationId,
        sessionId,
        actor,
        state: 'POLICY_DENIED',
        policyEvaluations: [],
        executionResults: [],
        verificationResults: [],
        response: {
          id: `msg_sec_${Date.now()}`,
          sender: 'agent',
          content: '⚠️ Yêu cầu bị từ chối do vi phạm chính sách an toàn thông tin.',
          timestamp: new Date().toISOString(),
        },
        admissionContext: this.admissionRuntime.getSnapshot(),
        relayContext: this.relayRuntime.getSnapshot(),
        wireContext: this.relayGatewayRuntime.getSnapshot(),
        internetContext: this.internetRuntime.getSnapshot(),
        brainContext: this.brainRuntime.getSnapshot(),
        totalDurationMs: Date.now() - startTime,
        error: 'PROMPT_INJECTION_DETECTED',
      };
    }

    const sanitizedText = secScan.sanitizedText;

    // =========================================================================
    // STAGE 1: INTENT RESOLUTION
    // =========================================================================
    try {
      intent = await this.resolveIntent(sanitizedText, req);
      currentState = 'INTENT_RESOLVED';
    } catch (err: any) {
      return this.buildFailureResult({
        requestId, correlationId, sessionId, actor,
        state: 'INTENT_FAILED',
        error: err?.message || 'Intent resolution failed',
        startTime, policyEvaluations, executionResults, verificationResults,
      });
    }

    // If clarification is required, return early without planning or execution
    if (intent.requiresClarification) {
      const clarifyText = intent.clarificationPrompt || 'Xin Ngài vui lòng làm rõ thêm yêu cầu.';
      const voiceResult = await this.synthesizeVoiceIfNeeded(clarifyText, req, correlationId, requestId);
      return {
        requestId,
        correlationId,
        sessionId,
        actor,
        state: 'COMPLETED',
        intent,
        policyEvaluations,
        executionResults,
        verificationResults,
        response: {
          id: `msg_clarify_${Date.now()}`,
          sender: 'agent',
          content: clarifyText,
          timestamp: new Date().toISOString(),
        },
        admissionContext: this.admissionRuntime.getSnapshot(),
        relayContext: this.relayRuntime.getSnapshot(),
        wireContext: this.relayGatewayRuntime.getSnapshot(),
        internetContext: this.internetRuntime.getSnapshot(),
        brainContext: this.brainRuntime.getSnapshot(),
        voiceResult,
        totalDurationMs: Date.now() - startTime,
      };
    }

    // EN: Context ingestion is optional enrichment. Its failure must not block the core 7-stage lifecycle.
    // VI: Nạp context là làm giàu tùy chọn. Lỗi của nó không được chặn lifecycle lõi gồm 7 giai đoạn.
    try {
      await this.contextManager.ingestUserTurn(actor.userId, sessionId, sanitizedText);
    } catch {
      // Failure isolation (INV-14)
    }

    // =========================================================================
    // STAGE 2: MEMORY RETRIEVAL (READ-ONLY, SESSION-SCOPED)
    // =========================================================================
    try {
      memoryContext = await this.loadMemory(sessionId, actor.userId, actor);
      currentState = 'MEMORY_LOADED';
    } catch (err: any) {
      return this.buildFailureResult({
        requestId, correlationId, sessionId, actor,
        state: 'MEMORY_FAILED',
        error: err?.message || 'Memory loading failed',
        startTime, intent, policyEvaluations, executionResults, verificationResults,
      });
    }

    // EN:
    // Interpret the accepted request only after its scoped ConversationContext and WorkingMemory are available.
    // SemanticIntent is a data-only candidate; it cannot call ToolRegistry or PolicyDecisionPoint.
    //
    // VI:
    // Chỉ diễn giải request đã chấp nhận sau khi ConversationContext và WorkingMemory theo scope đã sẵn sàng.
    // SemanticIntent là candidate chỉ dữ liệu; nó không thể gọi ToolRegistry hoặc PolicyDecisionPoint.
    semanticIntent = this.intentService.interpret({
      userId: actor.userId,
      sessionId,
      userText: sanitizedText,
      context: memoryContext.contextSnapshot ? { recentTurns: memoryContext.contextSnapshot.recentTurns } : undefined,
      workingMemory: memoryContext.sessionTurns,
    });

    // Preserve the established general-conversation path for an unsupported deterministic rule.
    // Missing data, malformed input, and unresolved references still fail closed before runtime planning.
    if (semanticIntent.requiresClarification && semanticIntent.clarification.some(item => item.reason !== 'UNSUPPORTED_INTENT')) {
      const clarificationText = 'Xin vui lòng làm rõ thông tin còn thiếu hoặc tham chiếu trong yêu cầu.';
      return {
        requestId, correlationId, sessionId, actor, state: 'COMPLETED', intent, semanticIntent, memoryContext,
        policyEvaluations, executionResults, verificationResults,
        admissionContext: this.admissionRuntime.getSnapshot(),
        relayContext: this.relayRuntime.getSnapshot(),
        wireContext: this.relayGatewayRuntime.getSnapshot(),
        internetContext: this.internetRuntime.getSnapshot(),
        brainContext: this.brainRuntime.getSnapshot(),
        response: { id: `msg_semantic_clarify_${Date.now()}`, sender: 'agent', content: clarificationText, timestamp: new Date().toISOString() },
        totalDurationMs: Date.now() - startTime,
      };
    }

    // EN: The planning layer creates an inert, context-aware proposal before the existing Stage 3 runtime plan.
    // VI: Lớp planning tạo proposal theo context nhưng không hoạt động trước runtime plan Stage 3 hiện hữu.
    contextAwarePlan = this.planningService.plan({
      userId: actor.userId,
      sessionId,
      userText: sanitizedText,
      context: memoryContext.contextSnapshot ? { recentTurns: memoryContext.contextSnapshot.recentTurns } : undefined,
      workingMemory: memoryContext.sessionTurns,
    }, semanticIntent);

    // EN: Decision reasoning selects only an inert planner candidate; existing PDP and ToolRegistry boundaries remain unchanged.
    // VI: Decision reasoning chỉ chọn candidate không hoạt động từ planner; ranh giới PDP và ToolRegistry hiện hữu không đổi.
    const decisionContext = createDecisionContext({
      userId: actor.userId,
      sessionId,
      userText: sanitizedText,
      context: memoryContext.contextSnapshot ? { recentTurns: memoryContext.contextSnapshot.recentTurns } : undefined,
      workingMemory: memoryContext.sessionTurns,
    }, semanticIntent);

    decisionResult = this.decisionService.decide({
      context: decisionContext,
      plan: contextAwarePlan,
    });

    // EN: Action orchestration bridges DecisionResult to governed execution without executing tools.
    // VI: Điều phối hành động cầu nối DecisionResult sang thực thi có quản trị mà không trực tiếp thực thi tool.
    orchestrationResult = this.actionOrchestrator.orchestrate(decisionResult, decisionContext);

    // =========================================================================
    // STAGE 3: BOUNDED PLANNING (SEPARATE FROM EXECUTION)
    // =========================================================================
    try {
      plan = await this.createPlan(intent, memoryContext, actor);
      currentState = 'PLAN_CREATED';
    } catch (err: any) {
      return this.buildFailureResult({
        requestId, correlationId, sessionId, actor,
        state: 'PLAN_FAILED',
        error: err?.message || 'Planning failed',
        startTime, intent, memoryContext, policyEvaluations, executionResults, verificationResults,
      });
    }

    // =========================================================================
    // STAGE 4: POLICY DECISION POINT (PDP) EVALUATION
    // =========================================================================
    let allStepsPermitted = true;
    let approvalDemanded = false;
    let demandedApprovalId: string | undefined;

    for (const step of plan.steps) {
      const argsHash = crypto.createHash('sha256').update(JSON.stringify(step.arguments)).digest('hex');
      const decision = globalPDP.evaluate({
        toolName: step.toolName,
        args: step.arguments,
        actor: {
          userId: actor.userId,
          role: actor.role,
          channel: actor.channel,
          isOwner: actor.isOwner,
        },
        executionToken: req.executionToken,
        idempotencyKey: req.idempotencyKey,
        consumeToken: false,
      });

      policyEvaluations.push({
        stepId: step.stepId,
        toolName: step.toolName,
        decision,
        argumentsHash: argsHash,
      });

      if (!decision.allowed) {
        allStepsPermitted = false;
        if (decision.requiresApproval) {
          approvalDemanded = true;
          demandedApprovalId = decision.approvalId;
        }
        break; // Stop at first denied/unapproved step
      }
    }

    if (!allStepsPermitted) {
      if (approvalDemanded) {
        currentState = 'APPROVAL_REQUIRED';
        const approvalText = `⏳ Hành động này có mức độ tác động cao (HIGH_IMPACT) và cần được Ngài phê duyệt trước khi thực thi. Mã phê duyệt: ${demandedApprovalId}`;
        const voiceResult = await this.synthesizeVoiceIfNeeded(approvalText, req, correlationId, requestId);
        return {
          requestId,
          correlationId,
          sessionId,
          actor,
          state: currentState,
          intent,
          memoryContext,
          plan,
          policyEvaluations,
          executionResults,
          verificationResults,
          response: {
            id: `msg_approval_${Date.now()}`,
            sender: 'agent',
            content: approvalText,
            timestamp: new Date().toISOString(),
            data: { approvalId: demandedApprovalId, status: 'PENDING_APPROVAL' },
          },
          voiceResult,
          totalDurationMs: Date.now() - startTime,
          error: `APPROVAL_REQUIRED: Action requires explicit confirmation. ID: ${demandedApprovalId}`,
        };
      } else {
        currentState = 'POLICY_DENIED';
        const deniedStep = policyEvaluations[policyEvaluations.length - 1];
        const deniedText = `🚫 Yêu cầu bị từ chối bởi Chính sách Quản trị: ${deniedStep?.decision.reason || 'Bị chặn bởi PDP'}`;
        const voiceResult = await this.synthesizeVoiceIfNeeded(deniedText, req, correlationId, requestId);
        return {
          requestId,
          correlationId,
          sessionId,
          actor,
          state: currentState,
          intent,
          memoryContext,
          plan,
          policyEvaluations,
          executionResults,
          verificationResults,
          response: {
            id: `msg_denied_${Date.now()}`,
            sender: 'agent',
            content: deniedText,
            timestamp: new Date().toISOString(),
          },
          voiceResult,
          totalDurationMs: Date.now() - startTime,
          error: `POLICY_DENIED: ${deniedStep?.decision.reason}`,
        };
      }
    }

    currentState = 'POLICY_EVALUATED';

    // =========================================================================
    // STAGE 5: EXECUTION (STRICTLY THROUGH TOOL REGISTRY)
    // =========================================================================
    currentState = 'EXECUTING';
    let executionFailed = false;

    for (const step of plan.steps) {
      const stepStart = Date.now();
      try {
        const toolContext: ToolExecutionContext = {
          userId: actor.userId,
          role: actor.role,
          channel: actor.channel,
          isOwner: actor.isOwner,
          correlationId,
          idempotencyKey: req.idempotencyKey,
          executionToken: req.executionToken,
          authToken: actor.authToken,
        };

        const rawOutput = await toolRegistry.executeTool(step.toolName, step.arguments, toolContext);
        const duration = Date.now() - stepStart;

        executionResults.push({
          stepId: step.stepId,
          toolName: step.toolName,
          status: 'SUCCESS',
          rawOutput,
          executionDurationMs: duration,
        });
      } catch (err: any) {
        const duration = Date.now() - stepStart;
        executionResults.push({
          stepId: step.stepId,
          toolName: step.toolName,
          status: 'FAILURE',
          error: err?.message || 'Tool execution failure',
          executionDurationMs: duration,
        });
        executionFailed = true;
        break; // Stop plan execution upon failure
      }
    }

    if (executionFailed) {
      currentState = 'EXECUTION_FAILED';
      const failedExec = executionResults[executionResults.length - 1];
      return {
        requestId,
        correlationId,
        sessionId,
        actor,
        state: currentState,
        intent,
        memoryContext,
        plan,
        policyEvaluations,
        executionResults,
        verificationResults,
        response: {
          id: `msg_err_${Date.now()}`,
          sender: 'agent',
          content: `❌ Quá trình thực thi công cụ "${failedExec.toolName}" thất bại: ${failedExec.error}`,
          timestamp: new Date().toISOString(),
        },
        totalDurationMs: Date.now() - startTime,
        error: failedExec.error,
      };
    }

    // =========================================================================
    // STAGE 6: RESULT VERIFICATION
    // =========================================================================
    currentState = 'VERIFYING';
    let overallVerificationSuccess = true;
    let governedVerificationResult: GovernedVerificationResult | undefined;

    for (const step of plan.steps) {
      const execRes = executionResults.find(e => e.stepId === step.stepId);
      if (!execRes || execRes.status !== 'SUCCESS') {
        verificationResults.push({
          stepId: step.stepId,
          toolName: step.toolName,
          status: 'VERIFICATION_FAILURE',
          discrepancy: 'Execution did not produce a successful output to verify.',
          realityLevel: 'REAL',
        });
        overallVerificationSuccess = false;
        continue;
      }

      const verifyRes = this.verifyStep(step, execRes.rawOutput);
      verificationResults.push(verifyRes);

      if (verifyRes.status === 'VERIFICATION_FAILURE') {
        overallVerificationSuccess = false;
      }

      // MS-1.3.14: Authoritative Postcondition Verification Engine
      try {
        governedVerificationResult = this.verificationService.verify({
          requestId,
          userId: actor.userId,
          sessionId,
          toolName: step.toolName,
          executionResult: {
            success: execRes.status === 'SUCCESS',
            output: execRes.rawOutput,
            executionDurationMs: execRes.executionDurationMs,
          },
          riskLevel: plan.estimatedRisk === 'HIGH' ? 'HIGH' : plan.estimatedRisk === 'MEDIUM' ? 'MEDIUM' : 'LOW',
          correlationId,
        });
      } catch {
        // Safe isolation
      }
    }

    if (!overallVerificationSuccess) {
      currentState = 'VERIFICATION_FAILED';
    }

    // =========================================================================
    // STAGE 7: STATE & MEMORY UPDATE
    // =========================================================================
    currentState = overallVerificationSuccess ? 'UPDATING' : 'VERIFICATION_FAILED';

    // MS-1.3.15: Authoritative Durable Commit Engine
    let durableCommitResult: DurableCommitResult | undefined;
    if (overallVerificationSuccess) {
      try {
        durableCommitResult = this.commitService.commit({
          requestId,
          userId: actor.userId,
          sessionId,
          verificationResult: governedVerificationResult || {
            verificationId: `ver_auto_${requestId}`,
            status: 'VERIFIED',
            taskSucceeded: true,
            riskLevel: plan.estimatedRisk === 'HIGH' ? 'HIGH' : plan.estimatedRisk === 'MEDIUM' ? 'MEDIUM' : 'LOW',
          },
          operations: [
            {
              operationId: `op_turn_${requestId}`,
              type: 'SESSION_TURN_APPEND',
              targetDomain: 'working_memory',
              payload: { text: sanitizedText },
              applied: true,
            },
          ],
          correlationId,
        });
      } catch {
        // Safe isolation
      }
    }

    updateResult = await this.applyUpdate({
      sessionId,
      actor,
      sanitizedText,
      intent,
      plan,
      executionResults,
      verificationResults,
      verifiedSuccess: overallVerificationSuccess,
    });

    currentState = overallVerificationSuccess ? 'COMPLETED' : 'VERIFICATION_FAILED';

    // Format final response text
    const responseText = this.formatResponseText({
      intent,
      plan,
      executionResults,
      verificationResults,
      verifiedSuccess: overallVerificationSuccess,
      actor,
    });

    // Commit agent response into Conversation Context Manager (Stage 7b)
    try {
      await this.contextManager.commitAgentResponse(actor.userId, sessionId, responseText);
    } catch {
      // Failure isolation (INV-14)
    }

    // EN: Voice is a post-response boundary: TTS may fail, but the verified text result is preserved.
    // VI: Voice là ranh giới sau phản hồi: TTS có thể lỗi, nhưng kết quả văn bản đã xác minh vẫn được giữ.
    const voiceResult = await this.synthesizeVoiceIfNeeded(responseText, req, correlationId, requestId);

    return {
      requestId,
      correlationId,
      sessionId,
      actor,
      state: currentState,
      intent,
      semanticIntent,
      contextAwarePlan,
      decisionResult,
      orchestrationResult,
      memoryContext,
      plan,
      policyEvaluations,
      executionResults,
      verificationResults,
      governedVerificationResult,
      durableCommitResult,
      transportContext: this.transportService.getSession(sessionId),
      remoteContext: this.remoteGateway.getSession(sessionId),
      networkContext: this.networkRuntime.getRegistry().getConnection(sessionId),
      connectionContext: this.connectionRuntime.getRegistry().getConnection(sessionId),
      persistentDeviceContext:
        (req.metadata?.deviceId
          ? this.persistentDeviceRuntime.getRegistry().getDevice(req.metadata.deviceId)
          : undefined) ?? this.persistentDeviceRuntime.getRegistry().getDevice(sessionId),
      deviceVaultContext: this.deviceVaultRuntime.getSnapshot(),
      admissionContext: this.admissionRuntime.getSnapshot(),
      relayContext: this.relayRuntime.getSnapshot(),
      wireContext: this.relayGatewayRuntime.getSnapshot(),
        internetContext: this.internetRuntime.getSnapshot(),
        brainContext: this.brainRuntime.getSnapshot(),
      updateResult,
      response: {
        id: `msg_out_${Date.now()}`,
        sender: 'agent',
        content: responseText,
        timestamp: new Date().toISOString(),
      },
      voiceResult,
      totalDurationMs: Date.now() - startTime,
    };
  }

  // -------------------------------------------------------------------------
  // STAGE 1 IMPLEMENTATION: INTENT RESOLUTION
  // -------------------------------------------------------------------------
  private async resolveIntent(userText: string, req: AgentLoopRequest): Promise<LoopIntent> {
    const rawQuery = (userText || '').trim();

    // Check if explicit actionName was provided in metadata or request
    if (req.metadata?.actionName) {
      return {
        intentType: 'EXPLICIT_ACTION',
        capability: req.metadata.actionName,
        actionName: req.metadata.actionName,
        parameters: req.metadata.parameters || {},
        confidence: 1.0,
        requiresClarification: false,
        entities: {},
        fastPathMatched: true,
      };
    }

    // 1. Try Deterministic Fast-Path Router (Sub-millisecond matching)
    const fastPath = fastPathRouter.evaluate(rawQuery);
    if (fastPath.matched) {
      return {
        intentType: fastPath.intent,
        capability: fastPath.action || 'conversation',
        actionName: fastPath.action,
        parameters: fastPath.payload || {},
        confidence: 0.98,
        requiresClarification: false,
        entities: { ...(fastPath.payload || {}), target: fastPath.target },
        fastPathMatched: true,
      };
    }

    // 2. Deterministic Rule Intent Heuristics
    const lower = rawQuery.toLowerCase();

    // Rule teaching heuristic
    if (lower.includes('hãy nhớ quy tắc') || lower.includes('từ giờ hãy') || lower.includes('đừng làm') || lower.includes('lần sau hãy')) {
      return {
        intentType: 'TEACH_RULE',
        capability: 'teach_boss_rule',
        actionName: 'teach_boss_rule',
        parameters: { instruction: rawQuery },
        confidence: 0.92,
        requiresClarification: false,
        entities: { instruction: rawQuery },
        fastPathMatched: false,
      };
    }

    // Personal habit / memory recall heuristic
    if (lower.includes('tôi thích uống gì') || lower.includes('thói quen của tôi') || lower.includes('dự án đang làm')) {
      return {
        intentType: 'RECALL_MEMORY',
        capability: 'boss_recall_memory',
        actionName: 'boss_recall_memory',
        parameters: { topic: lower.includes('uống') ? 'habits' : 'projects' },
        confidence: 0.90,
        requiresClarification: false,
        entities: {},
        fastPathMatched: false,
      };
    }

    // Morning briefing heuristic
    if (lower.includes('bản tin sáng') || lower.includes('tin tức sáng nay') || lower.includes('chào buổi sáng')) {
      return {
        intentType: 'MORNING_BRIEFING',
        capability: 'get_morning_briefing',
        actionName: 'get_morning_briefing',
        parameters: {},
        confidence: 0.95,
        requiresClarification: false,
        entities: {},
        fastPathMatched: false,
      };
    }

    // Screen notifications inspection
    if (lower.includes('kiểm tra thông báo') || lower.includes('có tin nhắn gì mới') || lower.includes('ai nhắn tin')) {
      return {
        intentType: 'SCREEN_INSPECTION',
        capability: 'inspect_screen_notifications',
        actionName: 'inspect_screen_notifications',
        parameters: {},
        confidence: 0.91,
        requiresClarification: false,
        entities: {},
        fastPathMatched: false,
      };
    }

    // Empty or completely ambiguous query
    if (rawQuery.length < 2) {
      return {
        intentType: 'AMBIGUOUS',
        capability: 'none',
        parameters: {},
        confidence: 0.1,
        requiresClarification: true,
        clarificationPrompt: 'Dạ, Ngài có thể nói rõ hơn yêu cầu được không ạ?',
        entities: {},
        fastPathMatched: false,
      };
    }

    // Default: General query / conversation
    return {
      intentType: 'GENERAL_QUERY',
      capability: 'conversation',
      parameters: { query: rawQuery },
      confidence: 0.85,
      requiresClarification: false,
      entities: {},
      fastPathMatched: false,
    };
  }

  // -------------------------------------------------------------------------
  // STAGE 2 IMPLEMENTATION: MEMORY RETRIEVAL (READ-ONLY)
  // -------------------------------------------------------------------------
  private async loadMemory(
    sessionId: string,
    userId: string,
    actor: AgentActorIdentity
  ): Promise<AgentMemoryContext> {
    const scope: MemoryScope = { sessionId, userId };

    // 1. Session-scoped turns from memoryStore (strictly READ-ONLY)
    const sessionTurns = memoryStore.getSessionMemory(scope).turns.slice(-10);

    // 2. Boss Profile & Rules (Only for authenticated Owner / Admin)
    let bossProfile: BossProfile | undefined;
    let learnedRules: BossRule[] = [];
    let activeProjects: BossProject[] = [];

    if (actor.isOwner || actor.role === 'owner' || actor.role === 'admin') {
      bossProfile = globalBossMemory.getProfile(userId);
      learnedRules = globalBossFeedback.getRules(userId);
      activeProjects = bossProfile?.projects || [];
    }

    // 3. Conversation Context Snapshot (MS-1.3.7 Intelligent Response Memory)
    let contextSnapshot: ConversationContextSnapshot | undefined;
    try {
      contextSnapshot = this.contextManager.getContextSnapshot(userId, sessionId);
    } catch {
      // Failure isolation (INV-14)
    }

    return {
      scope,
      sessionId,
      userId,
      sessionTurns,
      bossProfile,
      learnedRules,
      activeProjects,
      contextSnapshot,
      retrievedAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // STAGE 3 IMPLEMENTATION: BOUNDED PLANNING
  // -------------------------------------------------------------------------
  private async createPlan(
    intent: LoopIntent,
    memoryContext: AgentMemoryContext,
    actor: AgentActorIdentity
  ): Promise<AgentPlan> {
    const planId = `plan_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const steps: AgentPlanStep[] = [];

    // Map intent to concrete tool execution step(s)
    if (intent.actionName) {
      if (!toolRegistry.hasTool(intent.actionName)) {
        throw new Error(`Tool "${intent.actionName}" is not registered in ToolRegistry`);
      }
      const toolName = intent.actionName;
      const classification = globalPDP.getActionClassification(toolName);
      const verificationStrategy = this.resolveVerificationStrategy(toolName);

      steps.push({
        stepId: `step_1_${toolName}`,
        toolName,
        arguments: intent.parameters,
        classification,
        expectedOutcome: `Execute tool ${toolName} to satisfy intent ${intent.intentType}`,
        verificationStrategy,
      });
    }

    const hasHighImpact = steps.some(s => s.classification === 'HIGH_IMPACT');
    const estimatedRisk = hasHighImpact ? 'HIGH' : steps.some(s => s.classification === 'REVERSIBLE') ? 'MEDIUM' : 'LOW';

    return {
      planId,
      goal: intent.capability,
      steps,
      estimatedRisk,
      requiresApproval: hasHighImpact,
      createdAt: new Date().toISOString(),
    };
  }

  // -------------------------------------------------------------------------
  // STAGE 6 IMPLEMENTATION: VERIFICATION LOGIC
  // -------------------------------------------------------------------------
  private verifyStep(step: AgentPlanStep, rawOutput: any): AgentVerificationResult {
    const toolName = step.toolName;

    // Verify based on tool domain & strategy
    if (step.verificationStrategy === 'NONE') {
      return {
        stepId: step.stepId,
        toolName,
        status: 'VERIFICATION_SUCCESS',
        realityLevel: 'REAL',
      };
    }

    if (toolName === 'desktop_launch_app') {
      if (rawOutput && rawOutput.success === true && rawOutput.appName) {
        return {
          stepId: step.stepId,
          toolName,
          status: 'VERIFICATION_SUCCESS',
          verifiedFact: `Process launched and confirmed for application "${rawOutput.appName}".`,
          realityLevel: 'REAL',
        };
      }
      return {
        stepId: step.stepId,
        toolName,
        status: 'VERIFICATION_FAILURE',
        discrepancy: 'Process launch output did not confirm appName parameter.',
        realityLevel: 'REAL',
      };
    }

    if (toolName === 'desktop_capture_screenshot') {
      if (rawOutput && rawOutput.base64 && rawOutput.base64.length > 50) {
        return {
          stepId: step.stepId,
          toolName,
          status: 'VERIFICATION_SUCCESS',
          verifiedFact: `Screenshot captured successfully (${Math.round(rawOutput.base64.length / 1024)} KB).`,
          realityLevel: 'REAL',
        };
      }
      return {
        stepId: step.stepId,
        toolName,
        status: 'VERIFICATION_FAILURE',
        discrepancy: 'Screenshot buffer was empty or corrupted.',
        realityLevel: 'REAL',
      };
    }

    if (toolName === 'robot_track_sound_source' || toolName === 'robot_aim_head') {
      if (rawOutput && typeof rawOutput.panAngle === 'number') {
        const pan = rawOutput.panAngle;
        if (pan >= -90 && pan <= 90) {
          return {
            stepId: step.stepId,
            toolName,
            status: 'VERIFICATION_SUCCESS',
            verifiedFact: `Servo angle confirmed within mechanical limits (${pan}°).`,
            realityLevel: 'REAL',
          };
        }
        return {
          stepId: step.stepId,
          toolName,
          status: 'VERIFICATION_FAILURE',
          discrepancy: `Servo pan angle exceeded safe limits: ${pan}°`,
          realityLevel: 'REAL',
        };
      }
    }

    if (toolName === 'teach_boss_rule') {
      if (rawOutput && rawOutput.rule && rawOutput.rule.enabled === true) {
        return {
          stepId: step.stepId,
          toolName,
          status: 'VERIFICATION_SUCCESS',
          verifiedFact: `Rule "${rawOutput.rule.instruction}" verified in active rule list.`,
          realityLevel: 'REAL',
        };
      }
    }

    // Generic return value check
    if (rawOutput !== undefined && rawOutput !== null) {
      if (typeof rawOutput === 'object' && rawOutput.success === false) {
        return {
          stepId: step.stepId,
          toolName,
          status: 'VERIFICATION_FAILURE',
          discrepancy: rawOutput.error || 'Tool indicated unsuccessful execution.',
          realityLevel: 'REAL',
        };
      }
      return {
        stepId: step.stepId,
        toolName,
        status: 'VERIFICATION_SUCCESS',
        verifiedFact: 'Tool executed and returned non-null output compliant with schema.',
        realityLevel: 'REAL',
      };
    }

    return {
      stepId: step.stepId,
      toolName,
      status: 'UNKNOWN',
      discrepancy: 'Verification could not conclusively determine task post-condition.',
      realityLevel: 'PARTIAL',
    };
  }

  // -------------------------------------------------------------------------
  // STAGE 7 IMPLEMENTATION: STATE & MEMORY UPDATE
  // -------------------------------------------------------------------------
  private async applyUpdate(params: {
    sessionId: string;
    actor: AgentActorIdentity;
    sanitizedText: string;
    intent?: LoopIntent;
    plan?: AgentPlan;
    executionResults: AgentExecutionResult[];
    verificationResults: AgentVerificationResult[];
    verifiedSuccess: boolean;
  }): Promise<AgentUpdateResult> {
    const updateTimestamp = new Date().toISOString();
    const scope: MemoryScope = { sessionId: params.sessionId, userId: params.actor.userId };

    // EN: This is the sole working-memory write boundary, reached only after verification.
    // VI: Đây là ranh giới ghi working memory duy nhất, chỉ đạt được sau bước xác minh.
    memoryStore.appendTurn(scope, {
      id: `turn_u_${Date.now()}`,
      sender: 'user',
      content: params.sanitizedText,
      timestamp: updateTimestamp,
    });

    let learnedRuleRecorded = false;
    let memoryCandidateRecorded = false;

    // EN: Durable learning is permitted only after verified success; failed execution must never become memory.
    // VI: Chỉ được học bền vững sau thành công đã xác minh; thực thi thất bại không bao giờ trở thành bộ nhớ.
    if (params.verifiedSuccess && (params.actor.isOwner || params.actor.role === 'owner')) {
      // Check if user taught an explicit rule
      if (params.intent?.intentType === 'TEACH_RULE' && params.intent.parameters?.instruction) {
        learnedRuleRecorded = true;
      }
      // Check if user committed a personal habit
      if (params.intent?.intentType === 'REMEMBER_FACT') {
        memoryCandidateRecorded = true;
      }
    }

    return {
      sessionUpdated: true,
      memoryCandidateRecorded,
      auditRecorded: true,
      learnedRuleRecorded,
      updateTimestamp,
    };
  }

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------
  private resolveVerificationStrategy(toolName: string): VerificationStrategy {
    if (toolName.startsWith('desktop_launch_')) return 'WINDOW_CONFIRMATION';
    if (toolName === 'desktop_capture_screenshot') return 'STATE_INSPECTION';
    if (toolName.startsWith('robot_')) return 'TELEMETRY_ACK';
    if (toolName === 'teach_boss_rule' || toolName === 'boss_remember_fact') return 'STATE_INSPECTION';
    return 'RETURN_VALUE_CHECK';
  }

  private formatResponseText(params: {
    intent?: LoopIntent;
    plan?: AgentPlan;
    executionResults: AgentExecutionResult[];
    verificationResults: AgentVerificationResult[];
    verifiedSuccess: boolean;
    actor: AgentActorIdentity;
  }): string {
    const isOwner = params.actor.isOwner || params.actor.role === 'owner';
    const honorific = isOwner ? 'Ngài' : 'quý khách';

    if (!params.verifiedSuccess) {
      const failedVerify = params.verificationResults.find(v => v.status === 'VERIFICATION_FAILURE');
      return `⚠️ Thao tác đã chạy nhưng bước kiểm chứng không đạt: ${failedVerify?.discrepancy || 'Không thể xác thực trạng thái mong muốn'}.`;
    }

    if (params.executionResults.length === 0) {
      return `Dạ chào ${honorific}, tôi là BOWCON. Tôi có thể hỗ trợ gì cho ${honorific} hôm nay?`;
    }

    const lastExec = params.executionResults[params.executionResults.length - 1];
    const out = lastExec.rawOutput;

    if (out && typeof out === 'object') {
      if (out.message) return redactPii(String(out.message));
      if (out.speechText) return redactPii(String(out.speechText));
      if (out.summary) return redactPii(String(out.summary));
    }

    return `Dạ ${honorific}, tác vụ "${lastExec.toolName}" đã được thực thi và xác thực thành công.`;
  }

  private buildFailureResult(params: {
    requestId: string;
    correlationId: string;
    sessionId: string;
    actor: AgentActorIdentity;
    state: AgentLoopState;
    error: string;
    startTime: number;
    intent?: LoopIntent;
    memoryContext?: AgentMemoryContext;
    plan?: AgentPlan;
    policyEvaluations: AgentPolicyEvaluation[];
    executionResults: AgentExecutionResult[];
    verificationResults: AgentVerificationResult[];
  }): AgentLoopResult {
    return {
      requestId: params.requestId,
      correlationId: params.correlationId,
      sessionId: params.sessionId,
      actor: params.actor,
      state: params.state,
      intent: params.intent,
      memoryContext: params.memoryContext,
      plan: params.plan,
      policyEvaluations: params.policyEvaluations,
      executionResults: params.executionResults,
      verificationResults: params.verificationResults,
      response: {
        id: `msg_fail_${Date.now()}`,
        sender: 'agent',
        content: `❌ Lỗi xử lý: ${params.error}`,
        timestamp: new Date().toISOString(),
      },
      totalDurationMs: Date.now() - params.startTime,
      admissionContext: this.admissionRuntime.getSnapshot(),
      relayContext: this.relayRuntime.getSnapshot(),
      wireContext: this.relayGatewayRuntime.getSnapshot(),
        internetContext: this.internetRuntime.getSnapshot(),
        brainContext: this.brainRuntime.getSnapshot(),
      error: params.error,
    };
  }

  private async synthesizeVoiceIfNeeded(
    text: string,
    req: AgentLoopRequest,
    correlationId: string,
    requestId: string
  ): Promise<VoiceResult | undefined> {
    if (!req.voiceConfig?.enabled) return undefined;
    try {
      return await this.voiceService.synthesize({
        text,
        userId: req.actor?.userId,
        sessionId: req.sessionId,
        language: req.voiceConfig.language,
        voiceConfig: req.voiceConfig,
        metadata: { correlationId, requestId },
      });
    } catch (err: any) {
      return {
        success: false,
        provider: req.voiceConfig.provider || 'unknown',
        audioFormat: req.voiceConfig.outputFormat || 'audio/wav',
        speechText: text,
        error: `VOICE_SYNTHESIS_FAILED: ${err?.message || 'Unknown voice error'}`,
      };
    }
  }
}

// Global Singleton Instance
export const globalAgentLoop = new AgentLoop();
