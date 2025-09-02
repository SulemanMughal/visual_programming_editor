import * as React from "react";
import {
  Handle,
  Position,
  useReactFlow,
  type NodeProps,
  type Edge,
} from "@xyflow/react";

import pill from "@/app/components/dashboard/pill";
import { handleDot } from "@/app/components/dashboard/constants";

import { FaCopy } from "react-icons/fa";
import { MdDelete } from "react-icons/md";

type ConstNodeData = {
  value?: string | number | boolean | unknown[];
  dtype: "number" | "string" | "boolean" | "list" | string;
};

function ConstNode({ id, data, selected }: NodeProps<ConstNodeData>) {
  const rf = useReactFlow();

  const [local, setLocal] = React.useState<string | number | boolean | unknown[]>(
    () => String(data.value ?? "")
  );

  const onDuplicate = React.useCallback(() => {
    const src = rf.getNode(id);
    if (!src) return;

    const copyId = `${id}-${Math.random().toString(36).slice(-4)}`;
    rf.addNodes([
      {
        id: copyId,
        type: src.type,
        data: JSON.parse(JSON.stringify(src.data ?? {})), // deep clone data
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

  return (
    // group = enables hover styles for children
    <div className="relative group">
      <div
        className={[
          "relative min-w-[320px] rounded-[24px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-lg transition",
          selected ? "ring-2 ring-sky-400 shadow-xl" : "ring-0",
        ].join(" ")}
      >
        {/* Hover-only action bar (also visible when selected) */}
        <div
          className={[
            "absolute right-0 -top-5 flex gap-1 transition-all",
            "opacity-0 group-hover:opacity-100",
            selected ? "opacity-100" : "",
            "pointer-events-none", // container ignores events; buttons re-enable
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
          <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">
            CONST
          </div>
          {pill(String(data.dtype).toUpperCase())}
        </div>

        <div className="mt-3">
          <input
            className="w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-inner outline-none focus:ring text-black"
            value={String(local)}
            type={data.dtype === "list" ? "text" : (data.dtype as any)}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => {
              let parsed: string | number | boolean | unknown[] = local;
              if (data.dtype === "number") parsed = Number(local);
              if (data.dtype === "boolean") parsed = String(local) === "true";
              if (data.dtype === "list") {
                try {
                  parsed = JSON.parse(String(local));
                } catch {
                  parsed = [];
                }
                if (!Array.isArray(parsed)) parsed = [];
              }
              data.value = parsed;
            }}
            placeholder={`value (${data.dtype})`}
          />
        </div>

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

export default ConstNode;
