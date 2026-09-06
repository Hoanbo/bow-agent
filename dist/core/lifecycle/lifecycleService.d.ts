import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { AgentLifecycleState, FailureCategory, FailureMetadata, LifecycleCheckpoint, LifecycleState, RecoveryMetadata, TransitionRecord } from './lifecycleTypes.js';
export interface TransitionOptions {
    readonly correlationId?: string;
    readonly decisionId?: string;
    readonly executionId?: string;
    readonly riskLevel?: PlanRiskLevel | string;
    readonly governanceRequired?: boolean;
    readonly approvalRequired?: boolean;
    readonly failure?: FailureMetadata;
    readonly recovery?: RecoveryMetadata;
    readonly safeMetadata?: Readonly<Record<string, unknown>>;
    readonly timestamp?: number;
}
export declare class LifecycleService {
    private readonly sessions;
    private getSessionKey;
    /**
     * EN: Initializes or retrieves the lifecycle state for a given user and session.
     * VI: Khởi tạo hoặc lấy trạng thái vòng đời cho người dùng và phiên nhất định.
     */
    getOrCreateSession(userId: string, sessionId: string, initialState?: LifecycleState, options?: TransitionOptions): AgentLifecycleState;
    /**
     * EN: Retrieves the active lifecycle state snapshot for a session.
     * VI: Lấy snapshot trạng thái vòng đời hoạt động cho một phiên.
     */
    getState(userId: string, sessionId: string): AgentLifecycleState;
    /**
     * EN: Authoritatively validates and executes a state transition.
     * VI: Xác thực có thẩm quyền và thực thi một bước chuyển trạng thái.
     */
    transition(userId: string, sessionId: string, to: LifecycleState, reason: string, options?: TransitionOptions): AgentLifecycleState;
    /**
     * EN: Creates and stores an immutable lifecycle checkpoint snapshot.
     * VI: Tạo và lưu trữ một snapshot checkpoint vòng đời bất biến.
     */
    createCheckpoint(userId: string, sessionId: string, correlationId?: string, safeMetadata?: Readonly<Record<string, unknown>>): LifecycleCheckpoint;
    /**
     * EN: Records a structured failure and transitions lifecycle state accordingly.
     * VI: Ghi nhận một sự cố có cấu trúc và chuyển đổi trạng thái vòng đời tương ứng.
     */
    recordFailure(userId: string, sessionId: string, message: string, category?: FailureCategory, recoverable?: boolean, details?: Readonly<Record<string, unknown>>): AgentLifecycleState;
    /**
     * EN: Creates a data-only recovery descriptor attached to current lifecycle state.
     * VI: Tạo một bộ mô tả phục hồi thuần dữ liệu gắn vào trạng thái vòng đời hiện tại.
     */
    createRecoveryDescriptor(userId: string, sessionId: string, recoveryState: LifecycleState, retryReason?: string, maxAttempts?: number): AgentLifecycleState;
    /**
     * EN: Returns an immutable copy of all transition records for a session.
     * VI: Trả về bản sao bất biến của tất cả các bản ghi chuyển đổi cho một phiên.
     */
    getTransitionHistory(userId: string, sessionId: string): readonly TransitionRecord[];
    /**
     * EN: Returns an immutable copy of all checkpoints for a session.
     * VI: Trả về bản sao bất biến của tất cả các checkpoint cho một phiên.
     */
    getCheckpoints(userId: string, sessionId: string): readonly LifecycleCheckpoint[];
}
