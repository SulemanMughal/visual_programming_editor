"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import  {
    ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  Connection,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/**
 * NEXT.JS PAGE (app/visual-editor/page.tsx)
 * -------------------------------------------------
 * Visual Programming Editor (React Flow) with Python code generation.
 *
 * Features
 * - Drag blocks from a palette (Fields, Constants, Operators, Output) onto the canvas
 * - Type-checked ports (number/string/boolean/date/any)
 * - Live evaluation with cycle detection
 * - Output nodes display evaluated result
 * - Generate Python button emits a compute(row) function + helpers
 *
 * Setup
 *   npm i reactflow
 * Tailwind classes are used for styling; swap with your CSS if needed.
 */

// ------------------------- Types -------------------------
export type DType = "number" | "string" | "boolean" | "date" | "any";

export type Port = { id: string; dtype: DType; label?: string };
export type OperatorSpec = {
  id: string;
  label: string;
  inputs: Port[];
  output: Port; // out port
  eval: (args: Record<string, unknown>) => unknown;
  toJS?: (args: Record<string, string>) => string;
  toSQL?: (args: Record<string, string>) => string;
  toPy?: (args: Record<string, string>) => string; // Python expression generator
};

type FieldData = { kind: "field"; label: string; path: string; dtype: DType };
type ConstData = { kind: "const"; label: string; value: unknown; dtype: DType };
type OperatorData = { kind: "operator"; opId: string };
type OutputData = { kind: "output"; label: string; result?: unknown };

type NodeData = FieldData | ConstData | OperatorData | OutputData;

export type RFNode = {
  id: string;
  type: NodeData["kind"]; // "field" | "const" | "operator" | "output"
  position: { x: number; y: number };
  data: NodeData;
};

export type RFEdge = Edge & {
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
};

// ------------------- Operator Catalog --------------------
const OPS: Record<string, OperatorSpec> = {
  add: {
    id: "add",
    label: "Add",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => Number(a ?? 0) + Number(b ?? 0),
    toJS: ({ a, b }) => `(${a} + ${b})`,
    toSQL: ({ a, b }) => `(${a} + ${b})`,
    toPy: ({ a, b }) => `(${a} + ${b})`,
  },
  subtract: {
    id: "subtract",
    label: "Subtract",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => Number(a ?? 0) - Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} - ${b})`,
  },
  multiply: {
    id: "multiply",
    label: "Multiply",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => Number(a ?? 0) * Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} * ${b})`,
  },
  divide: {
    id: "divide",
    label: "Divide",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => {
      const denom = Number(b ?? 0);
      return denom === 0 ? null : Number(a ?? 0) / denom;
    },
    toPy: ({ a, b }) => `(${a} / ${b})`,
  },
  concat: {
    id: "concat",
    label: "Concat",
    inputs: [
      { id: "a", dtype: "string", label: "A" },
      { id: "b", dtype: "string", label: "B" },
    ],
    output: { id: "out", dtype: "string" },
    eval: ({ a, b }) => `${a ?? ""}${b ?? ""}`,
    toPy: ({ a, b }) => `(str(${a}) + str(${b}))`,
  },
  eq: {
    id: "eq",
    label: "Equals",
    inputs: [
      { id: "a", dtype: "any", label: "A" },
      { id: "b", dtype: "any", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => a === b,
    toPy: ({ a, b }) => `(${a} == ${b})`,
  },
  gt: {
    id: "gt",
    label: ">",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "boolean" },
    eval: ({ a, b }) => Number(a ?? 0) > Number(b ?? 0),
    toPy: ({ a, b }) => `(${a} > ${b})`,
  },
  if: {
    id: "if",
    label: "If",
    inputs: [
      { id: "cond", dtype: "boolean", label: "Cond" },
      { id: "t", dtype: "any", label: "Then" },
      { id: "f", dtype: "any", label: "Else" },
    ],
    output: { id: "out", dtype: "any" },
    eval: ({ cond, t, f }) => (cond ? t : f),
    toJS: ({ cond, t, f }) => `((${cond}) ? ${t} : ${f})`,
    toPy: ({ cond, t, f }) => `(${t} if ${cond} else ${f})`,
  },
};

// --------------- Sample schema / demo data ---------------
const sampleRecord = {
  id: 1,
  price: 99.99,
  quantity: 3,
  discount: 0.1,
  customer: {
    name: "Jane Doe",
    city: "Simi Valley",
    state: "CA",
  },
  created_at: "2025-01-15",
};

// --------------------- Utils: types ----------------------
function inferType(v: unknown): DType {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return "date"; // basic ISO date
    return "string";
  }
  return "any";
}

function flattenPaths(obj: any, base = ""): { path: string; dtype: DType }[] {
  const out: { path: string; dtype: DType }[] = [];
  if (!obj || typeof obj !== "object") return out;
  Object.entries(obj).forEach(([k, v]) => {
    const p = base ? `${base}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenPaths(v, p));
    } else {
      out.push({ path: p, dtype: inferType(v) });
    }
  });
  return out;
}

function getByPath(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => (acc ? (acc as any)[key] : undefined), obj);
}

// --------------------- Custom Nodes ----------------------
function PortBadge({ dtype }: { dtype: DType }) {
  return (
    <span className="ml-2 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
      {dtype}
    </span>
  );
}

function Card({ title, subtitle, children }: React.PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <div className="rounded-xl border bg-white px-3 py-2 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      {subtitle ? <div className="text-xs text-gray-600">{subtitle}</div> : null}
      <div className="pt-1 text-sm font-medium text-gray-800">{children}</div>
    </div>
  );
}

function FieldNode({ data }: { data: FieldData }) {
  return (
    <Card title="Field" subtitle={data.path}>
      <div className="flex items-center">
        {data.label}
        <PortBadge dtype={data.dtype} />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </Card>
  );
}

function ConstNode({ data }: { data: ConstData }) {
  const [local, setLocal] = useState<string>(() => String(data.value ?? ""));
  return (
    <Card title="Const">
      <div className="flex items-center gap-2">
        <input
          className="w-40 rounded-md border px-2 py-1 text-sm outline-none focus:ring"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            let parsed: unknown = local;
            if (data.dtype === "number") parsed = Number(local);
            if (data.dtype === "boolean") parsed = local === "true";
            (data as any).value = parsed; // write-through
          }}
          placeholder={`value (${data.dtype})`}
        />
        <PortBadge dtype={data.dtype} />
      </div>
      <Handle type="source" position={Position.Right} id="out" />
    </Card>
  );
}

function OperatorNode({ data }: { data: OperatorData }) {
  const spec = OPS[data.opId];
  return (
    <Card title="Operator" subtitle={spec.label}>
      <div className="grid grid-cols-2 gap-2">
        {spec.inputs.map((inp, i) => (
          <div key={inp.id} className="relative">
            <div className="mb-1 text-[10px] uppercase text-gray-400">{inp.label ?? inp.id}</div>
            <Handle type="target" position={Position.Left} id={inp.id} style={{ top: 10 + i * 24 }} />
            <div className="flex items-center text-xs text-gray-600">{inp.dtype}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-gray-500">out: {spec.output.dtype}</div>
      <Handle type="source" position={Position.Right} id="out" />
    </Card>
  );
}

function OutputNode({ data }: { data: OutputData }) {
  return (
    <Card title="Output" subtitle={data.label}>
      <div className="flex items-center gap-2">
        <span className="rounded bg-gray-100 px-2 py-1 text-sm text-gray-800">
          {typeof data.result === "object" ? JSON.stringify(data.result) : String(data.result ?? "—")}
        </span>
      </div>
      <Handle type="target" position={Position.Left} id="in" />
    </Card>
  );
}

const nodeTypes = {
  field: FieldNode,
  const: ConstNode,
  operator: OperatorNode,
  output: OutputNode,
};

// ---------------- Graph helpers (dtype + eval) -----------
let __id = 1;
const genId = () => String(__id++);

function outputDTypeForNode(n: RFNode): DType {
  switch (n.type) {
    case "field":
      return (n.data as FieldData).dtype;
    case "const":
      return (n.data as ConstData).dtype;
    case "operator": {
      const spec = OPS[(n.data as OperatorData).opId];
      return spec.output.dtype;
    }
    case "output":
      return "any";
  }
}

function inputDTypeForTarget(node: RFNode, targetHandle?: string): DType {
  if (node.type === "operator") {
    const spec = OPS[(node.data as OperatorData).opId];
    const port = spec.inputs.find((p) => p.id === targetHandle);
    return port?.dtype ?? "any";
  }
  if (node.type === "output") return "any";
  return "any";
}

function buildEdgeMaps(edges: RFEdge[]) {
  const byTarget: Record<string, RFEdge[]> = {};
  const bySource: Record<string, RFEdge[]> = {};
  edges.forEach((e) => {
    (byTarget[e.target] ||= []).push(e);
    (bySource[e.source] ||= []).push(e);
  });
  return { byTarget, bySource };
}

// -------- Runtime evaluation (for preview on canvas) -----
function evaluate(nodes: RFNode[], edges: RFEdge[], record: any) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n] as const));
  const { byTarget } = buildEdgeMaps(edges);
  const memo = new Map<string, unknown>();
  const visiting = new Set<string>();

  const compute = (nodeId: string): unknown => {
    if (memo.has(nodeId)) return memo.get(nodeId);
    if (visiting.has(nodeId)) throw new Error("Cycle detected");
    visiting.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return undefined;

    let value: unknown;
    switch (node.type) {
      case "field": {
        const d = node.data as FieldData;
        value = getByPath(record, d.path);
        break;
      }
      case "const": {
        value = (node.data as ConstData).value;
        break;
      }
      case "operator": {
        const spec = OPS[(node.data as OperatorData).opId];
        const incoming = byTarget[node.id] || [];
        const args: Record<string, unknown> = {};
        spec.inputs.forEach((inp) => {
          const edge = incoming.find((e) => e.targetHandle === inp.id);
          if (edge) args[inp.id] = compute(edge.source);
          else args[inp.id] = undefined;
        });
        try {
          value = spec.eval(args);
        } catch (err) {
          value = undefined;
        }
        break;
      }
      case "output": {
        const incoming = (byTarget[node.id] || [])[0];
        value = incoming ? compute(incoming.source) : undefined;
        break;
      }
    }

    visiting.delete(nodeId);
    memo.set(nodeId, value);
    return value;
  };

  nodes.forEach((n) => {
    try {
      compute(n.id);
    } catch (e) {
      /* cycle -> ignore */
    }
  });
  return memo;
}

// ------------------ Python code generation ----------------
function pyQuoteString(s: string) {
  // minimal escaping for Python single-quoted strings
  const str = String(s);
  const withBackslashes = str.split("\\").join("\\\\");
  const withQuotes = withBackslashes.split("'").join("\\'");
  return `'` + withQuotes + `'`;
}

function pyLiteral(val: any, dtype: DType): string {
  if (dtype === "number") return String(Number(val ?? 0));
  if (dtype === "boolean") return Boolean(val) ? "True" : "False";
  if (dtype === "date") return `date.fromisoformat(${pyQuoteString(String(val ?? ""))})`;
  if (dtype === "string") return pyQuoteString(String(val ?? ""));
  return "None"; // any / unknown
}

function fieldExpr(path: string): string {
  return `get_nested(row, ${pyQuoteString(path)})`;
}

function emitPyExpr(targetId: string, nodes: RFNode[], edges: RFEdge[], memo = new Map<string, string>(), visiting = new Set<string>()): string {
  if (memo.has(targetId)) return memo.get(targetId)!;
  if (visiting.has(targetId)) throw new Error("Cycle detected in codegen");
  visiting.add(targetId);

  const node = nodes.find((n) => n.id === targetId);
  if (!node) return "None";

  let expr = "None";
  if (node.type === "field") {
    const d = node.data as FieldData;
    expr = fieldExpr(d.path);
  } else if (node.type === "const") {
    const d = node.data as ConstData;
    expr = pyLiteral(d.value, d.dtype);
  } else if (node.type === "operator") {
    const d = node.data as OperatorData;
    const spec = OPS[d.opId];
    const incoming = edges.filter((e) => e.target === node.id);
    const args: Record<string, string> = {};
    spec.inputs.forEach((inp) => {
      const edge = incoming.find((e) => e.targetHandle === inp.id);
      args[inp.id] = edge ? emitPyExpr(edge.source, nodes, edges, memo, visiting) : "None";
    });
    if (spec.toPy) expr = spec.toPy(args);
    else expr = "None";
  } else if (node.type === "output") {
    const incoming = edges.find((e) => e.target === node.id);
    expr = incoming ? emitPyExpr(incoming.source, nodes, edges, memo, visiting) : "None";
  }

  visiting.delete(targetId);
  memo.set(targetId, expr);
  return expr;
}

function generatePythonProgram(nodes: RFNode[], edges: RFEdge[]) {
  const outputs = nodes.filter((n) => n.type === "output");
  const imports = "from datetime import date, datetime\n\n";
  const helper =
    "def get_nested(row, path):\n" +
    "    cur = row\n" +
    "    for key in path.split('.'):\n" +
    "        if not isinstance(cur, dict):\n" +
    "            return None\n" +
    "        cur = cur.get(key)\n" +
    "    return cur\n\n";

  if (outputs.length === 0) {
    return (
      imports +
      helper +
      "def compute(row):\n" +
      "    # No Output nodes present in the graph.\n" +
      "    return {}\n"
    );
  }

  const lines: string[] = [];
  lines.push("def compute(row):");
  lines.push("    return {");
  outputs.forEach((o, idx) => {
    const label = (o.data as OutputData).label || `output_${idx + 1}`;
    const expr = emitPyExpr(o.id, nodes, edges);
    lines.push(`        ${pyQuoteString(label)}: ${expr},`);
  });
  lines.push("    }");

  return imports + helper + lines.join("\n") + "\n";
}

// --------------------- DnD Palette UI --------------------
function PaletteItem({ type, label, payload }: { type: RFNode["type"]; label: string; payload: any }) {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify({ type, payload }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-move select-none rounded-lg border  text-black px-3 py-2 text-sm shadow-sm hover:bg-gray-50"
    >
      {label}
    </div>
  );
}

// ----------------------- Canvas --------------------------
function Canvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const [pythonCode, setPythonCode] = useState<string>("");
  const [showCode, setShowCode] = useState<boolean>(false);

  const fields = useMemo(() => flattenPaths(sampleRecord), []);

  // Live evaluation on changes
  useEffect(() => {
    const results = evaluate(nodes, edges, sampleRecord);
    setNodes((nds) =>
      nds.map((n) =>
        n.type === "output"
          ? ({ ...n, data: { ...(n.data as OutputData), result: results.get(n.id) } as OutputData })
          : n
      )
    );
  }, [nodes.map((n) => ({ id: n.id, type: n.type, data: n.data })).join("|"), edges.map((e) => e.id).join("|")]);

  const isValidConnection = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return false;
      const src = nodes.find((n) => n.id === conn.source);
      const tgt = nodes.find((n) => n.id === conn.target);
      if (!src || !tgt) return false;
      if (src.id === tgt.id) return false; // no self
      if (tgt.type === "field" || tgt.type === "const") return false;

      const srcOut = outputDTypeForNode(src);
      const tgtIn = inputDTypeForTarget(tgt, conn.targetHandle ?? undefined);
      if (tgtIn === "any" || srcOut === "any") return true;
      return srcOut === tgtIn;
    },
    [nodes]
  );

  const onConnect = useCallback((params: Edge | Connection) => setEdges((eds) => addEdge({ ...params, animated: true } as Edge, eds)), []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = wrapperRef.current?.getBoundingClientRect();
    const raw = e.dataTransfer.getData("application/reactflow");
    if (!rect || !raw) return;

    const { type, payload } = JSON.parse(raw) as { type: RFNode["type"]; payload: any };
    const position = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    let node: RFNode;
    if (type === "field") {
      node = {
        id: genId(),
        type: "field",
        position,
        data: { kind: "field", label: payload.name ?? payload.path, path: payload.path, dtype: payload.dtype } as FieldData,
      };
    } else if (type === "const") {
      node = {
        id: genId(),
        type: "const",
        position,
        data: { kind: "const", label: "Const", value: payload?.value ?? "", dtype: payload?.dtype ?? "string" } as ConstData,
      };
    } else if (type === "operator") {
      node = {
        id: genId(),
        type: "operator",
        position,
        data: { kind: "operator", opId: payload.opId } as OperatorData,
      };
    } else {
      node = {
        id: genId(),
        type: "output",
        position,
        data: { kind: "output", label: payload?.label ?? "Result" } as OutputData,
      };
    }

    setNodes((nds) => nds.concat(node));
  };

  const doGeneratePython = () => {
    const code = generatePythonProgram(nodes, edges);
    setPythonCode(code);
    setShowCode(true);
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(pythonCode);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex h-[70vh] gap-3">
        {/* Palette */}
        <div className="w-72 shrink-0 space-y-3 rounded-xl border bg-gray-50 p-3">
          <div className="text-xs font-semibold text-gray-700">Fields</div>
          <div className="flex max-h-56 flex-col gap-2 overflow-auto pr-1">
            {fields.map((f) => (
              <PaletteItem key={f.path} type="field" label={`Field: ${f.path}`} payload={{ path: f.path, dtype: f.dtype }} />
            ))}
          </div>

          <div className="pt-2 text-xs font-semibold text-gray-700">Constants</div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Number", dtype: "number", value: 0 },
              { label: "String", dtype: "string", value: "" },
              { label: "Boolean true", dtype: "boolean", value: true },
              { label: "Boolean false", dtype: "boolean", value: false },
            ].map((c) => (
              <PaletteItem key={c.label} type="const" label={c.label} payload={c} />
            ))}
          </div>

          <div className="pt-2 text-xs font-semibold text-gray-700">Operators</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(OPS).map((op) => (
              <PaletteItem key={op.id} type="operator" label={op.label} payload={{ opId: op.id }} />
            ))}
          </div>

          <div className="pt-2 text-xs font-semibold text-gray-700">Sinks</div>
          <PaletteItem type="output" label="Output" payload={{ label: "Result" }} />
        </div>

        {/* Canvas */}
        <div ref={wrapperRef} className="relative grow overflow-hidden rounded-xl border" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            nodeTypes={nodeTypes as any}
            fitView
          >
            <Background />
            <MiniMap />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {/* Codegen actions */}
      <div className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
        <div className="text-sm text-gray-700">Generate Python from current graph.</div>
        <div className="flex gap-2">
          <button onClick={doGeneratePython} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">Generate Python</button>
          <button onClick={copyCode} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">Copy</button>
          <button onClick={() => setShowCode((s) => !s)} className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50">{showCode ? "Hide" : "Show"}</button>
        </div>
      </div>

      {showCode && (
        <pre className="max-h-72 overflow-auto rounded-xl border bg-gray-50 p-3 text-xs leading-5">
{pythonCode}
        </pre>
      )}
    </div>
  );
}

// ------------------------ Page ---------------------------
export default function Page() {
  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Visual Programming Editor (React Flow) — Python Codegen</h1>
        <div className="text-xs text-gray-500">Drag from the left, connect nodes, then click <span className="font-medium">Generate Python</span>.</div>
      </div>
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </div>
  );
}
