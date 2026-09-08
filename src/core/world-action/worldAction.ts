// src/core/world-action/worldAction.ts
// BOWCON V4.0 — MS-1.3.33: REAL BOWCON WORLD ACTION & GOVERNED EXECUTION RUNTIME
//
// High-Level Governed Physical Action Execution Facade.
// Integrates with BrainRuntime, BrainService, and CognitivePipeline.

import type { WorldAction, AuthorizationToken } from './worldActionTypes.js';
import { buildWorldAction, type CreateActionParams } from './worldActionRequest.js';
import { globalWorldActionRuntime } from './worldActionRuntime.js';
import { globalWorldActionApproval, type ActionConfirmationRequest } from './worldActionApproval.js';
import { globalWorldActionPlanner } from './worldActionPlanner.js';

export class WorldActionFacade {
  /**
   * Submits a WorldAction for governed physical execution.
   */
  public async submitAction(params: CreateActionParams, token?: AuthorizationToken): Promise<WorldAction> {
    const action = buildWorldAction(params);
    if (token) {
      action.authorizationToken = token;
    }
    return globalWorldActionRuntime.executeAction(action);
  }

  /**
   * Generates a preview plan (Dry-Run) with zero physical mutation.
   */
  public async previewAction(params: CreateActionParams): Promise<WorldAction> {
    const action = buildWorldAction({ ...params, isDryRun: true });
    return globalWorldActionRuntime.executeAction(action);
  }

  /**
   * Prepares an action and initiates human confirmation request if required.
   */
  public requestConfirmation(params: CreateActionParams): { action: WorldAction; confirmation: ActionConfirmationRequest } {
    const action = buildWorldAction(params);
    globalWorldActionPlanner.prepare(action);
    const confirmation = globalWorldActionApproval.createConfirmationRequest(action);
    return { action, confirmation };
  }

  /**
   * Approves a pending confirmation and immediately executes the action with the issued token.
   */
  public async confirmAndExecute(confirmationId: string, approverUserId: string, action: WorldAction): Promise<WorldAction> {
    const token = globalWorldActionApproval.approve(confirmationId, approverUserId);
    action.authorizationToken = token;
    return globalWorldActionRuntime.executeAction(action);
  }
}

export const worldAction = new WorldActionFacade();
