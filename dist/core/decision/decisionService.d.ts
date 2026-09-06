import type { DecisionInput, DecisionResult } from './decisionTypes.js';
export declare class DecisionService {
    /**
     * EN: Evaluates context and plan to produce an immutable DecisionResult.
     * VI: Đánh giá context và plan để sinh ra DecisionResult bất biến.
     */
    decide(input: DecisionInput): DecisionResult;
    /**
     * EN: Handles validation failures by returning a fail-closed BLOCK decision result.
     * VI: Xử lý lỗi xác thực bằng cách trả về kết quả quyết định BLOCK fail-closed.
     */
    private block;
}
