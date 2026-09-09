// src/core/partnership/personalKnowledgeGraph.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Structured Personal Knowledge Graph.
// Captures relational context across Owner, Projects, Goals, Decisions, Problems, Preferences, and Outcomes.
//
// Invariants:
// OWNER -> PROJECT -> GOAL -> TASK / DECISION / PROBLEM / DEPENDENCY
// PRESERVE RELATIONSHIPS AND HISTORICAL CONTEXT
// Protected Workspace (C:\BOW\shopofbow) -> READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type {
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  KnowledgeNodeType,
  KnowledgeEdgeType,
} from './partnershipTypes.js';
import { generatePartnershipId, MASTER_OWNER_ID } from './partnershipTypes.js';

export class PersonalKnowledgeGraph {
  private _nodes = new Map<string, KnowledgeGraphNode>();
  private _edges = new Map<string, KnowledgeGraphEdge>();
  private _storagePath: string = path.resolve('data', 'partnership', 'knowledge_graph.json');

  constructor(customStoragePath?: string) {
    if (customStoragePath) {
      this.setStoragePath(customStoragePath);
    }
    // Seed Master Owner Root Node
    this.ensureOwnerNode(MASTER_OWNER_ID);
  }

  public get nodeCount(): number {
    return this._nodes.size;
  }

  public get edgeCount(): number {
    return this._edges.size;
  }

  public get storagePath(): string {
    return this._storagePath;
  }

  public setStoragePath(newPath: string): void {
    const normalized = path.normalize(newPath).toLowerCase();
    if (normalized.includes('shopofbow')) {
      throw new Error('[PROTECTED_WORKSPACE_VIOLATION] Knowledge graph storage path cannot be in shopofbow');
    }
    this._storagePath = path.resolve(newPath);
  }

  public ensureOwnerNode(ownerId: string = MASTER_OWNER_ID): KnowledgeGraphNode {
    let node = this._nodes.get(ownerId);
    if (!node) {
      node = {
        id: ownerId,
        label: 'Master Owner',
        type: 'OWNER',
        properties: { role: 'Master Human Authority', principal: true },
        createdAt: Date.now(),
      };
      this._nodes.set(ownerId, node);
    }
    return node;
  }

  public addNode(
    idOrNode: string | { id: string; label: string; type: KnowledgeNodeType; properties?: Record<string, any> },
    label?: string,
    type?: KnowledgeNodeType,
    properties: Record<string, any> = {}
  ): KnowledgeGraphNode {
    let node: KnowledgeGraphNode;
    if (typeof idOrNode === 'object') {
      node = {
        id: idOrNode.id,
        label: idOrNode.label,
        type: idOrNode.type,
        properties: idOrNode.properties ?? {},
        createdAt: Date.now(),
      };
    } else {
      node = {
        id: idOrNode,
        label: label ?? idOrNode,
        type: type ?? 'KNOWLEDGE',
        properties,
        createdAt: Date.now(),
      };
    }
    this._nodes.set(node.id, node);
    return node;
  }

  public getAllNodes(): KnowledgeGraphNode[] {
    return Array.from(this._nodes.values());
  }

  public getNode(id: string): KnowledgeGraphNode | undefined {
    return this._nodes.get(id);
  }

  public hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  public addEdge(
    source: string,
    target: string,
    relationship: KnowledgeEdgeType,
    metadata?: Record<string, any>
  ): KnowledgeGraphEdge {
    if (!this._nodes.has(source)) {
      throw new Error(`[GRAPH_ORPHAN_EDGE] Source node '${source}' does not exist`);
    }
    if (!this._nodes.has(target)) {
      throw new Error(`[GRAPH_ORPHAN_EDGE] Target node '${target}' does not exist`);
    }

    const edgeId = generatePartnershipId('edge');
    const edge: KnowledgeGraphEdge = {
      id: edgeId,
      source,
      target,
      relationship,
      metadata,
    };
    this._edges.set(edgeId, edge);
    return edge;
  }

  public getEdgesFrom(sourceId: string): KnowledgeGraphEdge[] {
    return Array.from(this._edges.values()).filter((e) => e.source === sourceId);
  }

  public getEdgesTo(targetId: string): KnowledgeGraphEdge[] {
    return Array.from(this._edges.values()).filter((e) => e.target === targetId);
  }

  public getNeighbors(nodeId: string): KnowledgeGraphNode[] {
    const neighborIds = new Set<string>();
    for (const e of this._edges.values()) {
      if (e.source === nodeId) neighborIds.add(e.target);
      if (e.target === nodeId) neighborIds.add(e.source);
    }
    return Array.from(neighborIds)
      .map((id) => this._nodes.get(id)!)
      .filter(Boolean);
  }

  public getNodesByType(type: KnowledgeNodeType): KnowledgeGraphNode[] {
    return Array.from(this._nodes.values()).filter((n) => n.type === type);
  }

  /**
   * Reconstructs project hierarchy: Goals, Tasks, Decisions, Problems, Outcomes.
   */
  public getProjectHierarchy(projectId: string): {
    project?: KnowledgeGraphNode;
    goals: KnowledgeGraphNode[];
    decisions: KnowledgeGraphNode[];
    problems: KnowledgeGraphNode[];
    outcomes: KnowledgeGraphNode[];
  } {
    const project = this._nodes.get(projectId);
    const goals: KnowledgeGraphNode[] = [];
    const decisions: KnowledgeGraphNode[] = [];
    const problems: KnowledgeGraphNode[] = [];
    const outcomes: KnowledgeGraphNode[] = [];

    const outgoing = this.getEdgesFrom(projectId);
    for (const edge of outgoing) {
      const targetNode = this._nodes.get(edge.target);
      if (!targetNode) continue;
      if (targetNode.type === 'GOAL') goals.push(targetNode);
      if (targetNode.type === 'DECISION') decisions.push(targetNode);
      if (targetNode.type === 'PROBLEM') problems.push(targetNode);
      if (targetNode.type === 'OUTCOME') outcomes.push(targetNode);
    }

    // Traverse goals for sub-items
    for (const goal of goals) {
      const goalEdges = this.getEdgesFrom(goal.id);
      for (const ge of goalEdges) {
        const item = this._nodes.get(ge.target);
        if (!item) continue;
        if (item.type === 'DECISION' && !decisions.some((d) => d.id === item.id)) decisions.push(item);
        if (item.type === 'PROBLEM' && !problems.some((p) => p.id === item.id)) problems.push(item);
        if (item.type === 'OUTCOME' && !outcomes.some((o) => o.id === item.id)) outcomes.push(item);
      }
    }

    return { project, goals, decisions, problems, outcomes };
  }

  public getUnresolvedProblems(projectId?: string): KnowledgeGraphNode[] {
    const problems = this.getNodesByType('PROBLEM');
    return problems.filter((p) => {
      if (p.properties.status === 'RESOLVED') return false;
      if (!projectId) return true;
      const connectedEdges = this.getEdgesTo(p.id);
      return connectedEdges.some((e) => e.source === projectId);
    });
  }

  public saveToDisk(customPath?: string): void {
    const targetFile = customPath ? path.resolve(customPath) : this._storagePath;
    const targetDir = path.dirname(targetFile);

    if (targetFile.toLowerCase().includes('shopofbow')) {
      throw new Error('[PROTECTED_WORKSPACE_VIOLATION] Cannot persist to shopofbow');
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const nodes = Array.from(this._nodes.values());
    const edges = Array.from(this._edges.values());
    const payload = JSON.stringify({ nodes, edges }, null, 2);
    const checksum = createHash('sha256').update(payload).digest('hex');

    const envelope = {
      version: '4.0.0',
      milestone: 'MS-1.3.39',
      checksum,
      savedAt: Date.now(),
      nodes,
      edges,
    };

    const tempFile = `${targetFile}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(envelope, null, 2), 'utf8');
    fs.renameSync(tempFile, targetFile);
  }

  public loadFromDisk(customPath?: string): number {
    const targetFile = customPath ? path.resolve(customPath) : this._storagePath;
    if (!fs.existsSync(targetFile)) return 0;

    const raw = fs.readFileSync(targetFile, 'utf8');
    const envelope = JSON.parse(raw);

    if (envelope.nodes && envelope.edges) {
      const payload = JSON.stringify({ nodes: envelope.nodes, edges: envelope.edges }, null, 2);
      const computedHash = createHash('sha256').update(payload).digest('hex');
      if (envelope.checksum && envelope.checksum !== computedHash) {
        throw new Error('[PERSISTENCE_CORRUPTION] Knowledge graph SHA-256 checksum mismatch');
      }

      this._nodes.clear();
      this._edges.clear();
      for (const node of envelope.nodes) {
        this._nodes.set(node.id, node);
      }
      for (const edge of envelope.edges) {
        this._edges.set(edge.id, edge);
      }
      return this._nodes.size;
    }
    return 0;
  }

  public clear(): void {
    this._nodes.clear();
    this._edges.clear();
    this.ensureOwnerNode(MASTER_OWNER_ID);
  }
}

export const globalPersonalKnowledgeGraph = new PersonalKnowledgeGraph();
