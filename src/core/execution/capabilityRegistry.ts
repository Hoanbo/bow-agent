// src/core/execution/capabilityRegistry.ts
// BOWCON V4.0 — MILESTONE 1.3.12: ALLOWLISTED CAPABILITY REGISTRY
//
// EN:
// Authoritative, allowlisted capability registry for the agent runtime.
// Only explicitly registered capabilities may execute (INV-6).
// No dynamic code discovery, no arbitrary imports, no runtime eval (INV-7).
//
// VI:
// Capability registry được đưa vào danh sách cho phép (allowlist) có thẩm quyền cho runtime của agent.
// Chỉ các capability được đăng ký tường minh mới được phép thực thi (INV-6).
// Không tự động phát hiện code động, không import tùy tiện, không eval lúc runtime (INV-7).

import type { ToolCapability } from './capabilityTypes.js';

export class CapabilityRegistry {
  private readonly capabilities = new Map<string, ToolCapability>();

  /**
   * EN: Registers a new capability into the allowlist.
   * VI: Đăng ký một capability mới vào danh sách cho phép.
   */
  public register(capability: ToolCapability): void {
    if (!capability || typeof capability !== 'object') {
      throw new Error('MALFORMED_CAPABILITY: Capability descriptor must be a valid object.');
    }
    if (!capability.name || typeof capability.name !== 'string') {
      throw new Error('INVALID_CAPABILITY_NAME: Capability name is required.');
    }
    if (typeof capability.handler !== 'function') {
      throw new Error(`MISSING_HANDLER: Capability "${capability.name}" must have an executable handler function.`);
    }

    // Freeze defensive copy of the capability to ensure immutability
    const frozenCapability: ToolCapability = Object.freeze({
      name: capability.name,
      description: capability.description || '',
      domain: capability.domain,
      risk: capability.risk || 'LOW',
      parameters: Object.freeze([...(capability.parameters || [])]),
      handler: capability.handler,
    });

    this.capabilities.set(capability.name, frozenCapability);
  }

  /**
   * EN: Unregisters a capability from the allowlist.
   * VI: Hủy đăng ký một capability khỏi danh sách cho phép.
   */
  public unregister(name: string): boolean {
    return this.capabilities.delete(name);
  }

  /**
   * EN: Retrieves a capability by name.
   * VI: Lấy một capability theo tên.
   */
  public get(name: string): ToolCapability | undefined {
    return this.capabilities.get(name);
  }

  /**
   * EN: Checks if a capability exists in the allowlist.
   * VI: Kiểm tra xem capability có tồn tại trong allowlist hay không.
   */
  public has(name: string): boolean {
    return this.capabilities.has(name);
  }

  /**
   * EN: Lists all registered capabilities.
   * VI: Liệt kê tất cả các capability đã đăng ký.
   */
  public list(): readonly ToolCapability[] {
    return Object.freeze(Array.from(this.capabilities.values()));
  }

  /**
   * EN: Validates incoming arguments against a registered capability schema.
   * VI: Xác thực các tham số truyền vào theo schema capability đã đăng ký.
   */
  public validate(name: string, args: Record<string, unknown> = {}): { valid: boolean; errors: readonly string[] } {
    const capability = this.capabilities.get(name);
    if (!capability) {
      return { valid: false, errors: Object.freeze([`UNKNOWN_CAPABILITY: Capability "${name}" is not registered.`]) };
    }

    const errors: string[] = [];
    const passedArgs = args || {};

    for (const param of capability.parameters) {
      const val = passedArgs[param.name];
      if (param.required && (val === undefined || val === null || val === '')) {
        errors.push(`MISSING_REQUIRED_PARAMETER: "${param.name}" is required for capability "${name}".`);
        continue;
      }

      if (val !== undefined && val !== null) {
        const actualType = Array.isArray(val) ? 'array' : typeof val;
        if (param.type !== actualType) {
          errors.push(`INVALID_PARAMETER_TYPE: "${param.name}" expected ${param.type}, received ${actualType}.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
    };
  }
}
