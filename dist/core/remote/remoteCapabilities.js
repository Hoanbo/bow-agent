// src/core/remote/remoteCapabilities.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE CAPABILITY NEGOTIATION & SAFETY
//
// EN:
// Authoritative capability negotiation.
// Explicitly permits event reception, ACKs, and continuity queries.
// Strictly forbids cognitive/execution capabilities: EXECUTE_TOOL, MUTATE_BRAIN, BYPASS_PDP,
// BYPASS_APPROVAL, MUTATE_COMMIT, FORCE_RECOVERY, CHANGE_GOVERNANCE.
// Any attempt to request forbidden capabilities results in immediate CAPABILITY_ESCALATION rejection.
//
// VI:
// Đàm phán quyền năng từ xa có thẩm quyền.
// Cho phép nhận sự kiện, gửi ACK và truy vấn tính liên tục.
// Nghiêm cấm các quyền năng nhận thức/thực thi. Mọi nỗ lực yêu cầu đều bị từ chối ngay lập tức.
import { ALL_ALLOWED_CAPABILITIES, ALL_FORBIDDEN_CAPABILITIES, } from './remoteTypes.js';
import { deepFreeze } from './remoteValidator.js';
/**
 * EN: Negotiates capabilities between remote peer request and gateway safety policies.
 * VI: Đàm phán quyền năng giữa yêu cầu của máy khách và chính sách an toàn của cổng.
 */
export function negotiateRemoteCapabilities(requested) {
    // 1. Check for forbidden capability escalation
    for (const cap of requested) {
        if (ALL_FORBIDDEN_CAPABILITIES.has(cap)) {
            return deepFreeze({
                success: false,
                grantedCapabilities: Object.freeze([]),
                failureCode: 'CAPABILITY_ESCALATION',
                error: `Capability escalation detected: requested forbidden capability "${cap}". Cognitive and execution authority is strictly prohibited.`,
            });
        }
    }
    // 2. Filter allowed capabilities
    const granted = [];
    for (const cap of requested) {
        if (ALL_ALLOWED_CAPABILITIES.has(cap)) {
            if (!granted.includes(cap)) {
                granted.push(cap);
            }
        }
    }
    return deepFreeze({
        success: true,
        grantedCapabilities: Object.freeze(granted),
    });
}
