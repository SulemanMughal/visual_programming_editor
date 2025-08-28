

import CardShell from "../CardShell"

import InfoButton from "../InfoButton"


import {
  Handle,
  Position,
} from "@xyflow/react";

import pill from "@/app/components/dashboard/pill";

import {handleDot} from "@/app/components/dashboard/constants";

import {
  OP_HELP,
  ALL_OPERATORS
} from "../constants"



type OperatorNodeData = {
  opId: keyof typeof ALL_OPERATORS;
  // Add other properties as needed based on usage
};

function OperatorNode({ data }: { data: OperatorNodeData }) {
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

  const helpText = OP_HELP[spec.id as keyof typeof OP_HELP] || "No help description available.";

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


export default OperatorNode;