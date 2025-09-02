import * as React from "react";
import CardShell from "../CardShell";
import InfoButton from "../InfoButton";

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

type OutputNodeData = {
  label: string;
  result: unknown;
};

function OutputNode({ id, data, selected }: NodeProps<OutputNodeData>) {
  const rf = useReactFlow();

  const onDuplicate = React.useCallback(() => {
    const src = rf.getNode(id);
    if (!src) return;

    const copyId = `${id}-${Math.random().toString(36).slice(-4)}`;
    rf.addNodes([
      {
        id: copyId,
        type: src.type,
        data: JSON.parse(JSON.stringify(src.data ?? {})), // deep clone
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

  // safer preview of result
  const renderResult = (val: unknown) => {
    if (val === null || val === undefined) return "—";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    return String(val);
  };

  return (
    // wrapper provides positioning & hover context
    <div className="relative group min-w-[400px] max-w-[400px]">
      {/* Hover actions (fade in on hover, stay visible when selected) */}
      <div
        className={[
          "absolute right-0 -top-5 z-10 flex gap-1 transition-opacity",
          "opacity-0 group-hover:opacity-100",
          selected ? "opacity-100" : "",
          "pointer-events-none", // container ignores; buttons enable
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

      <CardShell
        title="OUTPUT"
        rightSlot={
          <div className="flex items-center gap-2">
            {pill("ANY")}
            <InfoButton text="Output of the whole operation" />
          </div>
        }
      >
        <div className="mt-1 text-lg font-semibold text-gray-800">{data.label}</div>
        <div className="w-full rounded-2xl border bg-white px-4 py-3 text-sm shadow-inner outline-none focus:ring text-black">
          {renderResult(data.result)}
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="in"
          style={{ ...handleDot, left: -8, top: "50%", transform: "translateY(-50%)" }}
        />
      </CardShell>
    </div>
  );
}

export default OutputNode;
