import { type QualityGateEvaluation, type QualityGateOverallState, type QualityGateStageCategory, type CommandExecutionContext } from './qualityTypes.js';
import { GovernedExecutionEngine, type ExecuteCommandOptions } from './governedExecutionEngine.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
export declare const MANDATORY_QUALITY_GATE_STAGES: readonly QualityGateStageCategory[];
export declare class QualityGateEngine {
    private readonly executionEngine;
    constructor(executionEngine?: GovernedExecutionEngine);
    /**
     * Computes deterministic SHA-256 hash representing a continuous quality gate evaluation.
     * Tính toán mã băm SHA-256 tất định đại diện cho một lượt đánh giá cổng chất lượng liên tục.
     */
    static hashGateEvaluation(gateId: string, overallState: QualityGateOverallState, stageHashes: readonly string[]): string;
    /**
     * Maps a quality gate category to its registered command ID.
     * Ánh xạ một danh mục cổng chất lượng sang ID lệnh đã đăng ký.
     */
    static mapCategoryToCommandId(category: QualityGateStageCategory): string;
    /**
     * Evaluates all continuous quality gate stages within an isolated sandbox.
     * Đánh giá tất cả các giai đoạn cổng chất lượng liên tục bên trong sandbox cô lập.
     */
    evaluateGate(context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: ExecuteCommandOptions & {
        readonly stagesToRun?: readonly QualityGateStageCategory[];
    }): Promise<QualityGateEvaluation>;
}
