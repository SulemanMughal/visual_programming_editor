
import {
  Handle,
  Position,
} from "@xyflow/react";

import pill from "@/app/components/dashboard/pill";

import {handleDot} from "@/app/components/dashboard/constants";

type FieldNodeData = {
  dtype: string;
  label: string;
  path: string;
};

function FieldNodeUI({ data }: { data: FieldNodeData }) {
  return (
    <div className="relative min-w-[320px] rounded-[24px] border bg-gradient-to-b from-gray-100 to-gray-200 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="text-xs font-extrabold tracking-[0.2em] text-gray-600">FIELD</div>
        {pill(String(data.dtype).toUpperCase())}
      </div>
      <div className="mt-2 text-lg font-semibold text-gray-800">{data.label}</div>
      <div className="text-xs text-gray-500">{data.path}</div>
      <Handle type="source" position={Position.Right} id="out" style={{ ...handleDot, right: -8, top: "50%", transform: "translateY(-50%)" }} />
    </div>
  );
}


export default FieldNodeUI;