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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  // flattenPaths,
//   getByPath,
//   buildEdgeMaps,
  generatePythonProgram,
  genId,
  outputDTypeForNode,
  inputDTypeForTarget,
  evaluate
} from "@/app/components/dashboard/utils";


import FieldNodeUI from "@/app/components/dashboard/nodes/FieldNodeUI"

import ConstNode from "@/app/components/dashboard/nodes/ConstNode"

import OperatorNode from "@/app/components/dashboard/nodes/OperatorNode"

import OutputNode from "@/app/components/dashboard/nodes/OutputNode"

import Sidebar from "@/app/components/dashboard/Sidebar";
import type { Node,  } from "@xyflow/react";

function CanvasUI() {
  const { screenToFlowPosition } = useReactFlow();
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [python, setPython] = useState("");
  const [showPython, setShowPython] = useState(true);

  const nodeTypes = { field: FieldNodeUI, const: ConstNode, operator: OperatorNode, output: OutputNode };

  useEffect(() => { setPython(generatePythonProgram(nodes, edges)); }, [nodes, edges]);
  useEffect(() => {
    const results = evaluate(nodes, edges, {});
    let changed = false;
    const nextNodes = nodes.map((n) => {
      if (n.type !== "output") return n;
      const next = results.get(n.id);
      const equal = typeof next === "object" ? JSON.stringify(n.data.result) === JSON.stringify(next) : Object.is(n.data.result, next);
      if (equal) return n; changed = true; return { ...n, data: { ...n.data, result: next } };
    });
    if (changed) setNodes(nextNodes);
  }, [nodes, edges]);

  // --- tests ---
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
    // Minimal smoke + a couple of correctness checks
    const code = generatePythonProgram([], []);
    console.assert(code.includes("def compute(row):"), "Smoke: compute signature");

    const c2 = { id: "c2", type: "const", position: { x: 0, y: 0 }, data: { kind: "const", label: "2", value: 2, dtype: "number" } };
    const c3 = { id: "c3", type: "const", position: { x: 0, y: 0 }, data: { kind: "const", label: "3", value: 3, dtype: "number" } };
    const op = { id: "op", type: "operator", position: { x: 0, y: 0 }, data: { kind: "operator", opId: "add" } };
    const out = { id: "out", type: "output", position: { x: 0, y: 0 }, data: { kind: "output", label: "sum" } };
    const e1 = { id: "e1", source: "c2", target: "op", targetHandle: "a" };
    const e2 = { id: "e2", source: "c3", target: "op", targetHandle: "b" };
    const e3 = { id: "e3", source: "op", target: "out", targetHandle: "in" };
    const codeAdd = generatePythonProgram([c2, c3, op, out], [e1, e2, e3]);
    console.assert(codeAdd.includes("'sum': (2 + 3),"), "Add codegen");
  }, []);

  const isValidConnection = useCallback(/** @param {Connection} c */ (c) => {
    if (!c.source || !c.target) return false; if (c.source === c.target) return false;
    const src = nodes.find((n) => n.id === c.source); const tgt = nodes.find((n) => n.id === c.target);
    if (!src || !tgt) return false; if (tgt.type === "field" || tgt.type === "const") return false;
    const s = outputDTypeForNode(src); const t = inputDTypeForTarget(tgt, c.targetHandle ?? undefined);
    return s === "any" || t === "any" || s === t;
  }, [nodes]);

  const onConnect = useCallback((p /** @type {Edge|Connection} */) => setEdges((eds) => addEdge({ ...p, animated: true }, eds)), []);
  const onDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (e) => {
    e.preventDefault(); const raw = e.dataTransfer.getData("application/reactflow"); if (!raw) return;
    const { type, payload } = JSON.parse(raw);
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    let node;
    if (type === "field") node = { id: genId(), type: "field", position, data: { kind: "field", label: payload.path, path: payload.path, dtype: payload.dtype } };
    else if (type === "const") node = { id: genId(), type: "const", position, data: { kind: "const", label: "Const", value: payload?.value ?? "", dtype: payload?.dtype ?? "string" } };
    else if (type === "operator") node = { id: genId(), type: "operator", position, data: { kind: "operator", opId: payload.opId } };
    else node = { id: genId(), type: "output", position, data: { kind: "output", label: payload?.label ?? "Result" } };
    setNodes((nds) => nds.concat(node));
  };

  const copyPython = async () => { try { await navigator.clipboard.writeText(python); } catch {} };
  const downloadPython = () => { const blob = new Blob([python], { type: "text/x-python" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "compute.py"; a.click(); URL.revokeObjectURL(url); };

  return (
    <div className={`relative grid h-[85vh] ${showPython ? "grid-cols-[18rem_1fr_32rem]" : "grid-cols-[18rem_1fr]"} gap-3`}>
      <button
        type="button"
        onClick={() => setShowPython((s) => !s)}
        aria-pressed={showPython}
        aria-label={showPython ? "Hide Generated Python panel" : "Show Generated Python panel"}
        className="absolute right-3 top-3 z-10 rounded-full bg-neutral-500 text-white px-3 py-1 text-xs shadow "
      >
        {showPython ? "Hide Code" : "Show Code"}
      </button>



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
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl shrink-0 border-r border-neutral-800/70 bg-neutral-950">
          <div className="flex items-center justify-between border-b p-2">
            <div className="text-xs font-semibold">Generated Python</div>
            <div className="flex items-center gap-2 mt-12">
              <button onClick={copyPython} className="rounded-lg border bg-neutral-500 text-white px-2 py-1 text-xs shadow">Copy</button>
              <button onClick={downloadPython} className="rounded-lg border bg-neutral-500 text-white px-2 py-1 text-xs shadow">Download</button>
            </div>
          </div>
          <textarea className="flex-1 resize-none bg-transparent p-3 font-mono text-[12px] leading-5" value={python} readOnly />
        </section>
      )}
    </div>
  );
}

export default CanvasUI;