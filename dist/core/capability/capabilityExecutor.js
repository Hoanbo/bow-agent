// src/core/capability/capabilityExecutor.ts
// BOWCON V4.0 — MS-1.3.34: REAL BOWCON CAPABILITY & ENVIRONMENT INTERACTION RUNTIME
//
// Capability Executor: executes real host adapters under strict governance.
//
// INVARIANTS:
// Zero dynamic code execution (NO eval, NO new Function, NO unrestricted shell).
// Dry-run produces ZERO physical mutation.
// Protected workspace (C:\BOW\shopofbow) is ABSOLUTELY FORBIDDEN.
import crypto from 'node:crypto';
import { WorldActionExecutor } from '../world-action/worldActionExecutor.js';
import { globalCapabilityDiscovery } from './capabilityDiscovery.js';
import { buildWorldAction } from '../world-action/worldActionRequest.js';
import { CapabilityError } from './capabilityFailure.js';
export class CapabilityExecutor {
    async execute(descriptor, request) {
        const startedAt = Date.now();
        const executionId = `capexec_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
        // Dry Run check
        if (request.isDryRun) {
            return {
                success: true,
                capabilityId: descriptor.capabilityId,
                executionId,
                startedAt,
                completedAt: Date.now(),
                actualEffect: `DRY_RUN_PREVIEW: Capability "${descriptor.name}" previewed with zero physical mutation.`,
                output: { isDryRun: true },
                metadata: { isDryRun: true },
            };
        }
        try {
            let output;
            let actualEffect = '';
            switch (descriptor.capabilityId) {
                // -------------------------------------------------------------------
                // SYSTEM & OBSERVATION
                // -------------------------------------------------------------------
                case 'cap_sys_snapshot':
                case 'cap_obs_system': {
                    const snapshot = globalCapabilityDiscovery.captureSnapshot();
                    output = snapshot;
                    actualEffect = `Captured host system snapshot (${snapshot.cpu.cores} cores, ${snapshot.platform})`;
                    break;
                }
                case 'cap_net_interfaces':
                case 'cap_obs_network': {
                    const snapshot = globalCapabilityDiscovery.captureSnapshot();
                    output = snapshot.network;
                    actualEffect = `Discovered ${snapshot.network.interfaces.length} network interfaces (online: ${snapshot.network.online})`;
                    break;
                }
                case 'cap_obs_process': {
                    const action = buildWorldAction({
                        actionType: 'world_process_list',
                        target: '',
                        parameters: {},
                    });
                    const res = await WorldActionExecutor.executeProcessList(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                case 'cap_obs_fs': {
                    const target = request.target || request.parameters.path;
                    const action = buildWorldAction({
                        actionType: 'world_fs_read',
                        target,
                        parameters: { path: target },
                    });
                    const res = await WorldActionExecutor.executeFsRead(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                // -------------------------------------------------------------------
                // FILESYSTEM
                // -------------------------------------------------------------------
                case 'cap_fs_write': {
                    const target = request.target || request.parameters.path;
                    const action = buildWorldAction({
                        actionType: 'world_fs_write',
                        target,
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeFsWrite(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                case 'cap_fs_read': {
                    const target = request.target || request.parameters.path;
                    const action = buildWorldAction({
                        actionType: 'world_fs_read',
                        target,
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeFsRead(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                case 'cap_fs_append': {
                    const target = request.target || request.parameters.path;
                    const action = buildWorldAction({
                        actionType: 'world_fs_append',
                        target,
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeFsAppend(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                case 'cap_fs_mkdir': {
                    const target = request.target || request.parameters.path;
                    const action = buildWorldAction({
                        actionType: 'world_fs_mkdir',
                        target,
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeFsMkdir(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                case 'cap_fs_rename': {
                    const target = request.target || request.parameters.path;
                    const action = buildWorldAction({
                        actionType: 'world_fs_rename',
                        target,
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeFsRename(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                case 'cap_fs_delete': {
                    const target = request.target || request.parameters.path;
                    const action = buildWorldAction({
                        actionType: 'world_fs_delete',
                        target,
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeFsDelete(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                // -------------------------------------------------------------------
                // PROCESS
                // -------------------------------------------------------------------
                case 'cap_proc_start': {
                    const action = buildWorldAction({
                        actionType: 'world_process_start',
                        target: 'node',
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeProcessStart(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                case 'cap_proc_stop': {
                    const pid = request.parameters.pid;
                    const action = buildWorldAction({
                        actionType: 'world_process_stop',
                        target: String(pid),
                        parameters: request.parameters,
                    });
                    const res = await WorldActionExecutor.executeProcessStop(action);
                    output = res.output;
                    actualEffect = res.actualEffect;
                    break;
                }
                default:
                    throw new CapabilityError('UNAVAILABLE', `No physical execution adapter registered for capability "${descriptor.capabilityId}".`, descriptor.capabilityId);
            }
            return {
                success: true,
                capabilityId: descriptor.capabilityId,
                executionId,
                startedAt,
                completedAt: Date.now(),
                output,
                actualEffect,
                metadata: { descriptorName: descriptor.name },
            };
        }
        catch (err) {
            return {
                success: false,
                capabilityId: descriptor.capabilityId,
                executionId,
                startedAt,
                completedAt: Date.now(),
                actualEffect: 'Execution failed.',
                errorMessage: err.message,
                failureCode: err.code || 'RECOVERABLE',
                metadata: { error: err.message },
            };
        }
    }
}
export const globalCapabilityExecutor = new CapabilityExecutor();
