import { type GovernedQualityCommand } from './qualityTypes.js';
export declare class QualityCommandRegistry {
    private readonly commands;
    constructor();
    /**
     * Registers default continuous quality gate pipeline commands.
     * Đăng ký các lệnh mặc định cho đường ống cổng chất lượng liên tục.
     */
    private registerDefaultCommands;
    /**
     * Registers a new governed command in the allowlist.
     * Đăng ký một lệnh có quản trị mới vào danh sách cho phép.
     */
    registerCommand(command: GovernedQualityCommand): void;
    /**
     * Retrieves a registered command by its ID, throwing fail-closed if unregistered.
     * Lấy lệnh đã đăng ký theo ID của nó, ném lỗi đóng nếu chưa đăng ký.
     */
    getCommand(commandId: string): GovernedQualityCommand;
    /**
     * Checks whether a command ID is registered in the allowlist.
     * Kiểm tra xem một ID lệnh có được đăng ký trong danh sách cho phép hay không.
     */
    hasCommand(commandId: string): boolean;
    /**
     * Returns all registered command IDs.
     * Trả về tất cả các ID lệnh đã đăng ký.
     */
    listCommandIds(): readonly string[];
}
