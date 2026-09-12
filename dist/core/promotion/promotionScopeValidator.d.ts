import { type PromotionProposal } from './promotionTypes.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
import type { DelegationRecord } from '../delegation/delegationTypes.js';
import type { CapabilityLease } from '../delegation/delegationTypes.js';
export declare class PromotionScopeValidator {
    /**
     * Asserts that a target project root is strictly not the protected workspace.
     * Khẳng định rằng thư mục gốc dự án mục tiêu tuyệt đối không phải không gian làm việc được bảo vệ.
     */
    static assertNotProtectedWorkspace(targetPath: string): void;
    /**
     * Asserts that a relative path stays strictly contained within a root directory.
     * Khẳng định rằng đường dẫn tương đối hoàn toàn nằm bên trong thư mục gốc.
     */
    static assertPathContained(rootDir: string, relativePath: string): string;
    /**
     * Asserts session integrity for a promotion proposal.
     * Khẳng định tính toàn vẹn phiên cho đề xuất xúc tiến.
     */
    static assertSessionIntegrity(proposal: PromotionProposal, expectedSessionId: string): void;
    /**
     * Validates that requested promotion scope is fully contained within sandbox scope,
     * delegation scope, and authorized project roots.
     * Xác thực rằng phạm vi xúc tiến được yêu cầu hoàn toàn nằm trong phạm vi sandbox,
     * phạm vi ủy quyền và các thư mục gốc dự án được phép.
     */
    static validateScope(proposal: PromotionProposal, sandbox: SandboxDescriptor, delegation?: DelegationRecord, lease?: CapabilityLease): void;
}
