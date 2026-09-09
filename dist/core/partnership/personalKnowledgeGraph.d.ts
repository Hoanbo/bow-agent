import type { KnowledgeGraphNode, KnowledgeGraphEdge, KnowledgeNodeType, KnowledgeEdgeType } from './partnershipTypes.js';
export declare class PersonalKnowledgeGraph {
    private _nodes;
    private _edges;
    private _storagePath;
    constructor(customStoragePath?: string);
    get nodeCount(): number;
    get edgeCount(): number;
    get storagePath(): string;
    setStoragePath(newPath: string): void;
    ensureOwnerNode(ownerId?: string): KnowledgeGraphNode;
    addNode(idOrNode: string | {
        id: string;
        label: string;
        type: KnowledgeNodeType;
        properties?: Record<string, any>;
    }, label?: string, type?: KnowledgeNodeType, properties?: Record<string, any>): KnowledgeGraphNode;
    getAllNodes(): KnowledgeGraphNode[];
    getNode(id: string): KnowledgeGraphNode | undefined;
    hasNode(id: string): boolean;
    addEdge(source: string, target: string, relationship: KnowledgeEdgeType, metadata?: Record<string, any>): KnowledgeGraphEdge;
    getEdgesFrom(sourceId: string): KnowledgeGraphEdge[];
    getEdgesTo(targetId: string): KnowledgeGraphEdge[];
    getNeighbors(nodeId: string): KnowledgeGraphNode[];
    getNodesByType(type: KnowledgeNodeType): KnowledgeGraphNode[];
    /**
     * Reconstructs project hierarchy: Goals, Tasks, Decisions, Problems, Outcomes.
     */
    getProjectHierarchy(projectId: string): {
        project?: KnowledgeGraphNode;
        goals: KnowledgeGraphNode[];
        decisions: KnowledgeGraphNode[];
        problems: KnowledgeGraphNode[];
        outcomes: KnowledgeGraphNode[];
    };
    getUnresolvedProblems(projectId?: string): KnowledgeGraphNode[];
    saveToDisk(customPath?: string): void;
    loadFromDisk(customPath?: string): number;
    clear(): void;
}
export declare const globalPersonalKnowledgeGraph: PersonalKnowledgeGraph;
