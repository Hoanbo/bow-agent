import type { SemanticReference } from './intentTypes.js';
export declare function resolveSemanticReferences(text: string, turns?: readonly {
    id: string;
    sender: string;
    content: string;
}[]): SemanticReference[];
