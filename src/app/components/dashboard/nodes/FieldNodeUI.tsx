import * as React from "react";
import {
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
  type Edge,
} from "@xyflow/react";
import { FaCopy } from "react-icons/fa";
import { MdDelete } from "react-icons/md";

type FieldNodeData = {
  label: string;
  path: string;
  dtype: string;
};

const handleDot: React.CSSProperties = { width: 12, height: 12 };

function FieldNodeUI({ id, data, selected }: NodeProps<FieldNodeData>) {
  const rf = useReactFlow();

  const onDuplicate = React.useCallback(() => {
    const src = rf.getNode(id);
    if (!src) return;

    const copyId = `${id}-${Math.random().toString(36).slice(-4)}`;
    rf.addNodes([
      {
        id: copyId,
        type: src.type,
        data: JSON.parse(JSON.stringify(src.data ?? {})),
        position: {
          x: (src.position?.x ?? 0) + 40 + Math.random() * 20,
          y: (src.position?.y ?? 0) + 40 + Math.random() * 20,
        },
        sourcePosition: src.sourcePosition,
        targetPosition: src.targetPosition,
      } as any,
    ]);
  }, [rf, id]);

  const onDelete = React.useCallback(() => {
    rf.setEdges((eds: Edge[]) => eds.filter((e) => e.source !== id && e.target !== id));
    rf.setNodes((nds) => nds.filter((n) => n.id !== id));
  }, [rf, id]);

  const pill = (t: string) => (
    <span className="rounded-full border border-sky-300 bg-white px-3 py-0.5 text-xs font-semibold text-sky-700">
      {t}
    </span>
  );

  return (
    <div className="group relative">
      <div
        className={[
          "relative min-w-[320px] rounded-[24px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-lg transition",
          selected ? "ring-2 ring-sky-400 shadow-xl" : "ring-0",
        ].join(" ")}
      >
        {/* Hover-only actions (visible when selected) */}
        <div
          className={[
            "absolute right-0 -top-5 flex gap-1 transition-opacity",
            "opacity-0 group-hover:opacity-100",
            selected ? "opacity-100" : "",
            "pointer-events-none",
          ].join(" ")}
        >
          <button
            className="nodrag nowheel pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-200 text-sky-700 shadow ring-1 ring-slate-300 hover:ring-sky-400"
            title="Duplicate node"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDuplicate}
            aria-label="Duplicate node"
          >
            <FaCopy size={14} />
          </button>
          <button
            className="nodrag nowheel pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-200 text-rose-700 shadow ring-1 ring-slate-300 hover:ring-rose-400"
            title="Delete node"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            aria-label="Delete node"
          >
            <MdDelete size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">FIELD</div>
          {pill(String(data.dtype).toUpperCase())}
        </div>

        <div className="mt-2 text-lg font-semibold text-gray-800">{data.label}</div>
        <div className="text-xs text-gray-500">{data.path}</div>

        <Handle
          type="source"
          position={Position.Right}
          id="out"
          style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }}
        />
      </div>
    </div>
  );
}

export default FieldNodeUI;
