"use client";
import React, { useMemo, useState, useCallback } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";

/* ===== Helpers & Types ===== */
type J = any;
type Node = {
  id: string;               // stable id (dot path or "root")
  name: string;             // key name (or index)
  path: string[];           // segments
  depth: number;            // indent level
  type: "object" | "array" | "primitive" | "null";
  preview: string;          // short value
  size?: number;            // child count (obj/arr)
  children?: Node[];        // present only for obj/arr
};

const isPlainObject = (v: J) => v && typeof v === "object" && !Array.isArray(v);
const mkPreview = (v: J) => {
  if (v === null) return "null";
  if (typeof v === "string") return v.length > 60 ? v.slice(0, 57) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[Array ${v.length}]`;
  if (isPlainObject(v)) return "{…}";
  try { return JSON.stringify(v).slice(0, 60); } catch { return String(v); }
};

/** Build the tree once (iterative to avoid deep recursion issues) */
function buildTree(rootData: J): Node {
  const root: Node = {
    id: "root",
    name: "Full Name", // purely label position in first column header—data still shown in other cols
    path: [],
    depth: 0,
    type: Array.isArray(rootData) ? "array" : isPlainObject(rootData) ? "object" : (rootData === null ? "null" : "primitive"),
    preview: Array.isArray(rootData) ? `[Array ${(rootData as any[]).length}]` :
             isPlainObject(rootData) ? `{${Object.keys(rootData).length}}` : mkPreview(rootData),
    size: Array.isArray(rootData) ? (rootData as any[]).length :
          isPlainObject(rootData) ? Object.keys(rootData).length : undefined,
    children: []
  };
  if (!(Array.isArray(rootData) || isPlainObject(rootData))) return root;

  // stack for iterative DFS
  type StackItem = { data: J; node: Node };
  const stack: StackItem[] = [{ data: rootData, node: root }];

  while (stack.length) {
    const { data, node } = stack.pop()!;
    if (Array.isArray(data)) {
      node.children = data.map((item, i) => {
        const path = [...node.path, String(i)];
        const type = Array.isArray(item) ? "array" : isPlainObject(item) ? "object" : (item === null ? "null" : "primitive");
        const child: Node = {
          id: path.join("."),
          name: String(i),
          path,
          depth: node.depth + 1,
          type,
          preview: Array.isArray(item) ? `[Array ${item.length}]` :
                   isPlainObject(item) ? `{${Object.keys(item).length}}` :
                   mkPreview(item),
          size: Array.isArray(item) ? item.length : isPlainObject(item) ? Object.keys(item).length : undefined,
          children: []
        };
        return child;
      });
      // push children (reverse so order is natural when popping)
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        const item = data[Number(child.name)];
        if (Array.isArray(item) || isPlainObject(item)) stack.push({ data: item, node: child });
      }
    } else if (isPlainObject(data)) {
      const keys = Object.keys(data);
      node.children = keys.map((k) => {
        const v = (data as Record<string, J>)[k];
        const path = [...node.path, k];
        const type = Array.isArray(v) ? "array" : isPlainObject(v) ? "object" : (v === null ? "null" : "primitive");
        const child: Node = {
          id: path.join("."),
          name: k,
          path,
          depth: node.depth + 1,
          type,
          preview: Array.isArray(v) ? `[Array ${v.length}]` :
                   isPlainObject(v) ? `{${Object.keys(v).length}}` :
                   mkPreview(v),
          size: Array.isArray(v) ? v.length : isPlainObject(v) ? Object.keys(v).length : undefined,
          children: []
        };
        return child;
      });
      for (let i = node.children.length - 1; i >= 0; i--) {
        const child = node.children[i];
        const v = (data as Record<string, J>)[child.name];
        if (Array.isArray(v) || isPlainObject(v)) stack.push({ data: v, node: child });
      }
    }
  }
  return root;
}

/** flatten only *visible* nodes according to expanded set */
const flattenVisible = (root: Node, expanded: Set<string>) => {
  const out: Node[] = [];
  const stack: Node[] = [root];
  while (stack.length) {
    const n = stack.pop()!;
    out.push(n);
    const id = n.path.join(".") || "root";
    if (n.children && n.children.length && expanded.has(id)) {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
    }
  }
  return out;
};

/* ===== Icons (inline SVG) ===== */
const Chevron = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 20 20" className="text-gray-500">
    {open ? <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" /> :
            <path d="M7 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />}
  </svg>
);
const Folder = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="text-blue-600">
    <path fill="currentColor" d="M10 4l2 2h8a2 2 0 012 2v9a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3h3z"/>
  </svg>
);
const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" className="text-gray-500">
    <path fill="currentColor" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12V8z"/><path fill="currentColor" d="M14 2v6h6"/>
  </svg>
);

/* ===== Row (memoized with custom comparator) ===== */
type RowProps = {
  node: Node;
  isOpen: boolean;
  isChecked: boolean;
  onToggle: (id: string) => void;
  onCheck: (id: string, v: boolean) => void;
  zebra: boolean;
  style?: React.CSSProperties;
};

const Row = React.memo(function Row({
  node: n,
  isOpen,
  isChecked,
  onToggle,
  onCheck,
  zebra,
  style
}: RowProps) {
  const id = n.path.join(".") || "root";
  const isBranch = n.type === "object" || n.type === "array";

  return (
    <div style={style}>
      <div
        className={[
          "grid grid-cols-[minmax(260px,1.2fr)_1fr_1fr_1.2fr_0.6fr]",
          "items-center text-[14px]",
          "border-b border-gray-200",
          zebra ? "bg-white" : "bg-gray-50/40",
          isChecked ? "bg-[#E6F4FF]" : "",
        ].join(" ")}
        role="row"
      >
        {/* Col 1 */}
        <div className="flex items-center h-10 px-4 gap-2" role="cell">
          <div style={{ width: n.depth * 16 }} />
          {isBranch ? (
            <button
              className="p-1 rounded hover:bg-gray-100 focus:outline-none"
              onClick={() => onToggle(id)}
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              <Chevron open={isOpen} />
            </button>
          ) : (
            <span className="w-[18px]" />
          )}
          {isBranch ? <Folder /> : <FileIcon />}
          <input
            type="checkbox"
            className="accent-blue-600 w-4 h-4"
            checked={isChecked}
            onChange={(e) => onCheck(id, e.target.checked)}
          />
          <span className="truncate font-medium text-gray-900">{n.name}</span>
        </div>

        {/* Col 2 */}
        <div className="px-4 text-gray-700" role="cell">
          {n.type === "object" ? "Object" :
           n.type === "array" ? "Array" :
           n.type === "null" ? "Null" : "Primitive"}
        </div>

        {/* Col 3 */}
        <div className="px-4 text-gray-700 truncate" role="cell" title={n.preview}>
          {n.preview}
        </div>

        {/* Col 4 */}
        <div className="px-4 text-gray-700 truncate" role="cell" title={id}>
          {id || "—"}
        </div>

        {/* Col 5 */}
        <div className="px-4 text-gray-700" role="cell">
          {n.size ?? "—"}
        </div>
      </div>
    </div>
  );
}, (prev, next) =>
  prev.node === next.node &&
  prev.isOpen === next.isOpen &&
  prev.isChecked === next.isChecked &&
  prev.zebra === next.zebra &&
  prev.style === next.style
);

/* ===== Virtualized item renderer ===== */
type ItemData = {
  nodes: Node[];
  expanded: Set<string>;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onCheck: (id: string, v: boolean) => void;
};

const itemKey = (index: number, data: ItemData) => data.nodes[index].id;

const RowRenderer = ({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const n = data.nodes[index];
  const id = n.path.join(".") || "root";
  const isOpen = data.expanded.has(id);
  const isChecked = data.checked.has(id);
  return (
    <Row
      node={n}
      style={style}
      isOpen={isOpen}
      isChecked={isChecked}
      onToggle={data.onToggle}
      onCheck={data.onCheck}
      zebra={index % 2 === 0}
    />
  );
};

/* ===== Main component ===== */
export default function JsonTreeGridVirt({ json }: { json: J }) {
  const tree = useMemo(() => buildTree(json), [json]);

  // expand root and first level
  const initialExpanded = useMemo(() => {
    const s = new Set<string>(["root"]);
    tree.children?.forEach((c) => s.add(c.path.join(".")));
    return s;
  }, [tree]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);
  const [checked, setChecked] = useState<Set<string>>(() => new Set());

  const visible = useMemo(() => flattenVisible(tree, expanded), [tree, expanded]);

  const onToggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const onCheck = useCallback((id: string, val: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev);
      val ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const itemData = useMemo<ItemData>(() => ({
    nodes: visible,
    expanded,
    checked,
    onToggle,
    onCheck
  }), [visible, expanded, checked, onToggle, onCheck]);

  return (
    <div className="rounded-md border border-gray-200 shadow-sm overflow-hidden">
      {/* header (same layout/colors) */}
      <div
        className={[
          "grid grid-cols-[minmax(260px,1.2fr)_1fr_1fr_1.2fr_0.6fr]",
          "text-[12.5px] uppercase tracking-wide text-gray-500",
          "bg-white border-b border-gray-200",
        ].join(" ")}
        role="row"
      >
        <div className="px-4 py-3" role="columnheader">Full Name</div>
        <div className="px-4 py-3" role="columnheader">Position</div>
        <div className="px-4 py-3" role="columnheader">City</div>
        <div className="px-4 py-3" role="columnheader">State</div>
        <div className="px-4 py-3" role="columnheader">Hire Date</div>
      </div>

      {/* body: virtualized (fixed 40px row height like screenshot) */}
      <List
        height={480}
        width={"100%"}
        itemCount={visible.length}
        itemSize={40}
        itemData={itemData}
        itemKey={itemKey}
      >
        {RowRenderer}
      </List>

      {/* footer selection bar */}
      <div className="px-4 py-3 bg-white border-t border-gray-200 text-sm flex items-center gap-2">
        <span className="text-gray-600">Selected:</span>
        <div className="flex flex-wrap gap-2">
          {checked.size === 0 ? (
            <span className="text-gray-400">None</span>
          ) : (
            Array.from(checked).map((k) => (
              <span
                key={k}
                className="bg-[#E6F4FF] text-blue-800 px-2.5 py-1 rounded border border-blue-200 text-[12px] font-mono"
                title={k}
              >
                {k}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
