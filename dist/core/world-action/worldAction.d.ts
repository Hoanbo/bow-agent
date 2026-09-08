import type { WorldAction, AuthorizationToken } from './worldActionTypes.js';
import { type CreateActionParams } from './worldActionRequest.js';
import { type ActionConfirmationRequest } from './worldActionApproval.js';
export declare class WorldActionFacade {
    /**
     * Submits a WorldAction for governed physical execution.
     */
    submitAction(params: CreateActionParams, token?: AuthorizationToken): Promise<WorldAction>;
    /**
     * Generates a preview plan (Dry-Run) with zero physical mutation.
     */
    previewAction(params: CreateActionParams): Promise<WorldAction>;
    /**
     * Prepares an action and initiates human confirmation request if required.
     */
    requestConfirmation(params: CreateActionParams): {
        action: WorldAction;
        confirmation: ActionConfirmationRequest;
    };
    /**
     * Approves a pending confirmation and immediately executes the action with the issued token.
     */
    confirmAndExecute(confirmationId: string, approverUserId: string, action: WorldAction): Promise<WorldAction>;
}
export declare const worldAction: WorldActionFacade;
