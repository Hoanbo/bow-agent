import { GovernedMission, MissionAuthorizationEnvelope, MissionObjectiveBinding, MissionPriorityPolicy, MissionCoordinationResult } from './missionCoordinationTypes.js';
import { MissionCoordinationValidator } from './missionCoordinationValidator.js';
import { MissionPriorityEngine } from './missionPriorityEngine.js';
import { MissionConflictResolver } from './missionConflictResolver.js';
import { MissionGovernanceSecurityBoundary } from './missionGovernanceSecurityBoundary.js';
import { MissionAuditPersistenceBridge } from './missionAuditPersistenceBridge.js';
import { GovernedAdaptiveAutonomyOrchestrator } from '../adaptiveAutonomy/governedAdaptiveAutonomyOrchestrator.js';
export interface MissionCoordinatorOptions {
    readonly validator?: MissionCoordinationValidator;
    readonly securityBoundary?: MissionGovernanceSecurityBoundary;
    readonly persistenceBridge?: MissionAuditPersistenceBridge;
    readonly priorityEngine?: MissionPriorityEngine;
    readonly conflictResolver?: MissionConflictResolver;
    readonly adaptiveAutonomyOrchestrator?: GovernedAdaptiveAutonomyOrchestrator;
}
export interface ObjectiveDelegationExecutor {
    (objective: MissionObjectiveBinding, cycle: number): Promise<{
        success: boolean;
        resultSummary?: string;
        failureError?: string;
    }>;
}
export declare class GovernedMissionCoordinator {
    private readonly validator;
    private readonly securityBoundary;
    private readonly persistenceBridge;
    private readonly priorityEngine;
    private readonly conflictResolver;
    constructor(options?: MissionCoordinatorOptions);
    /**
     * EN: Initializes and persists a new governed mission container with pre-authorized objectives.
     * VI: Khởi tạo và lưu trữ vùng chứa sứ mệnh có quản trị mới với các mục tiêu đã được ủy quyền trước.
     */
    initializeMission(params: {
        readonly missionId: string;
        readonly tenantId: string;
        readonly sessionId: string;
        readonly humanOperatorId: string;
        readonly title: string;
        readonly description: string;
        readonly authorizationEnvelope: MissionAuthorizationEnvelope;
        readonly priorityPolicy?: Partial<MissionPriorityPolicy>;
        readonly objectives: readonly MissionObjectiveBinding[];
    }): GovernedMission;
    /**
     * EN: Runs bounded mission coordination cycles to execute eligible objectives in deterministic priority order.
     * VI: Chạy các chu kỳ điều phối sứ mệnh có giới hạn để thực thi các mục tiêu đủ điều kiện theo thứ tự ưu tiên xác định.
     */
    coordinateMission(mission: GovernedMission, cyclesToRun?: number, executor?: ObjectiveDelegationExecutor): Promise<MissionCoordinationResult>;
    /**
     * EN: Resumes a suspended or awaiting-review mission only after full governance re-verification.
     * VI: Tiếp tục một sứ mệnh bị tạm dừng hoặc chờ đánh giá chỉ sau khi tái xác minh toàn bộ quản trị.
     */
    resumeMission(mission: GovernedMission, humanConfirmationToken?: string): GovernedMission;
}
