import { type CommandExecutionContext, type GovernedQualityCommand } from './qualityTypes.js';
import type { SandboxDescriptor } from '../sandbox/sandboxTypes.js';
import type { DelegationRecord, CapabilityLease } from '../delegation/delegationTypes.js';
export declare class QualityPolicyEngine {
    /**
     * Asserts that a target path does not target or traverse into the protected workspace C:\BOW\shopofbow.
     * Khẳng định rằng đường dẫn mục tiêu không nhắm tới hoặc duyệt vào không gian làm việc được bảo vệ C:\BOW\shopofbow.
     */
    static assertNotProtectedWorkspace(targetPath: string): void;
    /**
     * Validates that an in-sandbox command request satisfies all governance constraints.
     * Xác thực rằng yêu cầu lệnh trong sandbox thỏa mãn tất cả các ràng buộc quản trị.
     */
    static validateCommandExecution(command: GovernedQualityCommand, context: CommandExecutionContext, sandbox: SandboxDescriptor, options?: {
        readonly delegation?: DelegationRecord;
        readonly capabilityLease?: CapabilityLease;
        readonly isUserStopped?: boolean;
        readonly isRevoked?: boolean;
    }): void;
}
