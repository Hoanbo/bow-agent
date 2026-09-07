import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { NormalizedExecutionResult, VerificationEvidence } from './verificationTypes.js';
/**
 * EN: Normalizes an execution outcome into a strongly typed NormalizedExecutionResult.
 * VI: Chuẩn hóa kết quả thực thi thành NormalizedExecutionResult định kiểu chặt chẽ.
 */
export declare function normalizeExecutionResult(exec: {
    success: boolean;
    output?: unknown;
    data?: unknown;
    error?: unknown;
    status?: string;
    riskLevel?: PlanRiskLevel;
    executionDurationMs?: number;
    executionFingerprint?: string;
}, toolName: string, actionName?: string, fallbackRisk?: PlanRiskLevel): NormalizedExecutionResult;
/**
 * EN: Converts normalized observed state entries into formal VerificationEvidence items.
 * VI: Chuyển đổi các mục trạng thái quan sát đã chuẩn hóa thành các mục Bằng chứng Xác minh chính thức.
 */
export declare function extractEvidenceFromState(observedState: Readonly<Record<string, unknown>>, timestamp?: string): readonly VerificationEvidence[];
