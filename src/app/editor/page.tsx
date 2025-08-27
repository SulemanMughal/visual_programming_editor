"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/**
 * Visual Programming Editor — Prominent, self‑explanatory node UI
 * - Clean card layout for nodes with bold headers & dtype pills
 * - Precisely centered handles per input row
 * - Python code generation with a toggleable side panel
 * - Loop/list ops: Range, Sum, Map +, Map ×, Length
 */

/** @typedef {"number"|"string"|"boolean"|"date"|"list"|"any"} DType */
/** @typedef {{id:string,dtype:DType,label?:string}} Port */
/** @typedef {{id:string,label:string,inputs:Port[],output:Port,eval:(args:any)=>any,toPy?:(args:any)=>string}} OperatorSpec */

/** @type {Record<string, OperatorSpec>} */
const OPS = {
  add: {
    id: "add",
    label: "Add",
    inputs: [
      { id: "a", dtype: "number", label: "A" },
      { id: "b", dtype: "number", label: "B" },
    ],
    output: { id: "out", dtype: "number" },
    eval: ({ a, b }) => Number(a ?? 0) + Number(b ?? 0),
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
      const d = Number(b ?? 0);
      return d === 0 ? null : Number(a ?? 0) / d;
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
    toPy: ({ cond, t, f }) => `(${t} if ${cond} else ${f})`,
  },
  // Loop/List ops
  range: {
    id: "range",
    label: "Range",
    inputs: [
      { id: "start", dtype: "number", label: "Start" },
      { id: "stop", dtype: "number", label: "Stop" },
      { id: "step", dtype: "number", label: "Step" },
    ],
    output: { id: "out", dtype: "list" },
    eval: ({ start, stop, step }) => {
      const s = Number(start ?? 0), e = Number(stop ?? 0), st = Number(step ?? 1);
      if (!Number.isFinite(s) || !Number.isFinite(e) || !Number.isFinite(st) || st === 0) return [];
      const dir = st > 0 ? 1 : -1;
      const arr = [];
      for (let i = s; dir > 0 ? i < e : i > e; i += st) arr.push(i);
      return arr;
    },
    toPy: ({ start, stop, step }) => `list(range(${start}, ${stop}, ${step}))`,
  },
  sum_list: {
    id: "sum_list",
    label: "Sum",
    inputs: [{ id: "list", dtype: "list", label: "List" }],
    output: { id: "out", dtype: "number" },
    eval: ({ list }) => (Array.isArray(list) ? list.reduce((a, v) => a + Number(v ?? 0), 0) : 0),
    toPy: ({ list }) => `sum(${list})`,
  },
  map_add: {
    id: "map_add",
    label: "Map +",
    inputs: [
      { id: "list", dtype: "list", label: "List" },
      { id: "add", dtype: "number", label: "+" },
    ],
    output: { id: "out", dtype: "list" },
    eval: ({ list, add }) => (Array.isArray(list) ? list.map((x) => Number(x ?? 0) + Number(add ?? 0)) : []),
    toPy: ({ list, add }) => `[ (x + ${add}) for x in ${list} ]`,
  },
  map_mul: {
    id: "map_mul",
    label: "Map ×",
    inputs: [
      { id: "list", dtype: "list", label: "List" },
      { id: "mul", dtype: "number", label: "×" },
    ],
    output: { id: "out", dtype: "list" },
    eval: ({ list, mul }) => (Array.isArray(list) ? list.map((x) => Number(x ?? 0) * Number(mul ?? 1)) : []),
    toPy: ({ list, mul }) => `[ (x * ${mul}) for x in ${list} ]`,
  },
  length: {
    id: "length",
    label: "Length",
    inputs: [{ id: "list", dtype: "list", label: "List" }],
    output: { id: "out", dtype: "number" },
    eval: ({ list }) => (Array.isArray(list) ? list.length : 0),
    toPy: ({ list }) => `len(${list})`,
  },
};

// Help text per operator (for the info popover)
const OP_HELP = {
  add: "Add A + B (numbers).",
  subtract: "Subtract A − B.",
  multiply: "Multiply A × B.",
  divide: "Divide A ÷ B. Returns null when B is 0.",
  concat: "Concatenate strings A and B.",
  eq: "True if A equals B (strict equality).",
  gt: "True if A > B.",
  if: "If Cond then Then else Else.",
  range: "List of numbers from Start to Stop (exclusive) stepping by Step.",
  sum_list: "Sum of all numbers in List.",
  map_add: "Add constant (+) to each element of List.",
  map_mul: "Multiply each element of List by ×.",
  length: "Number of elements in List.",
};

// Demo record used by Field palette & evaluation
const sampleRecord = {
  id: 1,
  price: 99.99,
  quantity: 3,
  discount: 0.1,
  customer: { name: "Jane Doe", city: "Simi Valley", state: "CA" },
  created_at: "2025-01-15",
};

// ---------- Utils ----------
function inferType(v) {
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "string") {
    const s = String(v);
    if (s.length === 10 && s[4] === "-" && s[7] === "-") return "date";
    return "string";
  }
  if (Array.isArray(v)) return "list";
  return "any";
}

function flattenPaths(obj, base = "") {
  const out = [];
  if (!obj || typeof obj !== "object") return out;
  Object.entries(obj).forEach(([k, v]) => {
    const p = base ? `${base}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) out.push(...flattenPaths(v, p));
    else out.push({ path: p, dtype: inferType(v) });
  });
  return out;
}

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

// ---------- Python codegen ----------
function pyQuote(s) { return `'${String(s).split("'").join("’")}'`; }
function pyLiteral(dtype, v) {
  if (v === null || v === undefined) return "None";
  if (dtype === "number" && typeof v === "number") return String(v);
  if (dtype === "boolean") return v ? "True" : "False";
  if (dtype === "list" && Array.isArray(v)) return "[" + v.map((x) => String(x)).join(", ") + "]";
  return pyQuote(String(v));
}
function buildEdgeMaps(edges) {
  const byTarget = {}, bySource = {};
  edges.forEach((e) => { (byTarget[e.target] ||= []).push(e); (bySource[e.source] ||= []).push(e); });
  return { byTarget, bySource };
}
function generatePythonProgram(nodes, edges) {
  const header = [
    "from datetime import date, datetime",
    "",
    "def get_nested(row, path):",
    "    cur = row",
    "    for key in path.split('.'):",
    "        if not isinstance(cur, dict):",
    "            return None",
    "        cur = cur.get(key)",
    "    return cur",
    "",
  ].join("\n");

  const { byTarget } = buildEdgeMaps(edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visiting = new Set();
  const memoExpr = new Map();

  const exprOf = (nodeId) => {
    if (memoExpr.has(nodeId)) return memoExpr.get(nodeId);
    if (visiting.has(nodeId)) return "None  # cycle";
    visiting.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return "None";

    let expr = "None";
    switch (node.type) {
      case "field": {
        const d = node.data; expr = `get_nested(row, ${pyQuote(d.path)})`; break;
      }
      case "const": {
        const d = node.data; expr = pyLiteral(d.dtype, d.value); break;
      }
      case "operator": {
        const d = node.data; const spec = OPS[d.opId]; if (!spec) { expr = "None"; break; }
        const incoming = byTarget[node.id] || []; const argExpr = {};
        spec.inputs.forEach((inp) => { const edge = incoming.find((e) => e.targetHandle === inp.id); argExpr[inp.id] = edge ? exprOf(edge.source) : "None"; });
        expr = spec.toPy ? spec.toPy(argExpr) : "None"; break;
      }
      case "output": {
        const incoming = (byTarget[node.id] || [])[0]; expr = incoming ? exprOf(incoming.source) : "None"; break;
      }
      default: expr = "None";
    }
    visiting.delete(nodeId); memoExpr.set(nodeId, expr); return expr;
  };

  const outputs = nodes.filter((n) => n.type === "output");
  if (outputs.length === 0) {
    return header + [
      "def compute(row):",
      "    # No outputs; add an Output node and connect it.",
      "    return {}",
      "",
    ].join("\n");
  }

  const body = ["def compute(row):", "    return {"];
  outputs.forEach((n, i) => { const label = n.data.label || `result_${i + 1}`; body.push(`        ${pyQuote(label)}: ${exprOf(n.id)},`); });
  body.push("    }");
  return header + "\n" + body.join("\n") + "\n";
}

// ---------- Node UI ----------
const pill = (text) => (
  <span className="rounded-full border-2 border-sky-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">{text}</span>
);
const handleDot = { width: 16, height: 16, borderRadius: 9999, border: "3px solid white", background: "#0ea5e9", boxShadow: "0 0 0 2px #0ea5e966" };

function InfoButton({ text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current) return;
      if (!open) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Show operator help"
        className="grid h-6 w-6 place-items-center rounded-full border-2 border-sky-300 bg-white text-[11px] font-bold text-sky-700 shadow-sm"
      >
        i
      </button>
      {open && (
        <div role="tooltip" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border bg-white p-3 text-xs leading-5 text-gray-700 shadow-xl">
          {text}
        </div>
      )}
    </div>
  );
}

function CardShell({ title, rightSlot, children }) {
  return (
    <div className="relative min-w-[380px] rounded-[28px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">{title}</div>
        <div className="flex items-center gap-2">{rightSlot}</div>
      </div>
      {children}
    </div>
  );
}

function FieldNode({ data }) {
  return (
    <div className="relative min-w-[320px] rounded-[24px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">FIELD</div>
        {pill(String(data.dtype).toUpperCase())}
      </div>
      <div className="mt-2 text-lg font-semibold text-gray-800">{data.label}</div>
      <div className="text-xs text-gray-500">{data.path}</div>
      <Handle type="source" position={Position.Right} id="out" style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }} />
    </div>
  );
}

function ConstNode({ data }) {
  const [local, setLocal] = useState(() => String(data.value ?? ""));
  return (
    <div className="relative min-w-[320px] rounded-[24px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">CONST</div>
        {pill(String(data.dtype).toUpperCase())}
      </div>
      <div className="mt-3">
        <input
          className="w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-inner outline-none focus:ring"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => {
            let parsed = local;
            if (data.dtype === "number") parsed = Number(local);
            if (data.dtype === "boolean") parsed = local === "true";
            if (data.dtype === "list") { try { parsed = JSON.parse(local); } catch { parsed = []; } if (!Array.isArray(parsed)) parsed = []; }
            data.value = parsed;
          }}
          placeholder={`value (${data.dtype})`}
        />
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }} />
    </div>
  );
}

function OperatorNode({ data }) {
  const spec = OPS[data.opId];
  if (!spec) {
    return (
      <div className="relative min-w-[320px] rounded-[24px] border border-rose-300 bg-rose-50 p-4 shadow">
        <div className="text-xs font-extrabold tracking-[0.2em] text-rose-600">OPERATOR</div>
        <div className="mt-1 text-base font-semibold text-rose-700">Unknown operator: {String(data.opId)}</div>
        <div className="text-xs text-rose-600/80">Delete this node and drag a valid one from the palette.</div>
      </div>
    );
  }

  const helpText = OP_HELP[spec.id] || "No help description available.";

  return (
    <CardShell
      title="OPERATOR"
      rightSlot={<div className="flex items-center gap-2">{pill(String(spec.output.dtype).toUpperCase())}<InfoButton text={helpText} /></div>}
    >
      <div className="mt-1 text-lg font-semibold text-gray-800">{spec.label}</div>
      <div className="mt-3 space-y-3">
        {spec.inputs.map((inp) => (
          <div key={inp.id} className="relative flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow">
            <div className="text-base font-medium text-gray-700">{inp.label ?? inp.id}</div>
            {pill(String(inp.dtype).toUpperCase())}
            <Handle type="target" position={Position.Left} id={inp.id} style={{ ...handleDot, left: -8, top: "50%", transform: "translateY(-50%)" }} />
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }} />
    </CardShell>
  );
}

function OutputNode({ data }) {
  return (
    <CardShell title="OUTPUT" rightSlot={pill("ANY")} >
      <div className="mt-1 text-lg font-semibold text-gray-800">{data.label}</div>
      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-inner">
        {typeof data.result === "object" ? JSON.stringify(data.result) : String(data.result ?? "—")}
      </div>
      <Handle type="target" position={Position.Left} id="in" style={{ ...handleDot, left: -8, top: "50%", transform: "translateY(-50%)" }} />
    </CardShell>
  );
}

const nodeTypes = { field: FieldNode, const: ConstNode, operator: OperatorNode, output: OutputNode };

// ---------- DnD Palette ----------
function PaletteItem({ type, label, payload }) {
  const onDragStart = (e) => { e.dataTransfer.setData("application/reactflow", JSON.stringify({ type, payload })); e.dataTransfer.effectAllowed = "move"; };
  return (
    <div draggable onDragStart={onDragStart} className="cursor-move select-none rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50">{label}</div>
  );
}

// ---------- Graph helpers ----------
let __id = 1; const genId = () => String(__id++);
function outputDTypeForNode(n) { return n.type === "operator" ? OPS[n.data.opId]?.output?.dtype ?? "any" : (n.data?.dtype ?? "any"); }
function inputDTypeForTarget(node, targetHandle) {
  if (node.type === "operator") { const spec = OPS[node.data.opId]; const port = spec?.inputs?.find((p) => p.id === targetHandle); return port?.dtype ?? "any"; }
  return "any";
}

function evaluate(nodes, edges, record) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const { byTarget } = buildEdgeMaps(edges);
  const memo = new Map();
  const visiting = new Set();
  const compute = (id) => {
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) throw new Error("Cycle detected");
    visiting.add(id);
    const node = nodeMap.get(id); if (!node) return undefined;
    let value;
    switch (node.type) {
      case "field": value = getByPath(record, node.data.path); break;
      case "const": value = node.data.value; break;
      case "operator": {
        const spec = OPS[node.data.opId]; if (!spec) { value = undefined; break; }
        const incoming = byTarget[node.id] || []; const args = {};
        spec.inputs.forEach((inp) => { const e = incoming.find((x) => x.targetHandle === inp.id); args[inp.id] = e ? compute(e.source) : undefined; });
        try { value = spec.eval(args); } catch { value = undefined; }
        break;
      }
      case "output": { const inc = (byTarget[node.id] || [])[0]; value = inc ? compute(inc.source) : undefined; break; }
      default: value = undefined;
    }
    visiting.delete(id); memo.set(id, value); return value;
  };
  nodes.forEach((n) => { try { compute(n.id); } catch {} });
  return memo;
}

// ---------- Canvas ----------
function Canvas() {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [python, setPython] = useState("");
  const [showPython, setShowPython] = useState(true);
  const fields = useMemo(() => flattenPaths(sampleRecord), []);

  useEffect(() => { setPython(generatePythonProgram(nodes, edges)); }, [nodes, edges]);
  useEffect(() => {
    const results = evaluate(nodes, edges, sampleRecord);
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
        className="absolute right-3 top-3 z-10 rounded-full border border-gray-300 bg-white/90 px-3 py-1 text-xs shadow hover:bg-white"
      >
        {showPython ? "Hide Code" : "Show Code"}
      </button>

      {/* Palette */}
      <aside className="w-72 shrink-0 space-y-3 rounded-xl border bg-gray-50 p-3">
        <div className="text-xs font-semibold text-gray-700">Fields</div>
        <div className="flex max-h-60 flex-col gap-2 overflow-auto pr-1">
          {useMemo(() => flattenPaths(sampleRecord), []).map((f) => (
            <PaletteItem key={f.path} type="field" label={`Field: ${f.path}`} payload={{ path: f.path, dtype: f.dtype }} />
          ))}
        </div>
        <div className="pt-2 text-xs font-semibold text-gray-700">Constants</div>
        <div className="grid grid-cols-2 gap-2">
          {[{ label: "Number", dtype: "number", value: 0 }, { label: "String", dtype: "string", value: "" }, { label: "True", dtype: "boolean", value: true }, { label: "False", dtype: "boolean", value: false }].map((c) => (
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
      </aside>

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
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-gray-50">
          <div className="flex items-center justify-between border-b p-2">
            <div className="text-xs font-semibold">Generated Python</div>
            <div className="flex items-center gap-2">
              <button onClick={copyPython} className="rounded-lg border bg-white px-2 py-1 text-xs shadow">Copy</button>
              <button onClick={downloadPython} className="rounded-lg border bg-white px-2 py-1 text-xs shadow">Download</button>
            </div>
          </div>
          <textarea className="flex-1 resize-none bg-transparent p-3 font-mono text-[12px] leading-5" value={python} readOnly />
        </section>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <div className="p-4">
      <ReactFlowProvider>
        <Canvas />
      </ReactFlowProvider>
    </div>
  );
}
