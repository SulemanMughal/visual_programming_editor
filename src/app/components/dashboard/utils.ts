// -----------------------
// Json File Handlers
// -----------------------

import {
  ALL_OPERATORS
} from "./constants"


export type WhileExprRole = "exec" | "cond" | "cont" | "brk";
export type WhileExprRow  = { id: string; role: WhileExprRole; label?: string };


interface OperatorInput {
  id: string;
  dtype?: "number" | "boolean" | "date" | "string" | "list" | "any";
}

interface OperatorSpec {
  inputs: OperatorInput[];
  toPy?: (args: unknown) => string;
  output?: {
    dtype: "number" | "boolean" | "date" | "string" | "list" | "any";
  };
  // Optionally allow more specific signatures for toPy
  // toPy?: (...args: any[]) => string;
}

interface OpsMap {
  [opId: string]: OperatorSpec;
}

// You may need to import or define OPS elsewhere in your codebase
// declare const OPS: OpsMap;
const OPS: OpsMap = ALL_OPERATORS as Record<string, OperatorSpec>;

// OPS = ALL_OPERATORS as Record<string, OperatorSpec>;

function isObjectLike(v: unknown) {
  return (
    v !== null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.keys(v as object).length > 0
  );
}

function hasDeepKeyMatch(v: unknown, term: string): boolean {
  if (!term) return true;
  const t = term.toLowerCase();
  if (isObjectLike(v)) {
    for (const [k, val] of Object.entries(v as object)) {
      if (String(k).toLowerCase().includes(t)) return true;
      if (hasDeepKeyMatch(val as unknown, term)) return true;
    }
  } else if (Array.isArray(v)) {
    for (const item of v) {
      if (hasDeepKeyMatch(item, term)) return true;
    }
  }
  return false;
}

function valueTypeLabel(v: unknown): string {
  if (Array.isArray(v)) return `array(${(v as unknown[]).length})`;
  if (isObjectLike(v)) return "object";
  if (v === null) return "null";
  return typeof v;
}

// ------------------------
// Node UI Handlers
// ------------------------

function inferType(
  v: unknown
): "number" | "boolean" | "date" | "string" | "list" | "any" {
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

export interface FlattenedPath {
  path: string;
  dtype: ReturnType<typeof inferType>;
}

interface FlattenedObject {
  [key: string]: unknown;
}

interface FlattenedPathResult {
  path: string;
  dtype: ReturnType<typeof inferType>;
}

function flattenPaths(
  obj: FlattenedObject | null | undefined,
  base: string = ""
): FlattenedPathResult[] {
  const out: FlattenedPathResult[] = [];
  if (!obj || typeof obj !== "object") return out;
  Object.entries(obj).forEach(([k, v]) => {
    const p = base ? `${base}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out.push(...flattenPaths(v as FlattenedObject, p));
    } else {
      out.push({ path: p, dtype: inferType(v) });
    }
  });
  return out;
}

interface GetByPathObject {
  [key: string]: unknown;
}

function getByPath(
  obj: GetByPathObject | null | undefined,
  path: string
): unknown {
  return path.split(".").reduce((acc: unknown, key: string) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as GetByPathObject)[key];
    }
    return undefined;
  }, obj);
}



// ---------- Python codegen ----------
interface PyQuote {
  (s: string): string;
}

const pyQuote: PyQuote = function (s: string): string {
  return `'${String(s).split("'").join("’")}'`;
};
interface PyLiteral {
  (
    dtype: "number" | "boolean" | "date" | "string" | "list" | "any",
    v: unknown
  ): string;
}

const pyLiteral: PyLiteral = function (dtype, v) {
  if (v === null || v === undefined) return "None";
  if (dtype === "number" && typeof v === "number") return String(v);
  if (dtype === "boolean") return v ? "True" : "False";
  if (dtype === "list" && Array.isArray(v))
    return "[" + v.map((x) => String(x)).join(", ") + "]";
  return pyQuote(String(v));
};
interface Edge {
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  [key: string]: unknown;
}

interface EdgeMaps {
  byTarget: Record<string, Edge[]>;
  bySource: Record<string, Edge[]>;
}

function buildEdgeMaps(edges: Edge[]): EdgeMaps {
  const byTarget: Record<string, Edge[]> = {};
  const bySource: Record<string, Edge[]> = {};
  edges.forEach((e) => {
    (byTarget[e.target] ||= []).push(e);
    (bySource[e.source] ||= []).push(e);
  });
  return { byTarget, bySource };
}
interface NodeDataField {
  path: string;
}

interface NodeDataConst {
  dtype: "number" | "boolean" | "date" | "string" | "list" | "any";
  value: unknown;
}

interface NodeDataOperator {
  opId: string;
}

interface NodeDataOutput {
  label?: string;
}

type NodeType = "field" | "const" | "operator" | "output";

interface Node {
  id: string;
  type: NodeType;
  data: NodeDataField | NodeDataConst | NodeDataOperator | NodeDataOutput;
}

// function generatePythonProgram(nodes: Node[], edges: Edge[]): string {
//   const { byTarget } = buildEdgeMaps(edges);
//   const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

//   const header = [""].join("\n");

//   // ----- handle-aware expr resolver: exprOf(nodeId, sourceHandle?) -----
//   const keyOf = (id: string, sh?: string | null) => `${id}::${sh ?? "__"}`;
//   const visiting = new Set<string>();
//   const memo = new Map<string, string>();

//   const exprOf = (nodeId: string, sourceHandle?: string | null): string => {
//     const k = keyOf(nodeId, sourceHandle);
//     if (memo.has(k)) return memo.get(k)!;
//     if (visiting.has(k)) return "None  # cycle";
//     visiting.add(k);

//     const node = nodeMap.get(nodeId);
//     let expr = "None";
//     if (!node) {
//       visiting.delete(k);
//       return expr;
//     }

//     switch (node.type) {
//       case "field": {
//         const d = node.data as NodeDataField;
//         expr = `get_nested(row, ${pyQuote(d.path)})`;
//         break;
//       }
//       case "const": {
//         const d = node.data as NodeDataConst;
//         expr = pyLiteral(d.dtype, d.value);
//         break;
//       }
//       case "operator": {
//         const d = node.data as NodeDataOperator;
//         const spec = OPS[d.opId];
//         if (!spec) break;

//         const incoming = byTarget[node.id] || [];
//         const argExpr: Record<string, string> = {};
//         (spec.inputs || []).forEach((inp) => {
//           const edge = incoming.find((e) => e.targetHandle === inp.id);
//           argExpr[inp.id] = edge ? exprOf(edge.source, edge.sourceHandle ?? null) : "None";
//         });

//         const py = spec.toPy ? spec.toPy(argExpr) : undefined;

//         if (typeof py === "string") {
//           expr = py;
//         } else if (py && typeof py === "object") {
//           const want =
//             sourceHandle ||
//             (Array.isArray((spec as any).outputs) && (spec as any).outputs[0]?.id) ||
//             null;
//           expr = (want && (py as Record<string, string>)[want]) || "None";
//         } else {
//           expr = "None";
//         }
//         break;
//       }
//       case "output": {
//         const inc = (byTarget[node.id] || [])[0];
//         expr = inc ? exprOf(inc.source, inc.sourceHandle ?? null) : "None";
//         break;
//       }
//       default:
//         expr = "None";
//     }

//     visiting.delete(k);
//     memo.set(k, expr);
//     return expr;
//   };

//   // ----- utilities to detect while-body ancestry -----
//   const edgesByTarget: Record<string, Edge[]> = byTarget;
//   const nodeById = nodeMap;

//   function isUnderWhileBody(nodeId: string): boolean {
//     const seen = new Set<string>();
//     const stack = [nodeId];
//     while (stack.length) {
//       const id = stack.pop()!;
//       if (seen.has(id)) continue;
//       seen.add(id);
//       const incomers = edgesByTarget[id] || [];
//       for (const e of incomers) {
//         const src = nodeById.get(e.source) as any;
//         if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
//           return true;
//         }
//         stack.push(e.source);
//       }
//     }
//     return false;
//   }

//   function nearestDrivingWhile(nodeId: string): Node | null {
//     const seen = new Set<string>();
//     const stack = [nodeId];
//     while (stack.length) {
//       const id = stack.pop()!;
//       if (seen.has(id)) continue;
//       seen.add(id);
//       const incomers = edgesByTarget[id] || [];
//       for (const e of incomers) {
//         const src = nodeById.get(e.source) as any;
//         if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
//           return src as Node;
//         }
//         stack.push(e.source);
//       }
//     }
//     return null;
//   }

//   // ----- outputs -----
//   const outputs = nodes.filter((n) => n.type === "output");
//   if (outputs.length === 0) {
//     return (
//       header +
//       [
//         "def compute(row):",
//         "    # No outputs; add an Output node and connect it.",
//         "    return {}",
//         "",
//       ].join("\n")
//     );
//   }

//   const body: string[] = ["def compute(row):", "    _results = {}"];

//   outputs.forEach((n, i) => {
//     const label = (n.data as NodeDataOutput).label || `result_${i + 1}`;
//     const labelPy = pyQuote(label);

//     if (!isUnderWhileBody(n.id)) {
//       body.push(`    _results[${labelPy}] = ${exprOf(n.id)}`);
//       return;
//     }

//     // Under a while body → emit a loop for this output
//     const w = nearestDrivingWhile(n.id);
//     if (!w) {
//       body.push(`    _results[${labelPy}] = ${exprOf(n.id)}`);
//       return;
//     }

//     const incW = edgesByTarget[w.id] || [];
//     const edgeCond = incW.find((e) => e.targetHandle === "cond");
//     const edgeMax  = incW.find((e) => e.targetHandle === "max");

//     const condPy = edgeCond ? exprOf(edgeCond.source, edgeCond.sourceHandle ?? null) : "False";
//     const maxPy  = edgeMax  ? exprOf(edgeMax.source,  edgeMax.sourceHandle  ?? null) : "1000";

//     const valueExpr = exprOf(n.id);

//     // NEW: evaluate all dynamic expressions attached to this While (data.exprs)
//     const whileData = (w.data as any) || {};
//     const exprHandles: string[] = Array.isArray(whileData.exprs) ? whileData.exprs : [];

//     const exprLines: string[] = [];
//     for (const hid of exprHandles) {
//       const e = incW.find((x) => x.targetHandle === hid);
//       if (!e) continue;
//       const ePy = exprOf(e.source, e.sourceHandle ?? null);
//       exprLines.push(`        _ = ${ePy}`);
//     }

//     body.push(
//       `    _i = 0`,
//       `    _last_val = None`,
//       `    while (bool(${condPy})) and _i < int(${maxPy}):`,
//       ...(exprLines.length ? exprLines : []),      // run extra expressions each iteration
//       `        _iter_val = ${valueExpr}`,
//       `        if _iter_val is not None:`,
//       `            _last_val = _iter_val`,
//       `        _i += 1`,
//       `    _results[${labelPy}] = _last_val`
//     );
//   });

//   body.push("    return _results");

//   return header + "\n" + body.join("\n") + "\n";
// }


// function generatePythonProgram(nodes: Node[], edges: Edge[]): string {
//   const { byTarget } = buildEdgeMaps(edges);
//   const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

//   const header = [""].join("\n");

//   // ----- handle-aware expr resolver: exprOf(nodeId, sourceHandle?) -----
//   const keyOf = (id: string, sh?: string | null) => `${id}::${sh ?? "__"}`;
//   const visiting = new Set<string>();
//   const memo = new Map<string, string>();

//   const exprOf = (nodeId: string, sourceHandle?: string | null): string => {
//     const k = keyOf(nodeId, sourceHandle);
//     if (memo.has(k)) return memo.get(k)!;
//     if (visiting.has(k)) return "None  # cycle";
//     visiting.add(k);

//     const node = nodeMap.get(nodeId);
//     let expr = "None";
//     if (!node) {
//       visiting.delete(k);
//       return expr;
//     }

//     switch (node.type) {
//       case "field": {
//         const d = node.data as NodeDataField;
//         expr = `get_nested(row, ${pyQuote(d.path)})`;
//         break;
//       }
//       case "const": {
//         const d = node.data as NodeDataConst;
//         expr = pyLiteral(d.dtype, d.value);
//         break;
//       }
//       case "operator": {
//         const d = node.data as NodeDataOperator;
//         const spec = OPS[d.opId];
//         if (!spec) break;

//         const incoming = byTarget[node.id] || [];
//         const argExpr: Record<string, string> = {};
//         (spec.inputs || []).forEach((inp) => {
//           const edge = incoming.find((e) => e.targetHandle === inp.id);
//           argExpr[inp.id] = edge ? exprOf(edge.source, edge.sourceHandle ?? null) : "None";
//         });

//         const py = spec.toPy ? spec.toPy(argExpr) : undefined;

//         if (typeof py === "string") {
//           expr = py;
//         } else if (py && typeof py === "object") {
//           const want =
//             sourceHandle ||
//             (Array.isArray((spec as any).outputs) && (spec as any).outputs[0]?.id) ||
//             null;
//           expr = (want && (py as Record<string, string>)[want]) || "None";
//         } else {
//           expr = "None";
//         }
//         break;
//       }
//       case "output": {
//         const inc = (byTarget[node.id] || [])[0];
//         expr = inc ? exprOf(inc.source, inc.sourceHandle ?? null) : "None";
//         break;
//       }
//       default:
//         expr = "None";
//     }

//     visiting.delete(k);
//     memo.set(k, expr);
//     return expr;
//   };

//   // ----- while ancestry detection (unchanged) -----
//   const edgesByTarget: Record<string, Edge[]> = byTarget;
//   const nodeById = nodeMap;

//   function isUnderWhileBody(nodeId: string): boolean {
//     const seen = new Set<string>();
//     const stack = [nodeId];
//     while (stack.length) {
//       const id = stack.pop()!;
//       if (seen.has(id)) continue;
//       seen.add(id);
//       const incomers = edgesByTarget[id] || [];
//       for (const e of incomers) {
//         const src = nodeById.get(e.source) as any;
//         if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
//           return true;
//         }
//         stack.push(e.source);
//       }
//     }
//     return false;
//   }

//   function nearestDrivingWhile(nodeId: string): Node | null {
//     const seen = new Set<string>();
//     const stack = [nodeId];
//     while (stack.length) {
//       const id = stack.pop()!;
//       if (seen.has(id)) continue;
//       seen.add(id);
//       const incomers = edgesByTarget[id] || [];
//       for (const e of incomers) {
//         const src = nodeById.get(e.source) as any;
//         if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
//           return src as Node;
//         }
//         stack.push(e.source);
//       }
//     }
//     return null;
//   }

//   // ----- new: roots when there is no Output node -----
//   const outputs = nodes.filter((n) => n.type === "output");

//   // set of nodes that have at least one outgoing edge
//   const hasOut = new Set(edges.map((e) => e.source));
//   const sinkCandidates = nodes.filter(
//     (n) =>
//       n.type !== "output" && // ignore Output if present
//       hasOut.has(n.id) === false
//   );

//   function labelForNode(n: Node, i: number): string {
//     if (n.type === "operator") {
//       const d = n.data as NodeDataOperator;
//       const lbl = OPS[d.opId]?.label || d.opId || n.id;
//       return lbl;
//     }
//     if (n.type === "field") {
//       const d = n.data as NodeDataField;
//       return d.label || d.path || `field_${i + 1}`;
//     }
//     if (n.type === "const") {
//       return `const_${i + 1}`;
//     }
//     return n.id || `result_${i + 1}`;
//   }

//   // choose roots: explicit Output nodes, else sinks
//   const roots: { id: string; label: string }[] =
//     outputs.length > 0
//       ? outputs.map((n, i) => ({
//           id: n.id,
//           label: (n.data as NodeDataOutput).label || `result_${i + 1}`,
//         }))
//       : sinkCandidates.map((n, i) => ({
//           id: n.id,
//           label: labelForNode(n, i),
//         }));

//   if (roots.length === 0) {
//     return (
//       header +
//       [
//         "def compute(row):",
//         "    # Graph has no results yet. Add connections or outputs.",
//         "    return {}",
//         "",
//       ].join("\n")
//     );
//   }

//   // ----- build function body (keeps your while logic) -----
//   const usedLabels = new Set<string>();
//   const uniq = (s: string) => {
//     let k = s;
//     let i = 2;
//     while (usedLabels.has(k)) {
//       k = `${s}_${i++}`;
//     }
//     usedLabels.add(k);
//     return k;
//   };

//   const body: string[] = ["def compute(row):", "    _results = {}"];

//   roots.forEach((root, i) => {
//     const rootId = root.id;
//     const labelPy = pyQuote(uniq(root.label));

//     if (!isUnderWhileBody(rootId)) {
//       body.push(`    _results[${labelPy}] = ${exprOf(rootId)}`);
//       return;
//     }

//     const w = nearestDrivingWhile(rootId);
//     if (!w) {
//       body.push(`    _results[${labelPy}] = ${exprOf(rootId)}`);
//       return;
//     }

//     const incW = edgesByTarget[w.id] || [];
//     const edgeCond = incW.find((e) => e.targetHandle === "cond");
//     const edgeMax  = incW.find((e) => e.targetHandle === "max");

//     const condPy = edgeCond ? exprOf(edgeCond.source, edgeCond.sourceHandle ?? null) : "False";
//     const maxPy  = edgeMax  ? exprOf(edgeMax.source,  edgeMax.sourceHandle  ?? null) : "1000";

//     const valueExpr = exprOf(rootId);

//     // dynamic while expressions (data.exprs on the while node)
//     const whileData = (w.data as any) || {};
//     const exprHandles: string[] = Array.isArray(whileData.exprs) ? whileData.exprs : [];

//     const exprLines: string[] = [];
//     for (const hid of exprHandles) {
//       const e = incW.find((x) => x.targetHandle === hid);
//       if (!e) continue;
//       const ePy = exprOf(e.source, e.sourceHandle ?? null);
//       exprLines.push(`        _ = ${ePy}`);
//     }

//     body.push(
//       `    _i = 0`,
//       `    _last_val = None`,
//       `    while (bool(${condPy})) and _i < int(${maxPy}):`,
//       ...(exprLines.length ? exprLines : []),
//       `        _iter_val = ${valueExpr}`,
//       `        if _iter_val is not None:`,
//       `            _last_val = _iter_val`,
//       `        _i += 1`,
//       `    _results[${labelPy}] = _last_val`
//     );
//   });

//   body.push("    return _results");

//   return header + "\n" + body.join("\n") + "\n";
// }


// function generatePythonProgram(nodes: Node[], edges: Edge[]): string {
//   const { byTarget } = buildEdgeMaps(edges);
//   const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

//   // ---------- helpers ----------
//   const pyIdent = (s: string) =>
//     "_n_" + String(s).replace(/[^a-zA-Z0-9_]/g, "_");

//   const header = [
//     "def _set(_vars, name, val):",
//     "    try: key = str(name)",
//     "    except Exception: key = name",
//     "    _vars[key] = val",
//     "    return val",
//     "",
//     "def _get(_vars, name, default=None):",
//     "    try: key = str(name)",
//     "    except Exception: key = name",
//     "    return _vars.get(key, default)",
//     "",
//   ].join("\n");

//   const keyOf = (id: string, sh?: string | null) => `${id}::${sh ?? "__"}`;
//   const visiting = new Set<string>();
//   const memo = new Map<string, string>();

//   const exprOf = (nodeId: string, sourceHandle?: string | null): string => {
//     const k = keyOf(nodeId, sourceHandle);
//     if (memo.has(k)) return memo.get(k)!;
//     if (visiting.has(k)) return "None  # cycle";
//     visiting.add(k);

//     const node = nodeMap.get(nodeId);
//     let expr = "None";
//     if (!node) {
//       visiting.delete(k);
//       return expr;
//     }

//     switch (node.type) {
//       case "field": {
//         const d = node.data as NodeDataField;
//         expr = `get_nested(row, ${pyQuote(d.path)})`;
//         break;
//       }
//       case "const": {
//         const d = node.data as NodeDataConst;
//         expr = pyLiteral(d.dtype, d.value);
//         break;
//       }
//       case "operator": {
//         const d = node.data as NodeDataOperator;
//         const spec = OPS[d.opId];
//         if (!spec) break;

//         const incoming = byTarget[node.id] || [];
//         const argExpr: Record<string, string> = {};
//         (spec.inputs || []).forEach((inp) => {
//           const e = incoming.find((x) => x.targetHandle === inp.id);
//           argExpr[inp.id] = e ? exprOf(e.source, e.sourceHandle ?? null) : "None";
//         });

//         const py = spec.toPy ? spec.toPy(argExpr) : undefined;
//         if (typeof py === "string") expr = py;
//         else if (py && typeof py === "object") {
//           const want =
//             sourceHandle ||
//             (Array.isArray((spec as any).outputs) && (spec as any).outputs[0]?.id) ||
//             null;
//           expr = (want && (py as Record<string, string>)[want]) || "None";
//         } else expr = "None";
//         break;
//       }
//       case "output": {
//         const inc = (byTarget[node.id] || [])[0];
//         expr = inc ? exprOf(inc.source, inc.sourceHandle ?? null) : "None";
//         break;
//       }
//       default:
//         expr = "None";
//     }

//     visiting.delete(k);
//     memo.set(k, expr);
//     return expr;
//   };

//   // ---------- while ancestry detection ----------
//   const edgesByTarget: Record<string, Edge[]> = byTarget;

//   function nearestDrivingWhile(nodeId: string): Node | null {
//     const seen = new Set<string>();
//     const stack = [nodeId];
//     while (stack.length) {
//       const id = stack.pop()!;
//       if (seen.has(id)) continue;
//       seen.add(id);
//       const incomers = edgesByTarget[id] || [];
//       for (const e of incomers) {
//         const src = nodeMap.get(e.source) as any;
//         if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
//           return src as Node;
//         }
//         stack.push(e.source);
//       }
//     }
//     return null;
//   }

//   function isUnderWhile(nodeId: string): boolean {
//     return !!nearestDrivingWhile(nodeId);
//   }

//   // ---------- roots (live even without Output nodes) ----------
//   const outputs = nodes.filter((n) => n.type === "output");
//   const hasOut = new Set(edges.map((e) => e.source));
//   const sinkCandidates = nodes.filter((n) => n.type !== "output" && !hasOut.has(n.id));

//   function labelForNode(n: Node, i: number): string {
//     if (n.type === "operator") {
//       const d = n.data as NodeDataOperator;
//       return OPS[d.opId]?.label || d.opId || n.id;
//     }
//     if (n.type === "field") {
//       const d = n.data as NodeDataField;
//       return d.label || d.path || `field_${i + 1}`;
//     }
//     if (n.type === "const") return `const_${i + 1}`;
//     return n.id || `result_${i + 1}`;
//   }

//   const roots =
//     outputs.length > 0
//       ? outputs.map((n, i) => ({ id: n.id, label: (n.data as NodeDataOutput).label || `result_${i + 1}` }))
//       : sinkCandidates.map((n, i) => ({ id: n.id, label: labelForNode(n, i) }));

//   if (roots.length === 0) {
//     return (
//       header +
//       [
//         "def compute(row):",
//         "    _results = {}",
//         "    _vars = {}",
//         "    # Graph has no results yet.",
//         "    return _results",
//         "",
//       ].join("\n")
//     );
//   }

//   // ---------- topo utilities ----------
//   const outAdj = new Map<string, string[]>();
//   const inAdj = new Map<string, string[]>();
//   nodes.forEach((n) => {
//     outAdj.set(n.id, []);
//     inAdj.set(n.id, []);
//   });
//   edges.forEach((e) => {
//     outAdj.get(e.source)!.push(e.target);
//     inAdj.get(e.target)!.push(e.source);
//   });

//   // subgraph induced by a predicate
//   function topoOrder(filter: (id: string) => boolean): string[] {
//     const indeg = new Map<string, number>();
//     const ids = nodes.map((n) => n.id).filter(filter);
//     ids.forEach((id) => indeg.set(id, 0));
//     edges.forEach((e) => {
//       if (filter(e.source) && filter(e.target)) {
//         indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
//       }
//     });
//     const q: string[] = [];
//     ids.forEach((id) => {
//       if ((indeg.get(id) || 0) === 0) q.push(id);
//     });
//     const out: string[] = [];
//     while (q.length) {
//       const u = q.shift()!;
//       out.push(u);
//       (outAdj.get(u) || []).forEach((v) => {
//         if (!filter(v)) return;
//         indeg.set(v, (indeg.get(v) || 0) - 1);
//         if ((indeg.get(v) || 0) === 0) q.push(v);
//       });
//     }
//     // if cycle, we still return partial order; exprOf has cycle guard
//     return out.filter(filter);
//   }

//   // collect upstream closure of a set within a filter
//   function upstreamClosure(seed: Set<string>, filter: (id: string) => boolean): Set<string> {
//     const res = new Set<string>(seed);
//     const stack = [...seed];
//     while (stack.length) {
//       const id = stack.pop()!;
//       (inAdj.get(id) || []).forEach((p) => {
//         if (!filter(p)) return;
//         if (!res.has(p)) {
//           res.add(p);
//           stack.push(p);
//         }
//       });
//     }
//     return res;
//   }

//   const usedLabels = new Set<string>();
//   const uniq = (s: string) => {
//     let k = s;
//     let i = 2;
//     while (usedLabels.has(k)) k = `${s}_${i++}`;
//     usedLabels.add(k);
//     return k;
//   };

//   // ---------- emit ----------
//   const body: string[] = ["def compute(row):", "    _results = {}", "    _vars = {}"];

//   // 1) Non-while region: assign every node in topo order (readable)
//   const nonWhileIds = new Set(nodes.filter((n) => !isUnderWhile(n.id)).map((n) => n.id));
//   const orderGlobal = topoOrder((id) => nonWhileIds.has(id));
//   orderGlobal.forEach((id) => {
//     const n = nodeMap.get(id)!;
//     if (n.type === "output") return; // outputs are mapped below
//     const name = pyIdent(id);
//     body.push(`    ${name} = ${exprOf(id)}`);
//   });

//   // 2) For each root: if under a while, emit a loop with body subgraph in topo order
//   roots.forEach((root) => {
//     const labelPy = pyQuote(uniq(root.label));
//     const w = nearestDrivingWhile(root.id);

//     if (!w) {
//       // normal assignment uses the pre-computed temp name when available
//       const nname = pyIdent(root.id);
//       // If it wasn't in global (because it has outgoing edges only to outputs), still compute
//       if (!nonWhileIds.has(root.id)) {
//         body.push(`    ${nname} = ${exprOf(root.id)}`);
//       }
//       body.push(`    _results[${labelPy}] = ${pyIdent(root.id)}`);
//       return;
//     }

//     // while: compute cond/max
//     const incW = edgesByTarget[w.id] || [];
//     const edgeCond = incW.find((e) => e.targetHandle === "cond");
//     const edgeMax  = incW.find((e) => e.targetHandle === "max");
//     const condPy = edgeCond ? exprOf(edgeCond.source, edgeCond.sourceHandle ?? null) : "False";
//     const maxPy  = edgeMax  ? exprOf(edgeMax.source,  edgeMax.sourceHandle  ?? null) : "1000";

//     // nodes that are controlled by this while: those whose nearestDrivingWhile is this `w`
//     const controlled = new Set(nodes.filter((n) => nearestDrivingWhile(n.id)?.id === w.id).map((n) => n.id));

//     // limit to upstream closure of the root (so we don't emit unrelated loop nodes)
//     const needed = upstreamClosure(new Set<string>([root.id]), (id) => controlled.has(id));

//     // topo order of the needed subset (inside loop)
//     const orderLoop = topoOrder((id) => needed.has(id) && id !== w.id);

//     body.push(
//       `    _i = 0`,
//       `    _last_val = None`,
//       `    while (bool(${condPy})) and _i < int(${maxPy}):`
//     );

//     // dynamic while expressions (data.exprs handles)
//     const wdata = (w.data as any) || {};
//     const exprHandles: string[] = Array.isArray(wdata.exprs) ? wdata.exprs : [];
//     for (const hid of exprHandles) {
//       const e = incW.find((x) => x.targetHandle === hid);
//       if (!e) continue;
//       body.push(`        _tmp = ${exprOf(e.source, e.sourceHandle ?? null)}`);
//     }

//     // per-iteration assignments for loop body nodes
//     orderLoop.forEach((id) => {
//       const n = nodeMap.get(id)!;
//       if (n.type === "output") return;
//       const name = pyIdent(id);
//       body.push(`        ${name} = ${exprOf(id)}`);
//     });

//     // set last value from the root temp
//     body.push(
//       `        _iter_val = ${pyIdent(root.id)}`,
//       `        if _iter_val is not None:`,
//       `            _last_val = _iter_val`,
//       `        _i += 1`,
//       `    _results[${labelPy}] = _last_val`
//     );
//   });

//   body.push("    return _results");
//   return header + "\n" + body.join("\n") + "\n";
// }


// export function generatePythonProgram(nodes: Node[], edges: Edge[]): string {
//   const { byTarget } = buildEdgeMaps(edges);
//   const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

//   const slug = (s: string) =>
//     String(s || "")
//       .toLowerCase()
//       .replace(/[^a-z0-9]+/g, "_")
//       .replace(/^_+|_+$/g, "");

//   // ---------- readable temp names ----------
//   const nameMemo = new Map<string, string>();
//   const counters: Record<string, number> = {};

//   function nextIdx(key: string) {
//     counters[key] = (counters[key] ?? 0) + 1;
//     return counters[key];
//   }

//   function tempNameFor(n: Node): string {
//     if (nameMemo.has(n.id)) return nameMemo.get(n.id)!;

//     let base = "node";
//     if (n.type === "operator") {
//       const d = n.data as NodeDataOperator;
//       const label = OPS[d.opId]?.label || d.opId || "op";
//       base = slug(label);
//     } else if (n.type === "field") {
//       const d = n.data as NodeDataField;
//       base = d.label ? slug(d.label) : slug(d.path?.split(".").pop() || "field");
//     } else if (n.type === "const") {
//       base = "const";
//     } else if (n.type === "output") {
//       const d = n.data as NodeDataOutput;
//       base = slug(d.label || "result");
//     }

//     const idx = nextIdx(base);
//     const name = `_${base}_${idx}`;
//     nameMemo.set(n.id, name);
//     return name;
//   }

//   const header = [
//     "def _set(_vars, name, val):",
//     "    try: key = str(name)",
//     "    except Exception: key = name",
//     "    _vars[key] = val",
//     "    return val",
//     "",
//     "def _get(_vars, name, default=None):",
//     "    try: key = str(name)",
//     "    except Exception: key = name",
//     "    return _vars.get(key, default)",
//     "",
//   ].join("\n");

//   // ---------- expr resolver ----------
//   const keyOf = (id: string, sh?: string | null) => `${id}::${sh ?? "__"}`;
//   const visiting = new Set<string>();
//   const memo = new Map<string, string>();

//   const exprOf = (nodeId: string, sourceHandle?: string | null): string => {
//     const k = keyOf(nodeId, sourceHandle);
//     if (memo.has(k)) return memo.get(k)!;
//     if (visiting.has(k)) return "None  # cycle";
//     visiting.add(k);

//     const node = nodeMap.get(nodeId);
//     let expr = "None";
//     if (!node) {
//       visiting.delete(k);
//       return expr;
//     }

//     switch (node.type) {
//       case "field": {
//         const d = node.data as NodeDataField;
//         expr = `get_nested(row, ${pyQuote(d.path)})`;
//         break;
//       }
//       case "const": {
//         const d = node.data as NodeDataConst;
//         expr = pyLiteral(d.dtype, d.value);
//         break;
//       }
//       case "operator": {
//         const d = node.data as NodeDataOperator;
//         const spec = OPS[d.opId];
//         if (!spec) break;

//         const incoming = byTarget[node.id] || [];
//         const argExpr: Record<string, string> = {};
//         (spec.inputs || []).forEach((inp) => {
//           const e = incoming.find((x) => x.targetHandle === inp.id);
//           argExpr[inp.id] = e ? exprOf(e.source, e.sourceHandle ?? null) : "None";
//         });

//         const py = spec.toPy ? spec.toPy(argExpr) : undefined;
//         if (typeof py === "string") expr = py;
//         else if (py && typeof py === "object") {
//           const want =
//             sourceHandle ||
//             (Array.isArray((spec as any).outputs) && (spec as any).outputs[0]?.id) ||
//             null;
//           expr = (want && (py as Record<string, string>)[want]) || "None";
//         } else expr = "None";
//         break;
//       }
//       case "output": {
//         const inc = (byTarget[node.id] || [])[0];
//         expr = inc ? exprOf(inc.source, inc.sourceHandle ?? null) : "None";
//         break;
//       }
//       default:
//         expr = "None";
//     }

//     visiting.delete(k);
//     memo.set(k, expr);
//     return expr;
//   };

//   // ---------- while ancestry ----------
//   function nearestDrivingWhile(nodeId: string): Node | null {
//     const seen = new Set<string>();
//     const stack = [nodeId];
//     while (stack.length) {
//       const id = stack.pop()!;
//       if (seen.has(id)) continue;
//       seen.add(id);
//       const incomers = byTarget[id] || [];
//       for (const e of incomers) {
//         const src = nodeMap.get(e.source) as any;
//         if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
//           return src as Node;
//         }
//         stack.push(e.source);
//       }
//     }
//     return null;
//   }
//   const isUnderWhile = (id: string) => !!nearestDrivingWhile(id);

//   // ---------- roots (works even without Output nodes) ----------
//   const outputs = nodes.filter((n) => n.type === "output");
//   const hasOut = new Set(edges.map((e) => e.source));
//   const sinkCandidates = nodes.filter((n) => n.type !== "output" && !hasOut.has(n.id));

//   const roots =
//     outputs.length > 0
//       ? outputs.map((n, i) => ({ id: n.id, label: (n.data as NodeDataOutput).label || `result_${i + 1}` }))
//       : sinkCandidates.map((n, i) => ({ id: n.id, label: slug(tempNameFor(n)).replace(/^_+/, "") || `result_${i + 1}` }));

//   if (roots.length === 0) {
//     return (
//       header +
//       [
//         "def compute(row):",
//         "    _results = {}",
//         "    _vars = {}",
//         "    # Graph has no results yet.",
//         "    return _results",
//         "",
//       ].join("\n")
//     );
//   }

//   // ---------- topo utils ----------
//   const outAdj = new Map<string, string[]>();
//   const inAdj = new Map<string, string[]>();
//   nodes.forEach((n) => {
//     outAdj.set(n.id, []);
//     inAdj.set(n.id, []);
//   });
//   edges.forEach((e) => {
//     outAdj.get(e.source)!.push(e.target);
//     inAdj.get(e.target)!.push(e.source);
//   });

//   function topoOrder(filter: (id: string) => boolean): string[] {
//     const indeg = new Map<string, number>();
//     const ids = nodes.map((n) => n.id).filter(filter);
//     ids.forEach((id) => indeg.set(id, 0));
//     edges.forEach((e) => {
//       if (filter(e.source) && filter(e.target)) {
//         indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
//       }
//     });
//     const q: string[] = [];
//     ids.forEach((id) => {
//       if ((indeg.get(id) || 0) === 0) q.push(id);
//     });
//     const out: string[] = [];
//     while (q.length) {
//       const u = q.shift()!;
//       out.push(u);
//       (outAdj.get(u) || []).forEach((v) => {
//         if (!filter(v)) return;
//         indeg.set(v, (indeg.get(v) || 0) - 1);
//         if ((indeg.get(v) || 0) === 0) q.push(v);
//       });
//     }
//     return out.filter(filter);
//   }

//   function upstreamClosure(seed: Set<string>, filter: (id: string) => boolean): Set<string> {
//     const res = new Set<string>(seed);
//     const stack = [...seed];
//     while (stack.length) {
//       const id = stack.pop()!;
//       (inAdj.get(id) || []).forEach((p) => {
//         if (!filter(p)) return;
//         if (!res.has(p)) {
//           res.add(p);
//           stack.push(p);
//         }
//       });
//     }
//     return res;
//   }

//   const usedLabels = new Set<string>();
//   const uniq = (s: string) => {
//     let k = s || "result";
//     let i = 2;
//     while (usedLabels.has(k)) k = `${s}_${i++}`;
//     usedLabels.add(k);
//     return k;
//   };

//   // ---------- emit ----------
//   const body: string[] = ["def compute(row):", "    _results = {}", "    _vars = {}"];

//   // 1) Non-while region: readable temp names
//   const nonWhileIds = new Set(nodes.filter((n) => !isUnderWhile(n.id)).map((n) => n.id));
//   const orderGlobal = topoOrder((id) => nonWhileIds.has(id));
//   orderGlobal.forEach((id) => {
//     const n = nodeMap.get(id)!;
//     if (n.type === "output") return;
//     body.push(`    ${tempNameFor(n)} = ${exprOf(id)}`);
//   });

//   // 2) Roots, with per-while loop blocks when needed
//   roots.forEach((root) => {
//     const rootNode = nodeMap.get(root.id)!;
//     const outLabel = uniq(slug(root.label) || "result");
//     const w = nearestDrivingWhile(root.id);

//     if (!w) {
//       if (!nonWhileIds.has(root.id)) {
//         body.push(`    ${tempNameFor(rootNode)} = ${exprOf(root.id)}`);
//       }
//       body.push(`    _results[${pyQuote(outLabel)}] = ${tempNameFor(rootNode)}`);
//       return;
//     }

//     // the while we depend on
//     const incW = byTarget[w.id] || [];
//     const edgeCond = incW.find((e) => e.targetHandle === "cond");
//     const edgeMax  = incW.find((e) => e.targetHandle === "max");
//     const condPy = edgeCond ? exprOf(edgeCond.source, edgeCond.sourceHandle ?? null) : "False";
//     const maxPy  = edgeMax  ? exprOf(edgeMax.source,  edgeMax.sourceHandle  ?? null) : "1000";

//     // nodes governed by this while
//     const controlled = new Set(nodes.filter((n) => nearestDrivingWhile(n.id)?.id === w.id).map((n) => n.id));
//     const needed = upstreamClosure(new Set<string>([root.id]), (id) => controlled.has(id));
//     const orderLoop = topoOrder((id) => needed.has(id) && id !== w.id);

//     body.push(
//       `    _i = 0`,
//       `    _last_val = None`,
//       `    while (bool(${condPy})) and _i < int(${maxPy}):`
//     );

//     // dynamic while expressions (dedup identical exprs)
//     const wdata = (w.data as any) || {};
//     const exprHandles: string[] = Array.isArray(wdata.exprs) ? wdata.exprs : [];
//     const seenExpr = new Set<string>();
//     for (const hid of exprHandles) {
//       const e = incW.find((x) => x.targetHandle === hid);
//       if (!e) continue;
//       const code = exprOf(e.source, e.sourceHandle ?? null);
//       if (seenExpr.has(code)) continue;
//       seenExpr.add(code);
//       body.push(`        _tmp = ${code}`);
//     }

//     // per-iteration assignments for loop body nodes
//     orderLoop.forEach((id) => {
//       const n = nodeMap.get(id)!;
//       if (n.type === "output") return;
//       body.push(`        ${tempNameFor(n)} = ${exprOf(id)}`);
//     });

//     body.push(
//       `        _iter_val = ${tempNameFor(rootNode)}`,
//       `        if _iter_val is not None:`,
//       `            _last_val = _iter_val`,
//       `        _i += 1`,
//       `    _results[${pyQuote(outLabel)}] = _last_val`
//     );
//   });

//   body.push("    return _results");
//   return header + "\n" + body.join("\n") + "\n";
// }

function generatePythonProgram(nodes: Node[], edges: Edge[]): string {
  // ---------- indexing ----------
  const { byTarget } = buildEdgeMaps(edges);
  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));

  // ---------- small helpers ----------
  const slug = (s: string) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  // Make readable temp names: _add_1, _const_2, _field_total, _gt_1, etc.
  const nameMemo = new Map<string, string>();
  const counters: Record<string, number> = {};
  const nextIdx = (k: string) => ((counters[k] = (counters[k] ?? 0) + 1), counters[k]);

  function tempNameFor(n: Node): string {
    if (nameMemo.has(n.id)) return nameMemo.get(n.id)!;
    let base = "node";
    if (n.type === "operator") {
      const d = n.data as NodeDataOperator;
      base = slug(OPS[d.opId]?.label || d.opId || "op");
    } else if (n.type === "field") {
      const d = n.data as NodeDataField;
      base = d.label ? slug(d.label) : slug(d.path?.split(".").pop() || "field");
    } else if (n.type === "const") {
      base = "const";
    } else if (n.type === "output") {
      const d = n.data as NodeDataOutput;
      base = slug(d.label || "result");
    }
    const name = `_${base}_${nextIdx(base)}`;
    nameMemo.set(n.id, name);
    return name;
  }

  // Emit standard helpers: nested get, variables store
  const header = [
    "from datetime import date, datetime",
    "",
    "def get_nested(row, path):",
    "    cur = row",
    "    for key in str(path).split('.'):",
    "        if not isinstance(cur, dict):",
    "            return None",
    "        cur = cur.get(key)",
    "    return cur",
    "",
    "def _set(_vars, name, val):",
    "    try: key = str(name)",
    "    except Exception: key = name",
    "    _vars[key] = val",
    "    return val",
    "",
    "def _get(_vars, name, default=None):",
    "    try: key = str(name)",
    "    except Exception: key = name",
    "    return _vars.get(key, default)",
    "",
  ].join("\n");

  // ---------- expression resolver (handle-aware) ----------
  const keyOf = (id: string, sh?: string | null) => `${id}::${sh ?? "__"}`;
  const visiting = new Set<string>();
  const memo = new Map<string, string>();

  const exprOf = (nodeId: string, sourceHandle?: string | null): string => {
    const k = keyOf(nodeId, sourceHandle);
    if (memo.has(k)) return memo.get(k)!;
    if (visiting.has(k)) return "None  # cycle";
    visiting.add(k);

    const node = nodeMap.get(nodeId);
    let expr = "None";
    if (!node) {
      visiting.delete(k);
      return expr;
    }

    switch (node.type) {
      case "field": {
        const d = node.data as NodeDataField;
        expr = `get_nested(row, ${pyQuote(d.path)})`;
        break;
      }
      case "const": {
        const d = node.data as NodeDataConst;
        expr = pyLiteral(d.dtype, d.value);
        break;
      }
      case "operator": {
        const d = node.data as NodeDataOperator;
        const spec = OPS[d.opId];
        if (!spec) break;

        const incoming = byTarget[node.id] || [];
        const argExpr: Record<string, string> = {};
        (spec.inputs || []).forEach((inp) => {
          const e = incoming.find((x) => x.targetHandle === inp.id);
          argExpr[inp.id] = e ? exprOf(e.source, e.sourceHandle ?? null) : "None";
        });

        const py = spec.toPy ? spec.toPy(argExpr) : undefined;
        if (typeof py === "string") {
          expr = py;
        } else if (py && typeof py === "object") {
          // multi-output: return requested handle's expression
          const want =
            sourceHandle ||
            (Array.isArray((spec as any).outputs) && (spec as any).outputs[0]?.id) ||
            null;
          expr = (want && (py as Record<string, string>)[want]) || "None";
        } else {
          expr = "None";
        }
        break;
      }
      case "output": {
        const inc = (byTarget[node.id] || [])[0];
        expr = inc ? exprOf(inc.source, inc.sourceHandle ?? null) : "None";
        break;
      }
      default:
        expr = "None";
    }

    visiting.delete(k);
    memo.set(k, expr);
    return expr;
  };

  // ---------- while ancestry detection ----------
  function nearestDrivingWhile(nodeId: string): Node | null {
    const seen = new Set<string>();
    const stack = [nodeId];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const incomers = byTarget[id] || [];
      for (const e of incomers) {
        const src = nodeMap.get(e.source) as any;
        if (src?.type === "operator" && src?.data?.opId === "while_loop" && e.sourceHandle === "body") {
          return src as Node;
        }
        stack.push(e.source);
      }
    }
    return null;
  }
  const isUnderWhile = (id: string) => !!nearestDrivingWhile(id);

  // ---------- roots (works even without Output nodes) ----------
  const outputs = nodes.filter((n) => n.type === "output");
  const hasOut = new Set(edges.map((e) => e.source));
  const sinkCandidates = nodes.filter((n) => n.type !== "output" && !hasOut.has(n.id));

  const roots =
    outputs.length > 0
      ? outputs.map((n, i) => ({
          id: n.id,
          label: (n.data as NodeDataOutput).label || `result_${i + 1}`,
        }))
      : sinkCandidates.map((n, i) => {
          const nn = nodeMap.get(n.id)!;
          return { id: n.id, label: slug(tempNameFor(nn)).replace(/^_+/, "") || `result_${i + 1}` };
        });

  if (roots.length === 0) {
    return (
      header +
      [
        "def compute(row):",
        "    _results = {}",
        "    _vars = {}",
        "    # Graph has no results yet.",
        "    return _results",
        "",
      ].join("\n")
    );
  }

  // ---------- graph adjacency for topo ----------
  const outAdj = new Map<string, string[]>();
  const inAdj = new Map<string, string[]>();
  nodes.forEach((n) => {
    outAdj.set(n.id, []);
    inAdj.set(n.id, []);
  });
  edges.forEach((e) => {
    outAdj.get(e.source)!.push(e.target);
    inAdj.get(e.target)!.push(e.source);
  });

  function topoOrder(filter: (id: string) => boolean): string[] {
    const indeg = new Map<string, number>();
    const ids = nodes.map((n) => n.id).filter(filter);
    ids.forEach((id) => indeg.set(id, 0));
    edges.forEach((e) => {
      if (filter(e.source) && filter(e.target)) {
        indeg.set(e.target, (indeg.get(e.target) || 0) + 1);
      }
    });
    const q: string[] = [];
    ids.forEach((id) => {
      if ((indeg.get(id) || 0) === 0) q.push(id);
    });
    const out: string[] = [];
    while (q.length) {
      const u = q.shift()!;
      out.push(u);
      (outAdj.get(u) || []).forEach((v) => {
        if (!filter(v)) return;
        indeg.set(v, (indeg.get(v) || 0) - 1);
        if ((indeg.get(v) || 0) === 0) q.push(v);
      });
    }
    return out.filter(filter);
  }

  function upstreamClosure(seed: Set<string>, filter: (id: string) => boolean): Set<string> {
    const res = new Set<string>(seed);
    const stack = [...seed];
    while (stack.length) {
      const id = stack.pop()!;
      (inAdj.get(id) || []).forEach((p) => {
        if (!filter(p)) return;
        if (!res.has(p)) {
          res.add(p);
          stack.push(p);
        }
      });
    }
    return res;
  }

  const usedLabels = new Set<string>();
  const uniq = (s: string) => {
    let k = s || "result";
    let i = 2;
    while (usedLabels.has(k)) k = `${s}_${i++}`;
    usedLabels.add(k);
    return k;
  };

  // ---------- emit ----------
  const body: string[] = ["def compute(row):", "    _results = {}", "    _vars = {}"];

  // 1) Non-while region: assign every node to a readable temp in topo order
  const nonWhileIds = new Set(nodes.filter((n) => !isUnderWhile(n.id)).map((n) => n.id));
  topoOrder((id) => nonWhileIds.has(id)).forEach((id) => {
    const n = nodeMap.get(id)!;
    if (n.type === "output") return; // outputs handled below
    body.push(`    ${tempNameFor(n)} = ${exprOf(id)}`);
  });

  // 2) For each result root: either set directly or emit a while block with cont/brk + dynamic exprs
  roots.forEach((root) => {
    const rootNode = nodeMap.get(root.id)!;
    const outLabel = uniq(slug(root.label) || "result");
    const w = nearestDrivingWhile(root.id);

    if (!w) {
      // In case root wasn't covered above (e.g., only feeds an Output)
      if (!nonWhileIds.has(root.id)) {
        body.push(`    ${tempNameFor(rootNode)} = ${exprOf(root.id)}`);
      }
      body.push(`    _results[${pyQuote(outLabel)}] = ${tempNameFor(rootNode)}`);
      return;
    }

    // While handles: cond, max, cont, brk
    const incW = byTarget[w.id] || [];
    const edgeCond = incW.find((e) => e.targetHandle === "cond");
    const edgeMax  = incW.find((e) => e.targetHandle === "max");
    const edgeCnt  = incW.find((e) => e.targetHandle === "cont");
    const edgeBrk  = incW.find((e) => e.targetHandle === "brk");

    const condPy = edgeCond ? exprOf(edgeCond.source, edgeCond.sourceHandle ?? null) : "False";
    const maxPy  = edgeMax  ? exprOf(edgeMax.source,  edgeMax.sourceHandle  ?? null) : "1000";
    const cntPy  = edgeCnt  ? exprOf(edgeCnt.source,  edgeCnt.sourceHandle  ?? null) : "False";
    const brkPy  = edgeBrk  ? exprOf(edgeBrk.source,  edgeBrk.sourceHandle  ?? null) : "False";

    // Compute which nodes are *governed* by this while: nearestDrivingWhile(node) === w
    const controlled = new Set(nodes.filter((n) => nearestDrivingWhile(n.id)?.id === w.id).map((n) => n.id));
    // Limit to the upstream closure of the root within that governed set
    const needed = upstreamClosure(new Set<string>([root.id]), (id) => controlled.has(id));
    const orderLoop = topoOrder((id) => needed.has(id) && id !== w.id);

    // while header
    body.push(
      `    _i = 0`,
      `    _last_val = None`,
      `    while (bool(${condPy})) and _i < int(${maxPy}):`
    );

    // Dynamic per-iteration expressions from while.data.exprs
    const wdata = (w.data as any) || {};
    const exprHandles: string[] = Array.isArray(wdata.exprs) ? wdata.exprs : [];
    const seenExpr = new Set<string>();
    for (const hid of exprHandles) {
      const e = incW.find((x) => x.targetHandle === hid);
      if (!e) continue;
      const code = exprOf(e.source, e.sourceHandle ?? null);
      if (seenExpr.has(code)) continue;
      seenExpr.add(code);
      body.push(`        _tmp = ${code}`);
    }

    // Per-iteration assignments for nodes in loop body (topo-ordered)
    orderLoop.forEach((id) => {
      const n = nodeMap.get(id)!;
      if (n.type === "output") return;
      body.push(`        ${tempNameFor(n)} = ${exprOf(id)}`);
    });

    // Continue first (matches "if n == 5: continue"), then Break
    body.push(
      `        if bool(${cntPy}):`,
      `            _i += 1`,
      `            continue`,
      `        if bool(${brkPy}):`,
      `            break`
    );

    // Collect last non-None root value
    body.push(
      `        _iter_val = ${tempNameFor(rootNode)}`,
      `        if _iter_val is not None:`,
      `            _last_val = _iter_val`,
      `        _i += 1`,
      `    _results[${pyQuote(outLabel)}] = _last_val`
    );
  });

  body.push("    return _results");
  return header + "\n" + body.join("\n") + "\n";
}




let __id = 1; 
const genId = () => String(__id++);

interface OperatorNode extends Node {
  type: "operator";
  data: NodeDataOperator;
}

interface ConstNode extends Node {
  type: "const";
  data: NodeDataConst;
}

interface FieldNode extends Node {
  type: "field";
  data: NodeDataField;
}

type OutputDTypeNode = OperatorNode | ConstNode | FieldNode;

function outputDTypeForNode(n: OutputDTypeNode): "number" | "boolean" | "date" | "string" | "list" | "any" {
  if (n.type === "operator") {
    return OPS[n.data.opId]?.output?.dtype ?? "any";
  }
  if (n.type === "const") {
    return (n.data as NodeDataConst).dtype;
  }
  // For field nodes, dtype is not present, so return "any"
  return "any";
}


// interface InputDTypeForTargetNode {
//   type: NodeType;
//   data: NodeDataOperator;
// }

function inputDTypeForTarget(
  node: Node,
  targetHandle: string
): "number" | "boolean" | "date" | "string" | "list" | "any" {
  if (node.type === "operator") {
    const spec = OPS[(node.data as NodeDataOperator).opId];
    const port = spec?.inputs?.find((p) => p.id === targetHandle);
    return port?.dtype ?? "any";
  }
  return "any";
}


// interface EvaluateNodeMap {
//   [id: string]: Node;
// }

interface EvaluateArgs {
  [key: string]: unknown;
}

// interface EvaluateMemo {
//   [id: string]: unknown;
// }

function evaluate(
  nodes: Node[],
  edges: Edge[],
  record: Record<string, unknown>
): Map<string, unknown> {
  const nodeMap: Map<string, Node> = new Map(nodes.map((n) => [n.id, n]));
  const { byTarget } = buildEdgeMaps(edges);
  const memo: Map<string, unknown> = new Map();
  const visiting: Set<string> = new Set();

  const compute = (id: string): unknown => {
    if (memo.has(id)) return memo.get(id);
    if (visiting.has(id)) throw new Error("Cycle detected");
    visiting.add(id);
    const node = nodeMap.get(id);
    if (!node) return undefined;
    let value: unknown;
    switch (node.type) {
      case "field":
        value = getByPath(record, (node.data as NodeDataField).path);
        break;
      case "const":
        value = (node.data as NodeDataConst).value;
        break;
      case "operator": {
        const spec = OPS[(node.data as NodeDataOperator).opId];
        if (!spec) {
          value = undefined;
          break;
        }
        const incoming = byTarget[node.id] || [];
        const args: EvaluateArgs = {};
        spec.inputs.forEach((inp) => {
          const e = incoming.find((x) => x.targetHandle === inp.id);
          args[inp.id] = e ? compute(e.source) : undefined;
        });
        try {
          value = (spec as OperatorSpec & { eval?: (args: EvaluateArgs) => unknown }).eval
            ? (spec as OperatorSpec & { eval: (args: EvaluateArgs) => unknown }).eval(args)
            : undefined;
        } catch {
          value = undefined;
        }
        break;
      }
      case "output": {
        const inc = (byTarget[node.id] || [])[0];
        value = inc ? compute(inc.source) : undefined;
        break;
      }
      default:
        value = undefined;
    }
    visiting.delete(id);
    memo.set(id, value);
    return value;
  };

  nodes.forEach((n) => {
    try {
      compute(n.id);
    } catch {}
  });
  return memo;
}



// Exports

export {
  isObjectLike,
  hasDeepKeyMatch,
  valueTypeLabel,
  inferType,
  flattenPaths,
  getByPath,
  pyQuote,
  pyLiteral,
  buildEdgeMaps,
  generatePythonProgram,
  genId,
  outputDTypeForNode,
  inputDTypeForTarget,
  evaluate
};
