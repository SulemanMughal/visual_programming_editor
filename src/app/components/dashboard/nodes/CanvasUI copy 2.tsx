"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type Connection,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  generatePythonProgram,
  genId,
  outputDTypeForNode,
  inputDTypeForTarget,
  evaluate,
} from "@/app/components/dashboard/utils";

import FieldNodeUI from "@/app/components/dashboard/nodes/FieldNodeUI";
import ConstNode from "@/app/components/dashboard/nodes/ConstNode";
import OperatorNode from "@/app/components/dashboard/nodes/OperatorNode";
import OutputNode from "@/app/components/dashboard/nodes/OutputNode";
import Sidebar from "@/app/components/dashboard/Sidebar";

/**
 * CanvasUI with Auto‑Layout
 * - Adds a one‑click "Auto Layout" (DAG layering) button
 * - Pure function `layoutPositions` for testability
 * - Keeps Python panel toggle/copy/download
 */

const LAYER_X = 360; // horizontal gap between layers
const NODE_Y = 140; // vertical gap between nodes in a layer

/** Build quick adjacency maps */
function buildMaps(edges: Edge[]) {
  const incoming = new Map<string, Edge[]>();
  const outgoing = new Map<string, Edge[]>();
  edges.forEach((e) => {
    if (!incoming.has(e.target)) incoming.set(e.target, []);
    if (!outgoing.has(e.source)) outgoing.set(e.source, []);
    incoming.get(e.target)!.push(e);
    outgoing.get(e.source)!.push(e);
  });
  return { incoming, outgoing };
}

/**
 * Compute pretty positions using a simple DAG layout (Kahn layering).
 * - Nodes with no incoming edges start at layer 0.
 * - Each target layer = max(layer(source) + 1).
 * - Within each layer, nodes are vertically stacked with NODE_Y spacing.
 */
export function layoutPositions(nodes: Node[], edges: Edge[]) {
  const { incoming, outgoing } = buildMaps(edges);
  const ids = nodes.map((n) => n.id);
  const indeg = new Map<string, number>();
  ids.forEach((id) => indeg.set(id, (incoming.get(id) || []).length));

  // Kahn queue
  const q: string[] = [];
  indeg.forEach((d, id) => { if (d === 0) q.push(id); });
  const order: string[] = [];
  while (q.length) {
    const id = q.shift()!; order.push(id);
    (outgoing.get(id) || []).forEach((e) => {
      const d = (indeg.get(e.target) || 0) - 1; indeg.set(e.target, d);
      if (d === 0) q.push(e.target);
    });
  }
  // If cycle exists, append remaining ids in original order so layout still runs
  if (order.length < ids.length) ids.forEach((id) => { if (!order.includes(id)) order.push(id); });

  // Layer assignment: layer[v] = max(layer[u] + 1) over predecessors
  const layer = new Map<string, number>();
  order.forEach((id) => {
    const preds = incoming.get(id) || [];
    if (preds.length === 0) layer.set(id, 0);
    else layer.set(id, Math.max(...preds.map((e) => (layer.get(e.source) ?? 0) + 1)));
  });

  // Group by layer
  const layers: string[][] = [];
  order.forEach((id) => {
    const L = layer.get(id) ?? 0; if (!layers[L]) layers[L] = []; layers[L].push(id);
  });

  // Produce positions centered around existing rough area (start near (0,0))
  const pos = new Map<string, { x: number; y: number }>();
  layers.forEach((arr, L) => {
    // Distribute vertically
    arr.forEach((id, i) => {
      pos.set(id, { x: L * LAYER_X, y: i * NODE_Y });
    });
  });
  return pos;
}

function CanvasUI() {
  const rf = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [python, setPython] = useState("");
  const [showPython, setShowPython] = useState(true);

  const nodeTypes = useMemo(() => ({ field: FieldNodeUI, const: ConstNode, operator: OperatorNode, output: OutputNode }), []);

  useEffect(() => { setPython(generatePythonProgram(nodes, edges)); }, [nodes, edges]);
  useEffect(() => {
    const results = evaluate(nodes, edges, {});
    let changed = false;
    const nextNodes = nodes.map((n) => {
      if (n.type !== "output") return n;
      const next = results.get(n.id);
      const equal = typeof next === "object" ? JSON.stringify(n.data?.result) === JSON.stringify(next) : Object.is(n.data?.result, next);
      if (equal) return n; changed = true; return { ...n, data: { ...n.data, result: next } } as Node;
    });
    if (changed) setNodes(nextNodes);
  }, [nodes, edges, setNodes]);

  // --- tests (dev only) ---
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
    const code = generatePythonProgram([], []);
    console.assert(code.includes("def compute(row):"), "Smoke: compute signature");

    // Auto-layout small DAG: c2 -> add <- c3 -> out
    const c2: Node = { id: "c2", type: "const", position: { x: 0, y: 0 }, data: { kind: "const", label: "2", value: 2, dtype: "number" } } as any;
    const c3: Node = { id: "c3", type: "const", position: { x: 0, y: 0 }, data: { kind: "const", label: "3", value: 3, dtype: "number" } } as any;
    const add: Node = { id: "add", type: "operator", position: { x: 0, y: 0 }, data: { kind: "operator", opId: "add" } } as any;
    const out: Node = { id: "out", type: "output", position: { x: 0, y: 0 }, data: { kind: "output", label: "sum" } } as any;
    const e1: Edge = { id: "e1", source: "c2", target: "add" } as any;
    const e2: Edge = { id: "e2", source: "c3", target: "add" } as any;
    const e3: Edge = { id: "e3", source: "add", target: "out" } as any;
    const pos = layoutPositions([c2, c3, add, out], [e1, e2, e3]);
    console.assert((pos.get("add")!.x > pos.get("c2")!.x) && (pos.get("out")!.x > pos.get("add")!.x), "Layout: left→right layers");
  }, []);

  const isValidConnection = useCallback((c: Connection) => {
    if (!c.source || !c.target) return false; if (c.source === c.target) return false;
    const src = nodes.find((n) => n.id === c.source); const tgt = nodes.find((n) => n.id === c.target);
    if (!src || !tgt) return false; if (tgt.type === "field" || tgt.type === "const") return false;
    const s = outputDTypeForNode(src as any); const t = inputDTypeForTarget(tgt as any, c.targetHandle ?? undefined);
    return s === "any" || t === "any" || s === t;
  }, [nodes]);

  const onConnect = useCallback((p: Edge | Connection) => setEdges((eds) => addEdge({ ...(p as any), animated: true }, eds)), []);

  const { screenToFlowPosition } = useReactFlow();
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); const raw = e.dataTransfer.getData("application/reactflow"); if (!raw) return;
    const { type, payload } = JSON.parse(raw);
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    let node: Node;
    if (type === "field") node = { id: genId(), type: "field", position, data: { kind: "field", label: payload.path, path: payload.path, dtype: payload.dtype } } as any;
    else if (type === "const") node = { id: genId(), type: "const", position, data: { kind: "const", label: "Const", value: payload?.value ?? "", dtype: payload?.dtype ?? "string" } } as any;
    else if (type === "operator") node = { id: genId(), type: "operator", position, data: { kind: "operator", opId: payload.opId } } as any;
    else node = { id: genId(), type: "output", position, data: { kind: "output", label: payload?.label ?? "Result" } } as any;
    setNodes((nds) => nds.concat(node));
  };

  const copyPython = async () => { try { await navigator.clipboard.writeText(python); } catch {} };
  const downloadPython = () => { const blob = new Blob([python], { type: "text/x-python" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "compute.py"; a.click(); URL.revokeObjectURL(url); };

  const runAutoLayout = useCallback(() => {
    setNodes((nds) => {
      const pos = layoutPositions(nds as Node[], edges as Edge[]);
      const next = (nds as Node[]).map((n) => ({ ...n, position: pos.get(n.id) || n.position }));
      // after state flush, fit view
      requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 300 }));
      return next as any;
    });
  }, [edges, rf, setNodes]);

  return (
    <div className={`relative grid h-[85vh] ${showPython ? "grid-cols-[18rem_1fr_32rem]" : "grid-cols-[18rem_1fr]"} gap-3`}>
      {/* Top-right quick actions */}
      <div className="pointer-events-auto absolute right-3 top-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={() => setShowPython((s) => !s)}
          aria-pressed={showPython}
          className="rounded-full bg-neutral-500 px-3 py-1 text-xs font-semibold text-white shadow"
        >
          {showPython ? "Hide Code" : "Show Code"}
        </button>
        <button
          type="button"
          onClick={runAutoLayout}
          className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-sky-700"
          title="Automatically arrange nodes"
        >
          Auto Layout
        </button>
      </div>

      <Sidebar />

      {/* Canvas */}
      <div className="relative grow overflow-hidden rounded-xl border" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background gap={20} size={1} />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      {/* Python Panel */}
      {showPython && (
        <section className="flex min-h-0 shrink-0 flex-col overflow-hidden rounded-xl border-r border-neutral-800/70 bg-neutral-950">
          <div className="flex items-center justify-between border-b p-2">
            <div className="text-xs font-semibold text-white/80">Generated Python</div>
            <div className="mt-12 flex items-center gap-2">
              <button onClick={copyPython} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow">Copy</button>
              <button onClick={downloadPython} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow">Download</button>
            </div>
          </div>
          <textarea className="flex-1 resize-none bg-transparent p-3 font-mono text-[12px] leading-5 text-white" value={python} readOnly />
        </section>
      )}
    </div>
  );
}

export default CanvasUI;
