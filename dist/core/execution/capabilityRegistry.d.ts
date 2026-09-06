import type { ToolCapability } from './capabilityTypes.js';
export declare class CapabilityRegistry {
    private readonly capabilities;
    /**
     * EN: Registers a new capability into the allowlist.
     * VI: Đăng ký một capability mới vào danh sách cho phép.
     */
    register(capability: ToolCapability): void;
    /**
     * EN: Unregisters a capability from the allowlist.
     * VI: Hủy đăng ký một capability khỏi danh sách cho phép.
     */
    unregister(name: string): boolean;
    /**
     * EN: Retrieves a capability by name.
     * VI: Lấy một capability theo tên.
     */
    get(name: string): ToolCapability | undefined;
    /**
     * EN: Checks if a capability exists in the allowlist.
     * VI: Kiểm tra xem capability có tồn tại trong allowlist hay không.
     */
    has(name: string): boolean;
    /**
     * EN: Lists all registered capabilities.
     * VI: Liệt kê tất cả các capability đã đăng ký.
     */
    list(): readonly ToolCapability[];
    /**
     * EN: Validates incoming arguments against a registered capability schema.
     * VI: Xác thực các tham số truyền vào theo schema capability đã đăng ký.
     */
    validate(name: string, args?: Record<string, unknown>): {
        valid: boolean;
        errors: readonly string[];
    };
}
