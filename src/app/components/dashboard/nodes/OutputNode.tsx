
import CardShell from "../CardShell"

import InfoButton from "../InfoButton"

import {
  Handle,
  Position,
} from "@xyflow/react";

import pill from "@/app/components/dashboard/pill";

import {handleDot} from "@/app/components/dashboard/constants";

type OutputNodeData = {
  label: string;
  result: unknown;
};

function OutputNode({ data }: { data: OutputNodeData }) {
  return (
    <CardShell title="OUTPUT" rightSlot={<div className="flex items-center gap-2">{pill("ANY")}<InfoButton text={"Output of the whole operation"} /></div>} >
      <div className="mt-1 text-lg font-semibold text-gray-800">{data.label}</div>
      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-sm text-gray-700 shadow-inner">
        {typeof data.result === "object" ? JSON.stringify(data.result) : String(data.result ?? "—")}
      </div>
      <Handle type="target" position={Position.Left} id="in" style={{ ...handleDot, left: -8, top: "50%", transform: "translateY(-50%)" }} />
    </CardShell>
  );
}


export default OutputNode;