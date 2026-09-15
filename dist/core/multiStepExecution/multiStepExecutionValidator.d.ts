import { type MultiStepExecutionSession, type MultiStepExecutionGeneration, type MultiStepExecutionStepState, type ExecutionEnvironmentSnapshot, type ReplanningRequest, type MultiStepExecutionSessionDocument } from './multiStepExecutionTypes.js';
export declare const PROHIBITED_COT_MARKERS: readonly string[];
export declare const SUSPICIOUS_INJECTION_PATTERNS: readonly RegExp[];
export declare const DANGEROUS_KEYS: readonly string[];
export declare class MultiStepExecutionValidator {
    /**
     * EN: Recursively scans an object or string for prototype pollution keys, CoT markers, and prompt injection patterns.
     * VI: Quét đệ quy đối tượng hoặc chuỗi để tìm các khóa prototype pollution, dấu vết CoT và mẫu tiêm prompt.
     */
    static sanitizeAndValidateData(obj: unknown, path?: string): void;
    /**
     * EN: Validates tenant and session IDs across boundaries.
     * VI: Xác thực mã định danh tenant và session qua các ranh giới.
     */
    static validateIsolation(expectedTenantId: string, expectedSessionId: string, actualTenantId: string, actualSessionId: string): void;
    /**
     * EN: Validates a MultiStepExecutionGeneration object.
     * VI: Xác thực đối tượng MultiStepExecutionGeneration.
     */
    static validateGeneration(generation: MultiStepExecutionGeneration): void;
    /**
     * EN: Validates an individual step state.
     * VI: Xác thực trạng thái của từng bước riêng lẻ.
     */
    static validateStepState(step: MultiStepExecutionStepState, totalSteps: number): void;
    /**
     * EN: Validates step dependencies, ensuring all referenced steps exist and DAG contains no cycles.
     * VI: Xác thực các phụ thuộc bước, đảm bảo mọi bước được tham chiếu đều tồn tại và DAG không chứa chu trình.
     */
    static validateStepDependencies(steps: Readonly<Record<string, MultiStepExecutionStepState>>): void;
    /**
     * EN: Validates an ExecutionEnvironmentSnapshot object.
     * VI: Xác thực đối tượng ExecutionEnvironmentSnapshot.
     */
    static validateEnvironmentSnapshot(snapshot: ExecutionEnvironmentSnapshot): void;
    /**
     * EN: Validates a ReplanningRequest structure.
     * VI: Xác thực cấu trúc ReplanningRequest.
     */
    static validateReplanningRequest(request: ReplanningRequest): void;
    /**
     * EN: Validates an entire MultiStepExecutionSession.
     * VI: Xác thực toàn bộ một MultiStepExecutionSession.
     */
    static validateSession(session: MultiStepExecutionSession): void;
    /**
     * EN: Validates a full session persistence document.
     * VI: Xác thực toàn bộ tài liệu lưu trữ phiên.
     */
    static validateSessionDocument(doc: MultiStepExecutionSessionDocument): void;
}
