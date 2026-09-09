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
import { generatePartnershipId, MASTER_OWNER_ID } from './partnershipTypes.js';
export class PersonalKnowledgeGraph {
    _nodes = new Map();
    _edges = new Map();
    _storagePath = path.resolve('data', 'partnership', 'knowledge_graph.json');
    constructor(customStoragePath) {
        if (customStoragePath) {
            this.setStoragePath(customStoragePath);
        }
        // Seed Master Owner Root Node
        this.ensureOwnerNode(MASTER_OWNER_ID);
    }
    get nodeCount() {
        return this._nodes.size;
    }
    get edgeCount() {
        return this._edges.size;
    }
    get storagePath() {
        return this._storagePath;
    }
    setStoragePath(newPath) {
        const normalized = path.normalize(newPath).toLowerCase();
        if (normalized.includes('shopofbow')) {
            throw new Error('[PROTECTED_WORKSPACE_VIOLATION] Knowledge graph storage path cannot be in shopofbow');
        }
        this._storagePath = path.resolve(newPath);
    }
    ensureOwnerNode(ownerId = MASTER_OWNER_ID) {
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
    addNode(idOrNode, label, type, properties = {}) {
        let node;
        if (typeof idOrNode === 'object') {
            node = {
                id: idOrNode.id,
                label: idOrNode.label,
                type: idOrNode.type,
                properties: idOrNode.properties ?? {},
                createdAt: Date.now(),
            };
        }
        else {
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
    getAllNodes() {
        return Array.from(this._nodes.values());
    }
    getNode(id) {
        return this._nodes.get(id);
    }
    hasNode(id) {
        return this._nodes.has(id);
    }
    addEdge(source, target, relationship, metadata) {
        if (!this._nodes.has(source)) {
            throw new Error(`[GRAPH_ORPHAN_EDGE] Source node '${source}' does not exist`);
        }
        if (!this._nodes.has(target)) {
            throw new Error(`[GRAPH_ORPHAN_EDGE] Target node '${target}' does not exist`);
        }
        const edgeId = generatePartnershipId('edge');
        const edge = {
            id: edgeId,
            source,
            target,
            relationship,
            metadata,
        };
        this._edges.set(edgeId, edge);
        return edge;
    }
    getEdgesFrom(sourceId) {
        return Array.from(this._edges.values()).filter((e) => e.source === sourceId);
    }
    getEdgesTo(targetId) {
        return Array.from(this._edges.values()).filter((e) => e.target === targetId);
    }
    getNeighbors(nodeId) {
        const neighborIds = new Set();
        for (const e of this._edges.values()) {
            if (e.source === nodeId)
                neighborIds.add(e.target);
            if (e.target === nodeId)
                neighborIds.add(e.source);
        }
        return Array.from(neighborIds)
            .map((id) => this._nodes.get(id))
            .filter(Boolean);
    }
    getNodesByType(type) {
        return Array.from(this._nodes.values()).filter((n) => n.type === type);
    }
    /**
     * Reconstructs project hierarchy: Goals, Tasks, Decisions, Problems, Outcomes.
     */
    getProjectHierarchy(projectId) {
        const project = this._nodes.get(projectId);
        const goals = [];
        const decisions = [];
        const problems = [];
        const outcomes = [];
        const outgoing = this.getEdgesFrom(projectId);
        for (const edge of outgoing) {
            const targetNode = this._nodes.get(edge.target);
            if (!targetNode)
                continue;
            if (targetNode.type === 'GOAL')
                goals.push(targetNode);
            if (targetNode.type === 'DECISION')
                decisions.push(targetNode);
            if (targetNode.type === 'PROBLEM')
                problems.push(targetNode);
            if (targetNode.type === 'OUTCOME')
                outcomes.push(targetNode);
        }
        // Traverse goals for sub-items
        for (const goal of goals) {
            const goalEdges = this.getEdgesFrom(goal.id);
            for (const ge of goalEdges) {
                const item = this._nodes.get(ge.target);
                if (!item)
                    continue;
                if (item.type === 'DECISION' && !decisions.some((d) => d.id === item.id))
                    decisions.push(item);
                if (item.type === 'PROBLEM' && !problems.some((p) => p.id === item.id))
                    problems.push(item);
                if (item.type === 'OUTCOME' && !outcomes.some((o) => o.id === item.id))
                    outcomes.push(item);
            }
        }
        return { project, goals, decisions, problems, outcomes };
    }
    getUnresolvedProblems(projectId) {
        const problems = this.getNodesByType('PROBLEM');
        return problems.filter((p) => {
            if (p.properties.status === 'RESOLVED')
                return false;
            if (!projectId)
                return true;
            const connectedEdges = this.getEdgesTo(p.id);
            return connectedEdges.some((e) => e.source === projectId);
        });
    }
    saveToDisk(customPath) {
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
    loadFromDisk(customPath) {
        const targetFile = customPath ? path.resolve(customPath) : this._storagePath;
        if (!fs.existsSync(targetFile))
            return 0;
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
    clear() {
        this._nodes.clear();
        this._edges.clear();
        this.ensureOwnerNode(MASTER_OWNER_ID);
    }
}
export const globalPersonalKnowledgeGraph = new PersonalKnowledgeGraph();
