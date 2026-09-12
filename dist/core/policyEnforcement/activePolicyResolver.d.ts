import { PolicySnapshotStore } from '../policyEvolution/policySnapshotStore.js';
import { type PolicyConfiguration } from '../policyEvolution/policyEvolutionTypes.js';
import { type ActivePolicyResolutionResult } from './policyEnforcementTypes.js';
import { FailClosedBaselineFallback } from './failClosedBaselineFallback.js';
export interface ActivePolicyResolverOptions {
    readonly snapshotStore?: PolicySnapshotStore;
    readonly fallbackProvider?: FailClosedBaselineFallback;
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
export declare class ActivePolicyResolver {
    private readonly snapshotStore;
    private readonly fallbackProvider;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: ActivePolicyResolverOptions);
    /**
     * Resolves the active policy configuration for a given tenant / actor.
     * Guarantees tenant isolation, checksum integrity, and USER_STOP supremacy.
     * Giải quyết cấu hình chính sách hoạt động cho một người thuê / tác nhân nhất định.
     * Đảm bảo sự cô lập người thuê, tính toàn vẹn của mã kiểm tra và tính tối thượng của USER_STOP.
     */
    resolveActivePolicy(actorUserId?: string): ActivePolicyResolutionResult;
    /**
     * Helper verifying cryptographic SHA-256 payload integrity against stored checksum.
     * Hàm trợ giúp xác minh tính toàn vẹn tải trọng mật mã SHA-256 đối với mã kiểm tra được lưu.
     */
    verifyChecksum(config: PolicyConfiguration, provenanceSha256?: string): boolean;
}
export declare const globalActivePolicyResolver: ActivePolicyResolver;
