import { type ExecutionRequest, type ExecutionOperation, type ExecutionLease, type ExecutionAuthorizationEnvelope } from './executionTypes.js';
export declare const DANGEROUS_KEYS: readonly ["__proto__", "constructor", "prototype"];
export declare const PROHIBITED_COT_MARKERS: readonly ["<thought>", "</thought>", "[scratchpad]", "chainofthought", "chain_of_thought", "internalreasoning", "internal_reasoning", "reasoning_trace", "hidden_reasoning", "privatedeliberation", "modelthinking"];
export declare const SUSPICIOUS_INJECTION_PATTERNS: readonly [RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp, RegExp];
export declare class ExecutionRequestValidator {
    /**
     * EN: Validates a full ExecutionRequest, failing closed on any irregularity.
     * VI: Xác thực toàn bộ ExecutionRequest, fail-closed đối với bất kỳ điểm bất thường nào.
     */
    static validateRequest(request: unknown): asserts request is ExecutionRequest;
    /**
     * EN: Validates an ExecutionOperation structure.
     * VI: Xác thực cấu trúc của ExecutionOperation.
     */
    static validateOperation(operation: unknown): asserts operation is ExecutionOperation;
    /**
     * EN: Validates an ExecutionLease structure.
     * VI: Xác thực cấu trúc của ExecutionLease.
     */
    static validateLease(lease: unknown): asserts lease is ExecutionLease;
    /**
     * EN: Validates an ExecutionAuthorizationEnvelope structure.
     * VI: Xác thực cấu trúc của ExecutionAuthorizationEnvelope.
     */
    static validateAuthorization(auth: unknown): asserts auth is ExecutionAuthorizationEnvelope;
    /**
     * EN: Recursively asserts no prototype pollution keys exist.
     * VI: Đệ quy khẳng định không tồn tại các khóa prototype pollution nguy hiểm.
     */
    static assertNoPrototypePollution(target: unknown): void;
    /**
     * EN: Recursively asserts no CoT markers exist in object strings.
     * VI: Đệ quy khẳng định không có dấu vết CoT trong các chuỗi của đối tượng.
     */
    static assertNoCoTArtifacts(target: unknown): void;
    /**
     * EN: Asserts no prompt-injection patterns exist in execution parameters.
     * VI: Khẳng định không có mẫu chèn prompt trong tham số thực thi.
     */
    static assertNoPromptInjection(target: unknown): void;
}
