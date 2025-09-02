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

import {
  OP_HELP,
  ALL_OPERATORS
} from "../constants";

type OperatorNodeData = {
  opId: keyof typeof ALL_OPERATORS;
};

function OperatorNode({ id, data, selected }: NodeProps<OperatorNodeData>) {
  const rf = useReactFlow();

  const spec = ALL_OPERATORS[data.opId];
  if (!spec) {
    return (
      <div className="relative min-w-[320px] rounded-[24px] border border-rose-300 bg-rose-50 p-4 shadow">
        <div className="text-xs font-extrabold tracking-[0.2em] text-rose-600">OPERATOR</div>
        <div className="mt-1 text-base font-semibold text-rose-700">Unknown operator: {String(data.opId)}</div>
        <div className="text-xs text-rose-600/80">Delete this node and drag a valid one from the palette.</div>
      </div>
    );
  }

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

  const helpText = OP_HELP[spec.id as keyof typeof OP_HELP] || "No help description available.";

  // Compute dtype badge for the header (supports array or single output spec)
  const headerDType =
    Array.isArray((spec as any).output)
      ? (spec as any).output[0]?.dtype
      : (spec as any).output?.dtype;

  return (
    <div className="relative group">
      {/* Hover actions */}
      <div
        className={[
          "absolute right-0 -top-5 z-10 flex gap-1 transition-opacity",
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

      <CardShell
        title="OPERATOR"
        rightSlot={
          <div className="flex items-center gap-2">
            {headerDType ? pill(String(headerDType).toUpperCase()) : null}
            <InfoButton text={helpText} />
          </div>
        }
        // Optional: visual highlight when selected (if CardShell supports className)
        // className={selected ? "ring-2 ring-sky-400 shadow-xl" : ""}
      >
        <div className="mt-1 text-lg font-semibold text-gray-800">{spec.label}</div>

        {/* Inputs */}
        <div className="mt-3 space-y-3">
          {spec.inputs.map((inp: any) => (
            <div
              key={inp.id}
              className="relative flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow"
            >
              <div className="text-base font-medium text-gray-700">{inp.label ?? inp.id}</div>
              {pill(String(inp.dtype).toUpperCase())}
              <Handle
                type="target"
                position={Position.Left}
                id={inp.id}
                style={{ ...handleDot, left: -8, top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          ))}
        </div>

        {/* Outputs (supports array or single) */}
        <div className="mt-3 space-y-3">
          {Array.isArray((spec as any).output) ? (
            (spec as any).output.map((out: any, idx: number) => (
              <div
                key={out.id || idx}
                className="relative flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow"
              >
                <div className="text-base font-medium text-gray-700">{out.label ?? out.id}</div>
                {pill(String(out.dtype).toUpperCase())}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={out.id || `out${idx}`}
                  style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }}
                />
              </div>
            ))
          ) : (spec as any).output && typeof (spec as any).output === "object" ? (
            <div
              key={(spec as any).output.id}
              className="relative flex items-center justify-between rounded-2xl border bg-white px-4 py-3 shadow"
            >
              <div className="text-base font-medium text-gray-700">
                {(spec as any).output.label ?? (spec as any).output.id}
              </div>
              {pill(String((spec as any).output.dtype).toUpperCase())}
              <Handle
                type="source"
                position={Position.Right}
                id={(spec as any).output.id || "out"}
                style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }}
              />
            </div>
          ) : null}
        </div>
      </CardShell>
    </div>
  );
}

export default OperatorNode;
