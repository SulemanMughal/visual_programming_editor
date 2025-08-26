"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
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
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        const item = val[Number(child.name)];
        if (Array.isArray(item) || isObj(item)) st.push({ val: item, node: child });
      }
    } else if (isObj(val)) {
      const keys = Object.keys(val);
      node.children = keys.map((k) => {
        const v = (val as Record<string,J>)[k];
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
        const v = (val as Record<string,J>)[child.name];
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

/* ===================== Row (memo) — stateless button ===================== */
type RowProps = {
  node: Node;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onAction: (payload: { id: string; path: string[]; node: Node }) => void;
  style?: React.CSSProperties;
  q: string;
  isMatch: boolean;
};

const Row = React.memo(function Row({
  node: n, isOpen, onToggle, onAction, style, q, isMatch
}: RowProps) {
  const id = n.path.join(".") || "root";
  const isBranch = n.type === "object" || n.type === "array";

  return (
    <div style={style}>
      <div
        className={[
          "grid grid-cols-[minmax(260px,1.2fr)_1fr_1fr_1.2fr_0.6fr]",
          "items-center text-[14px] border-b border-gray-200 bg-white",
        ].join(" ")}
        role="row"
      >
        {/* Col 1: tree + action button + name */}
        <div className="flex items-center h-10 px-4 gap-2" role="cell">
          <div style={{ width: n.depth * 16 }} />

          {isBranch ? (
            <button
              className="p-1 rounded hover:bg-black/5 focus:outline-none"
              onClick={() => onToggle(id)}
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <Chevron open={isOpen} />
            </button>
          ) : (
            <span className="w-[18px]" />
          )}

          {isBranch ? <Folder /> : <FileIcon />}

          <button
            type="button"
            onClick={() => onAction({ id, path: n.path, node: n })}
            className="px-2.5 py-1 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 active:scale-95 transition"
          >
            Click
          </button>

          <span className={`truncate font-medium ${isMatch ? "text-blue-700" : "text-gray-900"}`}>
            <Highlight text={n.name} q={q} />
          </span>
        </div>

        {/* Col 2 */}
        <div className="px-4 text-gray-700" role="cell">
          {n.type === "object" ? "Object" : n.type === "array" ? "Array" : n.type === "null" ? "Null" : "Primitive"}
        </div>

        {/* Col 3 */}
        <div className="px-4 text-gray-700 truncate" role="cell" title={n.preview}>
          <Highlight text={n.preview} q={q} />
        </div>

        {/* Col 4 */}
        <div className="px-4 text-gray-700 truncate" role="cell" title={id}>
          <Highlight text={id || "—"} q={q} />
        </div>

        {/* Col 5 */}
        <div className="px-4 text-gray-700" role="cell">
          {n.size ?? "—"}
        </div>
      </div>
    </div>
  );
}, (a, b) =>
  a.node === b.node &&
  a.isOpen === b.isOpen &&
  a.style === b.style &&
  a.q === b.q &&
  a.isMatch === b.isMatch
);

/* ===================== Virtualized renderer ===================== */
type ItemData = {
  nodes: Node[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAction: (p: { id: string; path: string[]; node: Node }) => void;
  q: string;
  matches: Set<string>;
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
      onToggle={data.onToggle}
      onAction={data.onAction}
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

/* ===================== Main (stateless action button) ===================== */
export default function JsonTreeGridVirtActionButton({
  json,
  onAction,
}: {
  json: J;
  onAction?: (payload: { id: string; path: string[]; node: Node }) => void;
}) {
  const tree = useMemo(() => buildTree(json), [json]);
  const allNodes = useMemo(() => collectAll(tree), [tree]);

  // Default expanded: root + first level
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>(["root"]);
    tree.children?.forEach((c) => s.add(c.path.join(".")));
    return s;
  });

  const [q, setQ] = useState("");
  const qd = useDebounced(q, 200);

  // Search (by name, preview, or full path)
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

  // Show only matches + ancestors
  const keepIds = useMemo(() => {
    if (!qd || matches.size === 0) return undefined;
    const s = new Set<string>();
    matches.forEach((id) => ancestorsOf(id).forEach((a) => s.add(a)));
    return s;
  }, [matches, qd]);

  // Auto-expand ancestors of matches
  const expandedEffective = useMemo(() => {
    if (!keepIds) return expanded;
    const next = new Set(expanded);
    keepIds.forEach((id) => next.add(id));
    return next;
  }, [expanded, keepIds]);

  // Visible rows (virtualized)
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

  const handleAction = useCallback((p: { id: string; path: string[]; node: Node }) => {
    // let parent handle it; fallback to console
    onAction?.(p);
    if (!onAction) {
      // eslint-disable-next-line no-console
      console.log("Node clicked:", p);
    }
  }, [onAction]);

  const itemData = useMemo(() => ({
    nodes: visible,
    expanded: expandedEffective,
    onToggle,
    onAction: handleAction,
    q: qd,
    matches,
  }), [visible, expandedEffective, onToggle, handleAction, qd, matches]);

  return (
    <div className="rounded-md border border-gray-200 shadow-sm overflow-hidden">
      {/* toolbar + header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search keys / path / values"
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-200 text-[14px]"
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
          <div className="px-4 py-3" role="columnheader">Full Name</div>
          <div className="px-4 py-3" role="columnheader">Position</div>
          <div className="px-4 py-3" role="columnheader">City</div>
          <div className="px-4 py-3" role="columnheader">State</div>
          <div className="px-4 py-3" role="columnheader">Hire Date</div>
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
    </div>
  );
}
