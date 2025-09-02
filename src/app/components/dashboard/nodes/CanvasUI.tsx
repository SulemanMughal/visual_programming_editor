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
import { Position } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import  { Highlight,  themes } from "prism-react-renderer";




// import nightOwl from "prism-react-renderer/themes/nightOwl";

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
 * - Horizontal & Vertical layout buttons
 * - Pure function `layoutPositions` (DAG layering + median sweep)
 * - Toggleable Python panel
 */

type LayoutDir = "LR" | "TB"; // LR = left→right (horizontal), TB = top→bottom (vertical)

// const deepClone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// const duplicateNodes = React.useCallback(
//   (nodeId?: string, withEdges = true, offset = 40) => {
//     const allNodes = rf.getNodes();
//     const allEdges = rf.getEdges();

//     // nodes to copy: explicit id OR current selection
//     const toCopy = new Set<string>(
//       nodeId ? [nodeId] : allNodes.filter((n) => n.selected).map((n) => n.id)
//     );
//     if (toCopy.size === 0) return;

//     const idMap = new Map<string, string>();

//     const nodeClones = [...toCopy].map((id) => {
//       const src = allNodes.find((n) => n.id === id)!;
//       const newId = `${src.id}-${Math.random().toString(36).slice(-4)}`;
//       idMap.set(src.id, newId);

//       return {
//         ...deepClone(src),
//         id: newId,
//         selected: false,
//         dragging: false,
//         position: {
//           x: (src.position?.x ?? 0) + offset,
//           y: (src.position?.y ?? 0) + offset,
//         },
//         // keep orientations as-is (you already set them per layout elsewhere)
//         sourcePosition: src.sourcePosition,
//         targetPosition: src.targetPosition,
//       };
//     });

//     let edgeClones: Edge[] = [];
//     if (withEdges) {
//       edgeClones = allEdges
//         .filter((e) => toCopy.has(e.source) && toCopy.has(e.target))
//         .map((e) => ({
//           ...deepClone(e),
//           id: `${e.id}-${Math.random().toString(36).slice(-4)}`,
//           source: idMap.get(e.source)!,
//           target: idMap.get(e.target)!,
//           selected: false,
//         }));
//     }

//     rf.addNodes(nodeClones as any);
//     if (edgeClones.length) rf.addEdges(edgeClones);

//     // select the new clones
//     rf.setNodes((nds) =>
//       nds.map((n) =>
//         idMap.has(n.id) ? { ...n, selected: true } : { ...n, selected: false }
//       )
//     );
//   },
//   [rf]
// );

const dirToPositions = (dir: LayoutDir) => ({
  source: dir === "LR" ? Position.Right : Position.Bottom,
  target: dir === "LR" ? Position.Left : Position.Top,
});

/** Compute pretty positions for nodes and edges. */
export function layoutPositions(nodes: Node[], edges: Edge[], dir: LayoutDir = "LR") {
  // Read actual measured sizes when available; fall back to reasonable defaults
  const sizeOf = (id: string) => {
    const n = nodes.find((x) => x.id === id) as any;
    const w = (n?.width ?? n?.measured?.width ?? 380) as number;
    const h = (n?.height ?? n?.measured?.height ?? 140) as number;
    return { w, h };
  };
  const LAYER_PAD = 120; // gap between layers (primary axis)
  const ROW_PAD = 40;    // gap between nodes stacked in the secondary axis

  // Build adjacency maps
  const incoming = new Map<string, Edge[]>();
  const outgoing = new Map<string, Edge[]>();
  edges.forEach((e) => {
    (incoming.get(e.target) || incoming.set(e.target, []).get(e.target)!).push(e);
    (outgoing.get(e.source) || outgoing.set(e.source, []).get(e.source)!).push(e);
  });

  // Weakly-connected components for packing
  const undirected = new Map<string, Set<string>>();
  nodes.forEach((n) => undirected.set(n.id, new Set()));
  edges.forEach((e) => { undirected.get(e.source)!.add(e.target); undirected.get(e.target)!.add(e.source); });

  const seen = new Set<string>();
  const components: string[][] = [];
  for (const n of nodes) {
    if (seen.has(n.id)) continue;
    const q = [n.id]; seen.add(n.id);
    const group: string[] = [];
    while (q.length) {
      const v = q.shift()!; group.push(v);
      for (const w of undirected.get(v) || []) if (!seen.has(w)) { seen.add(w); q.push(w); }
    }
    components.push(group);
  }

  const pos = new Map<string, { x: number; y: number }>();
  let packX = 0, packY = 0; // offsets when packing multiple components

  for (const comp of components) {
    // Topological order (Kahn)
    const indeg = new Map<string, number>();
    comp.forEach((id) => indeg.set(id, (incoming.get(id) || []).filter((e) => comp.includes(e.source)).length));
    const q: string[] = []; indeg.forEach((d, id) => { if (d === 0) q.push(id); });
    const order: string[] = [];
    while (q.length) {
      const id = q.shift()!; order.push(id);
      (outgoing.get(id) || []).forEach((e) => {
        if (!comp.includes(e.target)) return;
        const d = (indeg.get(e.target) || 0) - 1; indeg.set(e.target, d); if (d === 0) q.push(e.target);
      });
    }
    comp.forEach((id) => { if (!order.includes(id)) order.push(id); }); // keep going if cycles

    // Layer assignment
    const layer = new Map<string, number>();
    order.forEach((id) => {
      const preds = (incoming.get(id) || []).filter((e) => comp.includes(e.source));
      if (preds.length === 0) layer.set(id, 0);
      else layer.set(id, Math.max(...preds.map((e) => (layer.get(e.source) ?? 0) + 1)));
    });

    // Group by layer
    const layers: string[][] = [];
    order.forEach((id) => { const L = layer.get(id) ?? 0; (layers[L] ||= []).push(id); });

    // Median sweeps to reduce crossings
    const childrenOf = (id: string) => (outgoing.get(id) || []).filter((e) => comp.includes(e.target)).map((e) => e.target);
    const parentsOf  = (id: string) => (incoming.get(id) || []).filter((e) => comp.includes(e.source)).map((e) => e.source);
    const indexMap = new Map<string, number>();
    layers.forEach((arr) => arr.forEach((id, i) => indexMap.set(id, i)));
    const sweep = (arr: string[], neighbor: (id: string) => string[]) => {
      const med = new Map<string, number>();
      arr.forEach((id) => {
        const nbs = neighbor(id); if (!nbs.length) { med.set(id, Infinity); return; }
        const idxs = nbs.map((nb) => indexMap.get(nb) ?? 0).sort((a,b)=>a-b);
        med.set(id, idxs[Math.floor(idxs.length/2)]);
      });
      arr.sort((a,b)=> (med.get(a)! - med.get(b)!));
      arr.forEach((id,i)=> indexMap.set(id,i));
    };
    for (let L = 1; L < layers.length; L++) sweep(layers[L], parentsOf);
    for (let L = layers.length - 2; L >= 0; L--) sweep(layers[L], childrenOf);

    // Target ordering positions (secondary axis) using centering
    const score = new Map<string, number>();
    layers.forEach((arr) => arr.forEach((id, i) => score.set(id, i)));
    for (let L = layers.length - 2; L >= 0; L--) {
      for (const id of layers[L]) {
        const kids = childrenOf(id); if (!kids.length) continue;
        const avg = kids.reduce((a,k)=> a + (score.get(k) ?? 0), 0) / kids.length;
        score.set(id, avg);
      }
    }
    // Build compact secondary positions honoring real node sizes
    const secCoord = new Map<string, number>();
    layers.forEach((arr) => {
      // Sort by desired order, then compact with heights/widths
      arr.sort((a,b)=> (score.get(a)! - score.get(b)!));
      let cursor = 0;
      for (const id of arr) {
        const s = sizeOf(id);
        // place at least after cursor
        secCoord.set(id, cursor);
        cursor += (dir === "LR" ? s.h : s.w) + ROW_PAD;
      }
    });

    // Compute per-layer primary offsets using real max sizes per layer
    const primaryOffsets: number[] = [];
    let acc = 0;
    for (let L = 0; L < layers.length; L++) {
      primaryOffsets[L] = acc;
      const maxPrimary = Math.max(
        ...layers[L].map((id) => (dir === "LR" ? sizeOf(id).w : sizeOf(id).h)),
        0
      );
      acc += maxPrimary + LAYER_PAD;
    }

    // Assign coordinates
    layers.forEach((arr, L) => {
      for (const id of arr) {
        const primary   = primaryOffsets[L];
        const secondary = secCoord.get(id)!;
        const x = dir === "LR" ? packX + primary   : packX + secondary;
        const y = dir === "LR" ? packY + secondary : packY + primary;
        pos.set(id, { x, y });
      }
    });

    // Compute component footprint for packing next component
    const compPrimary = primaryOffsets[primaryOffsets.length - 1] + (dir === "LR"
      ? Math.max(...layers[layers.length - 1].map((id) => sizeOf(id).w), 0)
      : Math.max(...layers[layers.length - 1].map((id) => sizeOf(id).h), 0));
    const compSecondary = Math.max(
      ...layers.map((arr) => arr.reduce((m, id) => m + (dir === "LR" ? sizeOf(id).h : sizeOf(id).w) + ROW_PAD, -ROW_PAD)),
      0
    );

    if (dir === "LR") { packY += compSecondary + 120; } else { packX += compPrimary + 160; }
  }

  return pos;
}

function CanvasUI() {
  const rf = useReactFlow();
  // const [ctx, setCtx] = useState<null | {x:number;y:number;nodeId:string}>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [python, setPython] = useState("");
  const [showPython, setShowPython] = useState(true);
  const [, setLayoutDir] = useState<LayoutDir>("LR");

  const nodeTypes = useMemo(() => ({ field: FieldNodeUI, const: ConstNode, operator: OperatorNode, output: OutputNode }), []);
  const defaultEdgeOptions = useMemo(() => ({
    type: "smoothstep" as const,
    animated: true,
    markerEnd: { type: "arrowclosed" as const },
    pathOptions: { borderRadius: 10 },
  }), []);

  useEffect(() => { 
    setPython(generatePythonProgram(nodes, edges));
    console.debug(nodes, edges)
   }, [nodes, edges]);
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

    const c2: Node = { id: "c2", type: "const", position: { x: 0, y: 0 }, data: { kind: "const", label: "2", value: 2, dtype: "number" } } as any;
    const c3: Node = { id: "c3", type: "const", position: { x: 0, y: 0 }, data: { kind: "const", label: "3", value: 3, dtype: "number" } } as any;
    const add: Node = { id: "add", type: "operator", position: { x: 0, y: 0 }, data: { kind: "operator", opId: "add" } } as any;
    const out: Node = { id: "out", type: "output", position: { x: 0, y: 0 }, data: { kind: "output", label: "sum" } } as any;
    const e1: Edge = { id: "e1", source: "c2", target: "add" } as any;
    const e2: Edge = { id: "e2", source: "c3", target: "add" } as any;
    const e3: Edge = { id: "e3", source: "add", target: "out" } as any;

    // LR order
    const posLR = layoutPositions([c2, c3, add, out], [e1, e2, e3], "LR");
    console.assert((posLR.get("add")!.x > posLR.get("c2")!.x) && (posLR.get("out")!.x > posLR.get("add")!.x), "Layout LR order");

    // TB order
    const posTB = layoutPositions([c2, c3, add, out], [e1, e2, e3], "TB");
    console.assert((posTB.get("add")!.y > posTB.get("c2")!.y) && (posTB.get("out")!.y > posTB.get("add")!.y), "Layout TB order");

    // Handle positions update check
    const { source, target } = dirToPositions("TB");
    console.assert(source === Position.Bottom && target === Position.Top, "Handle positions TB");
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

  const runAutoLayout = useCallback((dir: LayoutDir = "LR") => {
    setLayoutDir(dir);
    const posCfg = dirToPositions(dir);
    setNodes((nds) => {
      const pos = layoutPositions(nds as Node[], edges as Edge[], dir);
      const next = (nds as Node[]).map((n) => ({
        ...n,
        position: pos.get(n.id) || n.position,
        sourcePosition: posCfg.source,
        targetPosition: posCfg.target,
        data: { ...n.data, layoutDir: dir },
      }));
      setEdges((eds) => eds.map((e) => ({ ...e, type: "smoothstep" })) as Edge[]);
      requestAnimationFrame(() => rf.fitView({ padding: 0.2, duration: 300 }));
      return next as any;
    });
  }, [edges, rf, setEdges, setNodes]);

  return (
    <div className={`relative grid  ${showPython ? "grid-cols-[18rem_1fr_32rem]" : "grid-cols-[18rem_1fr]"} gap-3`}>
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
          onClick={() => runAutoLayout("LR")}
          className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-sky-700"
          title="Arrange left→right"
        >
          Horizontal
        </button>
        <button
          type="button"
          onClick={() => runAutoLayout("TB")}
          className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-sky-700"
          title="Arrange top→bottom"
        >
          Vertical
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
          defaultEdgeOptions={defaultEdgeOptions}
          
        >
          <Background gap={20} size={1} />
          <MiniMap />
          <Controls />
        </ReactFlow>
      </div>

      {/* Python Panel */}
      {showPython && (
        <section className="flex min-h-0 shrink-0 flex-col overflow-auto rounded-xl border-r border-neutral-800/70 bg-neutral-950">
<div className="flex items-center justify-between border-b p-2">
<div className="text-xs font-semibold text-white/80">Generated Python</div>
<div className="mt-12 flex items-center gap-2">
<button onClick={copyPython} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow">Copy</button>
<button onClick={downloadPython} className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold text-white shadow">Download</button>
</div>
</div>
<div className="max-h-[calc(100vh-200px)] h-[calc(100vh-200px)] overflow-auto shrink-0 border-r border-neutral-800/70 bg-neutral-950 p-3">
<Highlight  theme={themes.nightOwl} code={python} language="python">
{({ className, style, tokens, getLineProps, getTokenProps }) => (
<pre className={`${className} m-0 rounded-lg p-4 text-[12px] leading-5`} style={{ ...style, background: "transparent" }}>
{tokens.map((line, i) => (
<div key={i} {...getLineProps({ line })}>
{line.map((token, key) => (
<span key={key} {...getTokenProps({ token })} />
))}
</div>
))}
</pre>
)}
</Highlight>
</div>
</section>
      )}
    </div>
  );
}

export default CanvasUI;



// n = 0
// while True:
//     n += 1
//     if n == 5:
//         continue            # skip printing 5
//     label = "even" if n % 2 == 0 else "odd"  # "A if cond else B" expression
//     print(f"{n} is {label}")
//     if n >= 10:
//         break 