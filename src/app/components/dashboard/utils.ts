// -----------------------
// Json File Handlers
// -----------------------

import {
  ALL_OPERATORS
} from "./constants"

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

interface OperatorInput {
  id: string;
  dtype?: "number" | "boolean" | "date" | "string" | "list" | "any";
}

interface OperatorSpec {
  inputs: OperatorInput[];
  toPy?: (args: Record<string, string>) => string;
  output?: {
    dtype: "number" | "boolean" | "date" | "string" | "list" | "any";
  };
}

interface OpsMap {
  [opId: string]: OperatorSpec;
}

// You may need to import or define OPS elsewhere in your codebase
declare const OPS: OpsMap;

function generatePythonProgram(nodes: Node[], edges: Edge[]): string {
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
  const nodeMap = new Map<string, Node>(nodes.map((n) => [n.id, n]));
  const visiting = new Set<string>();
  const memoExpr = new Map<string, string>();


  const OPS = ALL_OPERATORS;

  const exprOf = (nodeId: string): string => {
    if (memoExpr.has(nodeId)) return memoExpr.get(nodeId)!;
    if (visiting.has(nodeId)) return "None  # cycle";
    visiting.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return "None";

    let expr = "None";
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
        if (!spec) {
          expr = "None";
          break;
        }
        const incoming = byTarget[node.id] || [];
        const argExpr: Record<string, string> = {};
        spec.inputs.forEach((inp) => {
          const edge = incoming.find((e) => e.targetHandle === inp.id);
          argExpr[inp.id] = edge ? exprOf(edge.source) : "None";
        });
        expr = spec.toPy ? spec.toPy(argExpr) : "None";
        break;
      }
      case "output": {
        const incoming = (byTarget[node.id] || [])[0];
        expr = incoming ? exprOf(incoming.source) : "None";
        break;
      }
      default:
        expr = "None";
    }
    visiting.delete(nodeId);
    memoExpr.set(nodeId, expr);
    return expr;
  };

  const outputs = nodes.filter((n) => n.type === "output");
  if (outputs.length === 0) {
    return (
      header +
      [
        "def compute(row):",
        "    # No outputs; add an Output node and connect it.",
        "    return {}",
        "",
      ].join("\n")
    );
  }

  const body = ["def compute(row):", "    return {"];
  outputs.forEach((n, i) => {
    const label = (n.data as NodeDataOutput).label || `result_${i + 1}`;
    body.push(`        ${pyQuote(label)}: ${exprOf(n.id)},`);
  });
  body.push("    }");
  return header + "\n" + body.join("\n") + "\n";
}


// ---------- Graph helpers ----------

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
