import { MissionAuthorizationEnvelope, MissionDependencyGraph, MissionBudgetSnapshot, MissionState } from './missionCoordinationTypes.js';
export declare class MissionCoordinationValidator {
    /**
     * EN: Asserts recursive prototype pollution defense across inputs.
     * VI: Khẳng định phòng vệ ô nhiễm nguyên mẫu đệ quy trên các dữ liệu đầu vào.
     */
    assertNoPrototypePollution(data: unknown, path?: string): void;
    /**
     * EN: Asserts recursive Chain-of-Thought (CoT) marker prohibition.
     * VI: Khẳng định nghiêm cấm các dấu hiệu Chain-of-Thought (CoT) đệ quy.
     */
    assertNoCoT(data: unknown, path?: string): void;
    /**
     * EN: Quarantines untrusted environment text and rejects adversarial prompt injection.
     * VI: Cách ly văn bản môi trường không tin cậy và từ chối tiêm nhiễm nhắc lệnh đối nghịch.
     */
    quarantineUntrustedText(text: string): {
        isQuarantined: boolean;
        sanitizedText: string;
        reason?: string;
    };
    /**
     * EN: Validates mission authorization envelope structure, scope, risk tier, and provenance hash.
     * VI: Xác thực cấu trúc phong bì ủy quyền sứ mệnh, phạm vi, mức rủi ro và mã băm nguồn gốc.
     */
    validateAuthorizationEnvelope(envelope: MissionAuthorizationEnvelope): void;
    /**
     * EN: Validates mission dependency DAG, detecting cycles and bounding dependency depth.
     * VI: Xác thực DAG phụ thuộc sứ mệnh, phát hiện chu trình và giới hạn độ sâu phụ thuộc.
     */
    validateDependencyGraph(graph: MissionDependencyGraph, maxDepth?: number): void;
    /**
     * EN: Validates mission budget snapshot bounds.
     * VI: Xác thực các giới hạn ảnh chụp ngân sách sứ mệnh.
     */
    validateBudget(budget: MissionBudgetSnapshot): void;
    /**
     * EN: Asserts valid state transition according to mission lifecycle state machine.
     * VI: Khẳng định chuyển đổi trạng thái hợp lệ theo máy trạng thái vòng đời sứ mệnh.
     */
    assertValidStateTransition(fromState: MissionState, toState: MissionState): void;
}
