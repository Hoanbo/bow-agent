// src/core/capability/capabilityResolver.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability Resolver: maps structured intents, tool requests, and query strings to descriptors.
import { globalCapabilityRegistry } from './capabilityRegistry.js';
import { CapabilityError } from './capabilityFailure.js';
export class CapabilityResolver {
    aliases = {
        'world_fs_write': 'cap_fs_write',
        'fs_write': 'cap_fs_write',
        'fs.write': 'cap_fs_write',
        'write_file': 'cap_fs_write',
        'world_fs_read': 'cap_fs_read',
        'fs_read': 'cap_fs_read',
        'fs.read': 'cap_fs_read',
        'read_file': 'cap_fs_read',
        'world_fs_append': 'cap_fs_append',
        'fs_append': 'cap_fs_append',
        'fs.append': 'cap_fs_append',
        'append_file': 'cap_fs_append',
        'world_fs_mkdir': 'cap_fs_mkdir',
        'fs_mkdir': 'cap_fs_mkdir',
        'make_directory': 'cap_fs_mkdir',
        'world_fs_rename': 'cap_fs_rename',
        'fs_rename': 'cap_fs_rename',
        'world_fs_delete': 'cap_fs_delete',
        'fs_delete': 'cap_fs_delete',
        'fs.delete': 'cap_fs_delete',
        'fs.verify': 'cap_fs_read',
        'delete_file': 'cap_fs_delete',
        'world_process_list': 'cap_obs_process',
        'proc_list': 'cap_obs_process',
        'world_process_start': 'cap_proc_start',
        'proc_start': 'cap_proc_start',
        'world_process_stop': 'cap_proc_stop',
        'proc_stop': 'cap_proc_stop',
        'world_system_info': 'cap_obs_system',
        'sys_info': 'cap_obs_system',
        'system.inspect_environment': 'cap_obs_system',
        'system.observe': 'cap_obs_system',
        'system_observe': 'cap_obs_system',
        'network_info': 'cap_obs_network',
    };
    resolve(identifier) {
        if (!identifier || typeof identifier !== 'string') {
            throw new CapabilityError('RECOVERABLE', 'Capability identifier must be a non-empty string.');
        }
        const trimmed = identifier.trim().toLowerCase();
        // 1. Direct registry lookup
        let cap = globalCapabilityRegistry.getCapability(identifier);
        if (cap)
            return cap;
        // 2. Alias resolution
        const canonicalId = this.aliases[trimmed];
        if (canonicalId) {
            cap = globalCapabilityRegistry.getCapability(canonicalId);
            if (cap)
                return cap;
        }
        // 3. Fallback error
        throw new CapabilityError('UNAVAILABLE', `Capability "${identifier}" could not be resolved in registry.`);
    }
    registerAlias(alias, canonicalId) {
        this.aliases[alias.trim().toLowerCase()] = canonicalId;
    }
}
export const globalCapabilityResolver = new CapabilityResolver();
