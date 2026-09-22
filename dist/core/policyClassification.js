// src/core/policyClassification.ts
// BOWCON V4.0 — ACTION & CAPABILITY POLICY CLASSIFICATION
//
// EN:
// Integrates Physical Push-to-Talk governance with PDP Action Classification.
// When REQUIRE_PUSH_TO_TALK is enabled (default), physical presence is guaranteed at the hardware level,
// allowing 'audio.*' capabilities to execute without redundant software PDP approval tokens ('REVERSIBLE').
// When REQUIRE_PUSH_TO_TALK is disabled, 'audio.*' retains mandatory 'HIGH_IMPACT' PDP governance.
//
// VI:
// Tích hợp cơ chế an toàn Push-to-Talk vật lý với Phân loại chính sách PDP.
// Khi REQUIRE_PUSH_TO_TALK bật (mặc định), sự hiện diện vật lý của con người đã được bảo đảm tại phần cứng,
// cho phép capability 'audio.*' không cần thêm bước phê duyệt PDP phần mềm ('REVERSIBLE').
// Khi REQUIRE_PUSH_TO_TALK tắt, 'audio.*' giữ nguyên 'HIGH_IMPACT' bắt buộc qua PDP phê duyệt như bình thường.
import { isPushToTalkEnabled } from '../security/pushToTalkManager.js';
export { isPushToTalkEnabled };
/**
 * Xác định RiskLevel cho capability của Body khi đăng ký vào BodyRegistry.
 */
export function getAudioCapabilityRiskLevel(capabilityName) {
    if (capabilityName === 'audio.status' || capabilityName === 'audio.device.list') {
        return 'low';
    }
    // Khi Push-to-Talk BẬT: xác nhận vật lý mạnh mẽ tại chỗ -> riskLevel 'medium' (không cần approval)
    if (isPushToTalkEnabled()) {
        return 'medium';
    }
    // Khi Push-to-Talk TẮT: bắt buộc 'high' để qua PDP approval
    return 'high';
}
/**
 * Phân loại hành động (ActionClassification) cho PDP khi đánh giá Tool Execution.
 */
export function getAudioActionClassification(toolName) {
    if (toolName === 'audio.status' || toolName === 'audio.device.list') {
        return 'OBSERVE';
    }
    if (toolName === 'audio.device.select') {
        return 'REVERSIBLE';
    }
    // Khi Push-to-Talk BẬT: push-to-talk là xác nhận vật lý mạnh hơn -> REVERSIBLE
    if (isPushToTalkEnabled()) {
        return 'REVERSIBLE';
    }
    // Khi Push-to-Talk TẮT: giữ nguyên HIGH_IMPACT bắt buộc qua PDP
    return 'HIGH_IMPACT';
}
