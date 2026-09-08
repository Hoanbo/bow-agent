import type { PermissionLevel } from './capabilityTypes.js';
import type { ActionRiskLevel } from '../world-action/worldActionTypes.js';
export declare function mapRiskToPermission(risk: ActionRiskLevel): PermissionLevel;
export declare function requiresAuthorizationToken(level: PermissionLevel): boolean;
export declare function requiresExplicitConfirmation(level: PermissionLevel): boolean;
