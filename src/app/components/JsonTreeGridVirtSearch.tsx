// components/JsonTreeGridVirtSearch.tsx
"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

/* ===================== Types & helpers ===================== */
type J = any;
type Node = {
  id: string;               // dot path or "root"
  name: string;             // key or index
  path: string[];           // segments
  depth: number;            // indent level
  type: "object" | "array" | "primitive" | "null";
  preview: string;          // short value preview
  size?: number;            // child count (obj/arr)
  children?: Node[];
};

const isObj = (v: J) => v && typeof v === "object" && !Array.isArray(v);

const mkPreview = (v: J) => {
  if (v === null) return "null";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 57) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[Array ${v.length}]`;
  if (isObj(v)) return "{…}";
  try { return JSON.stringify(v).slice(0, 60); } catch { return String(v); }
};

/** Build full tree iteratively (stable IDs) */
function buildTree(data: J): Node {
  const root: Node = {
    id: "root",
    name: "root",
    path: [],
    depth: 0,
    type: Array.isArray(data) ? "array" : isObj(data) ? "object" : (data === null ? "null" : "primitive"),
    preview: Array.isArray(data) ? `[Array ${(data as any[]).length}]`
           : isObj(data) ? `{${Object.keys(data).length}}`
           : mkPreview(data),
    size: Array.isArray(data) ? (data as any[]).length
         : isObj(data) ? Object.keys(data).length
         : undefined,
    children: [],
  };

  if (!(Array.isArray(data) || isObj(data))) return root;

  type S = { val: J; node: Node };
  const st: S[] = [{ val: data, node: root }];

  while (st.length) {
    const { val, node } = st.pop()!;
    if (Array.isArray(val)) {
      node.children = val.map((item, i) => {
        const path = [...node.path, String(i)];
        const t = Array.isArray(item) ? "array" : isObj(item) ? "object" : (item === null ? "null" : "primitive");
        const child: Node = {
          id: path.join("."),
          name: String(i),
          path,
          depth: node.depth + 1,
          type: t,
          preview: Array.isArray(item) ? `[Array ${item.length}]`
                 : isObj(item) ? `{${Object.keys(item).length}}`
                 : mkPreview(item),
          size: Array.isArray(item) ? item.length
               : isObj(item) ? Object.keys(item).length
               : undefined,
          children: [],
        };
        return child;
      });
      // push expandable children
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        const item = val[Number(child.name)];
        if (Array.isArray(item) || isObj(item)) st.push({ val: item, node: child });
      }
    } else if (isObj(val)) {
      const keys = Object.keys(val);
      node.children = keys.map((k) => {
        const v = (val as Record<string, J>)[k];
        const path = [...node.path, k];
        const t = Array.isArray(v) ? "array" : isObj(v) ? "object" : (v === null ? "null" : "primitive");
        const child: Node = {
          id: path.join("."),
          name: k,
          path,
          depth: node.depth + 1,
          type: t,
          preview: Array.isArray(v) ? `[Array ${v.length}]`
                 : isObj(v) ? `{${Object.keys(v).length}}`
                 : mkPreview(v),
          size: Array.isArray(v) ? v.length
               : isObj(v) ? Object.keys(v).length
               : undefined,
          children: [],
        };
        return child;
      });
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        const v = (val as Record<string, J>)[child.name];
        if (Array.isArray(v) || isObj(v)) st.push({ val: v, node: child });
      }
    }
  }

  return root;
}

const collectAll = (root: Node) => {
  const out: Node[] = [];
  const st: Node[] = [root];
  while (st.length) {
    const n = st.pop()!;
    out.push(n);
    if (n.children && n.children.length) {
      for (let i = n.children.length - 1; i >= 0; i--) st.push(n.children[i]);
    }
  }
  return out;
};

const ancestorsOf = (id: string) => {
  if (id === "root" || id === "") return ["root"];
  const segs = id.split(".");
  const acc: string[] = ["root"];
  for (let i = 1; i <= segs.length; i++) acc.push(segs.slice(0, i).join("."));
  return acc;
};

/** Flatten visible nodes (expanded) and optionally filter to keepIds */
const flattenVisibleFiltered = (root: Node, expanded: Set<string>, keepIds?: Set<string>) => {
  const out: Node[] = [];
  const st: Node[] = [root];
  while (st.length) {
    const n = st.pop()!;
    const id = n.path.join(".") || "root";
    const include = !keepIds || keepIds.has(id);
    if (include) out.push(n);

    const open = expanded.has(id);
    if (n.children && n.children.length && open) {
      for (let i = n.children.length - 1; i >= 0; i--) st.push(n.children[i]);
    }
  }
  return out;
};

/* ===================== Icons & highlight ===================== */
const Chevron = ({ open, className = "text-gray-500" }: { open: boolean; className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 20 20" className={className}>
    {open ? (
      <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
    ) : (
      <path d="M7 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
    )}
  </svg>
);

const Folder = ({ className = "text-blue-600" }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M10 4l2 2h8a2 2 0 012 2v9a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h3z"/>
  </svg>
);

const FileIcon = ({ className = "text-gray-500" }: { className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" className={className}>
    <path fill="currentColor" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12V8z"/>
    <path fill="currentColor" d="M14 2v6h6"/>
  </svg>
);

const Highlight = ({ text, q }: { text: string; q: string }) => {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  const parts: React.ReactNode[] = [];
  let i = 0, idx = 0;
  while ((idx = lower.indexOf(needle, i)) !== -1) {
    parts.push(text.slice(i, idx));
    parts.push(<mark key={idx} className="bg-yellow-100">{text.slice(idx, idx + q.length)}</mark>);
    i = idx + q.length;
  }
  parts.push(text.slice(i));
  return <>{parts}</>;
};

/* ===================== Row (memo) with tri-state ===================== */
type RowProps = {
  node: Node;
  isOpen: boolean;
  isChecked: boolean;
  isIndeterminate: boolean;
  onToggle: (id: string) => void;
  onCheck: (id: string, v: boolean) => void;
  style?: React.CSSProperties;
  q: string;
  isMatch: boolean;
};

const Row = React.memo(function Row({
  node: n, isOpen, isChecked, isIndeterminate, onToggle, onCheck, style, q, isMatch
}: RowProps) {
  const id = n.path.join(".") || "root";
  const isBranch = n.type === "object" || n.type === "array";

  // Selected=blue; unselected=white
  const rowBG = isChecked ? "bg-blue-500" : "bg-white";
  const textMain = isChecked ? "text-white" : "text-gray-900";
  const textSub  = isChecked ? "text-white/90" : "text-gray-700";
  const iconTone = isChecked ? "text-white" : (isBranch ? "text-blue-600" : "text-gray-500");

  // indeterminate state
  const cbRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (cbRef.current) cbRef.current.indeterminate = isIndeterminate && !isChecked;
  }, [isIndeterminate, isChecked]);

  return (
    <div style={style}>
      <div
        className={[
          "grid grid-cols-[minmax(460px,1.2fr)_1fr_1fr_1.2fr_0.6fr]",
          "items-center text-[14px] border-b border-gray-200",
          rowBG,
        ].join(" ")}
        role="row"
      >
        {/* Col 1 */}
        <div className="flex items-center h-10 px-4 gap-2" role="cell">
          <div style={{ width: n.depth * 16 }} />
          {isBranch ? (
            <button
              className="p-1 rounded hover:bg-black/5 focus:outline-none"
              onClick={() => onToggle(id)}
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <Chevron open={isOpen} className={iconTone} />
            </button>
          ) : (
            <span className="w-[18px]" />
          )}

          {isBranch ? <Folder className={iconTone} /> : <FileIcon className={iconTone} />}

          <input
            ref={cbRef}
            type="checkbox"
            className="accent-blue-200 w-4 h-4"
            checked={isChecked}
            onChange={(e) => onCheck(id, e.target.checked)}
          />

          <span className={`truncate font-medium ${isMatch && !isChecked ? "text-blue-700" : textMain}`}>
            <Highlight text={n.name} q={q} />
          </span>
        </div>

        {/* Col 2 */}
        {/* <div className={`px-4 ${textSub}`} role="cell">
          {n.type === "object" ? "Object" : n.type === "array" ? "Array" : n.type === "null" ? "Null" : "Primitive"}
        </div> */}

        {/* Col 3 */}
        {/* <div className={`px-4 truncate ${textSub}`} role="cell" title={n.preview}>
          <Highlight text={n.preview} q={q} />
        </div> */}

        {/* Col 4 */}
        {/* <div className={`px-4 truncate ${textSub}`} role="cell" title={id}>
          <Highlight text={id || "—"} q={q} />
        </div> */}

        {/* Col 5 */}
        {/* <div className={`px-4 ${textSub}`} role="cell">
          {n.size ?? "—"}
        </div> */}
      </div>
    </div>
  );
}, (a, b) =>
  a.node === b.node &&
  a.isOpen === b.isOpen &&
  a.isChecked === b.isChecked &&
  a.isIndeterminate === b.isIndeterminate &&
  a.style === b.style &&
  a.q === b.q &&
  a.isMatch === b.isMatch
);

/* ===================== Virtualized renderer ===================== */
type ItemData = {
  nodes: Node[];
  expanded: Set<string>;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onCheck: (id: string, v: boolean) => void;
  q: string;
  matches: Set<string>;
  isIndeterminate: (id: string) => boolean;
};
const itemKey = (i: number, d: ItemData) => d.nodes[i].id;

const RowRenderer = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const n = data.nodes[index];
  const id = n.path.join(".") || "root";
  return (
    <Row
      node={n}
      style={style}
      isOpen={data.expanded.has(id)}
      isChecked={data.checked.has(id)}
      isIndeterminate={data.isIndeterminate(id)}
      onToggle={data.onToggle}
      onCheck={data.onCheck}
      q={data.q}
      isMatch={data.matches.has(id)}
    />
  );
};

/* ===================== Debounce hook ===================== */
const useDebounced = (v: string, ms: number) => {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
};

/* ===================== Main component ===================== */
export default function JsonTreeGridVirtSearch({ json }: { json: J }) {
  const tree = useMemo(() => buildTree(json), [json]);
  const allNodes = useMemo(() => collectAll(tree), [tree]);

  // Map: id -> node (for quick subtree traversal)
  const idToNode = useMemo(() => {
    const m = new Map<string, Node>();
    for (const n of allNodes) {
      const id = n.path.join(".") || "root";
      m.set(id, n);
    }
    return m;
  }, [allNodes]);

  // expand root + first level by default
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>(["root"]);
    tree.children?.forEach((c) => s.add(c.path.join(".")));
    return s;
  });
  const [checked, setChecked] = useState<Set<string>>(() => new Set());

  const [q, setQ] = useState("");
  const qd = useDebounced(q, 200);

  // search matches (by key, preview, or full path)
  const matches = useMemo(() => {
    if (!qd) return new Set<string>();
    const needle = qd.toLowerCase();
    const res = new Set<string>();
    for (const n of allNodes) {
      const id = n.path.join(".") || "root";
      const hay = (n.name + " " + n.preview + " " + id).toLowerCase();
      if (hay.includes(needle)) res.add(id);
    }
    return res;
  }, [allNodes, qd]);

  // keep only matches + their ancestors (show-only-matches mode)
  const keepIds = useMemo(() => {
    if (!qd || matches.size === 0) return undefined;
    const s = new Set<string>();
    matches.forEach((id) => ancestorsOf(id).forEach((a) => s.add(a)));
    return s;
  }, [matches, qd]);

  // auto-expand all ancestors of matches
  const expandedEffective = useMemo(() => {
    if (!keepIds) return expanded;
    const next = new Set(expanded);
    keepIds.forEach((id) => next.add(id));
    return next;
  }, [expanded, keepIds]);

  // ---- subtree operations ----
  const collectSubtreeIds = useCallback((startId: string) => {
    const start = idToNode.get(startId);
    if (!start) return [startId];
    const out: string[] = [];
    const stack: Node[] = [start];
    while (stack.length) {
      const n = stack.pop()!;
      out.push(n.path.join(".") || "root");
      if (n.children && n.children.length) {
        for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
      }
    }
    return out;
  }, [idToNode]);

  // compute indeterminate for a given id (some but not all descendants selected)
  const isIndeterminate = useCallback((id: string) => {
    const ids = collectSubtreeIds(id);
    let count = 0;
    for (const k of ids) if (checked.has(k)) count++;
    return count > 0 && count < ids.length;
  }, [checked, collectSubtreeIds]);

  // visible (virtualized) rows
  const visible = useMemo(
    () => flattenVisibleFiltered(tree, expandedEffective, keepIds),
    [tree, expandedEffective, keepIds]
  );

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // cascade selection to entire subtree
  const onCheck = useCallback((id: string, val: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      const ids = collectSubtreeIds(id);  // includes the node itself
      if (val) {
        for (const k of ids) next.add(k);
      } else {
        for (const k of ids) next.delete(k);
      }
      return next;
    });
  }, [collectSubtreeIds]);

  // chip actions
  const removeKey = useCallback((k: string) => onCheck(k, false), [onCheck]);
  const clearAll = useCallback(() => setChecked(new Set()), []);

  const itemData = useMemo(() => ({
    nodes: visible,
    expanded: expandedEffective,
    checked,
    onToggle,
    onCheck,
    q: qd,
    matches,
    isIndeterminate,
  }), [visible, expandedEffective, checked, onToggle, onCheck, qd, matches, isIndeterminate]);

  return (
    <div className="rounded-none border border-gray-200 shadow-sm overflow-hidden h-[400px]">
      {/* toolbar + header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search keys / path / values"
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200 text-[14px] text-black"
          />
          {qd && <span className="text-sm text-gray-500">{matches.size} match{matches.size !== 1 && "es"}</span>}
          {qd && (
            <button onClick={() => setQ("")} className="text-sm text-blue-700 hover:underline">
              Clear
            </button>
          )}
        </div>

        <div
          className="grid grid-cols-[minmax(260px,1.2fr)_1fr_1fr_1.2fr_0.6fr] text-[12.5px] uppercase tracking-wide text-gray-500"
          role="row"
        >
          {/* <div className="px-4 py-3" role="columnheader">Full Name</div> */}
          {/* <div className="px-4 py-3" role="columnheader">Position</div> */}
          {/* <div className="px-4 py-3" role="columnheader">City</div>
          <div className="px-4 py-3" role="columnheader">State</div>
          <div className="px-4 py-3" role="columnheader">Hire Date</div> */}
        </div>
      </div>

      {/* body: virtualized */}
      {qd && keepIds && visible.length === 0 ? (
        <div className="p-6 text-gray-500">No matches.</div>
      ) : (
        <List
          height={480}
          width={"100%"}
          itemCount={visible.length}
          itemSize={40}
          itemData={itemData as ItemData}
          itemKey={itemKey}
        >
          {RowRenderer}
        </List>
      )}

      {/* footer: removable chips + clear all */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 text-sm flex items-center gap-2">
        <span className="text-gray-600">Selected ({checked.size}):</span>

        <div className="flex flex-wrap gap-2 items-center">
          {checked.size === 0 ? (
            <span className="text-gray-400">None</span>
          ) : (
            Array.from(checked).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => removeKey(k)}
                title={`Remove ${k}`}
                className="group flex items-center gap-2 bg-[#E6F4FF] text-blue-800 px-2.5 py-1 rounded border border-blue-200 text-[12px] font-mono max-w-[260px]"
              >
                <span className="truncate">{k}</span>
                <span
                  aria-hidden="true"
                  className="inline-flex items-center justify-center w-4 h-4 rounded border border-blue-300 text-blue-700 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600"
                >
                  ×
                </span>
                <span className="sr-only">Remove {k}</span>
              </button>
            ))
          )}

          {checked.size > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="ml-1 text-red-600 hover:underline"
              title="Clear all selected"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
