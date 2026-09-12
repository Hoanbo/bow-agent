import { type PromotionProposal, type PromotionValidationResult } from './promotionTypes.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
import type { DelegationRecord } from '../delegation/delegationTypes.js';
import type { CapabilityLease } from '../delegation/delegationTypes.js';
export interface ValidateProposalInput {
    readonly proposal: PromotionProposal;
    readonly sandbox: SandboxDescriptor;
    readonly targetCurrentManifestHash: string;
    readonly delegation?: DelegationRecord;
    readonly lease?: CapabilityLease;
    readonly isUserStopActive?: boolean;
}
export declare class PromotionValidationEngine {
    /**
     * Validates a promotion proposal against current live context, invariants, and staleness.
     * Xác thực đề xuất xúc tiến với ngữ cảnh trực tiếp hiện tại, các tiên đề bất biến và tính cũ kỹ.
     */
    validate(input: ValidateProposalInput): PromotionValidationResult;
}
